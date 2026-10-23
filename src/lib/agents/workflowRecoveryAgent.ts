import { dbRepository } from '../db/storageAdapter';
import { WorkflowEngine } from '../stateMachine/workflowEngine';
import { MatchingAgent } from './matchingAgent';
import { Assignment, DonationItem, UserRole } from '../types';

export interface ProposalResult {
  assignment: Assignment;
  requiresCoordinatorApproval: boolean;
  approvalReason?: string;
  isIdempotentReplay: boolean;
}

export class WorkflowRecoveryAgent {
  /**
   * Creates an assignment proposal with idempotency checks and approval policies
   */
  static proposeAssignment(params: {
    donationId: string;
    recipientId: string;
    volunteerId?: string;
    actorId: string;
    actorRole: UserRole | 'SYSTEM_AGENT';
    idempotencyKey: string;
  }): ProposalResult {
    // 1. Check idempotency key
    if (dbRepository.isIdempotencyKeyUsed(params.idempotencyKey)) {
      const existing = dbRepository.getAssignmentByDonationId(params.donationId);
      if (existing) {
        return {
          assignment: existing,
          requiresCoordinatorApproval: true,
          approvalReason: 'Idempotent replay of existing proposal',
          isIdempotentReplay: true,
        };
      }
    }

    const donation = dbRepository.getDonationById(params.donationId);
    if (!donation) {
      throw new Error(`Donation ${params.donationId} not found`);
    }

    // 2. State transition check: Donation must be AVAILABLE or MATCHING or RECOVERY_PENDING
    const canTransition = WorkflowEngine.canTransition(donation.status, 'PROPOSED', params.actorRole);
    if (!canTransition.allowed) {
      throw new Error(canTransition.reason || 'Cannot propose assignment in current state');
    }

    // 3. Recipient verification & capacity check
    const recipientOrg = dbRepository.getOrgById(params.recipientId);
    if (!recipientOrg) {
      throw new Error(`Recipient organization ${params.recipientId} not found`);
    }
    const evalResult = MatchingAgent.evaluateDeterministicEligibility(donation, recipientOrg);
    if (!evalResult.isEligible) {
      throw new Error(`Recipient is ineligible: ${evalResult.disqualificationReasons.join(', ')}`);
    }

    // 4. Determine coordinator approval policy
    // Cooked food, or quantity > 40kg, or donations with allergens requires coordinator approval
    let requiresCoordinatorApproval = false;
    let approvalReason = '';
    if (donation.category === 'COOKED_MEALS' || donation.storageRequirement === 'HOT_HELD_ABOVE_60C') {
      requiresCoordinatorApproval = true;
      approvalReason = 'Perishable hot cooked meals require human coordinator verification of thermal transport';
    } else if (donation.estimatedKg > 40) {
      requiresCoordinatorApproval = true;
      approvalReason = 'High-volume surplus (>40 kg) requires logistics coordination';
    } else if (donation.allergens.length > 0) {
      requiresCoordinatorApproval = true;
      approvalReason = `Allergen warning (${donation.allergens.join(', ')}) requires protocol verification`;
    }

    // Create assignment
    const assignment = dbRepository.createAssignment({
      donationId: params.donationId,
      recipientId: params.recipientId,
      volunteerId: params.volunteerId,
      volunteerName: params.volunteerId ? 'Assigned Volunteer Carrier' : undefined,
      status: 'PROPOSED',
      proposedAt: new Date().toISOString(),
      idempotencyKey: params.idempotencyKey,
      recoveryAttemptCount: 0,
    });

    // Update donation status
    dbRepository.updateDonation(donation.id, {
      status: 'PROPOSED',
      currentAssignmentId: assignment.id,
    });

    // Reserve recipient daily capacity
    dbRepository.updateOrg(recipientOrg.id, {
      currentDailyLoadKg: recipientOrg.currentDailyLoadKg + donation.estimatedKg,
    });

    // Workflow event
    dbRepository.addWorkflowEvent({
      workflowId: assignment.id,
      donationId: donation.id,
      eventType: 'PROPOSAL_CREATED',
      actorId: params.actorId,
      actorRole: params.actorRole,
      newStatus: 'PROPOSED',
      metadata: {
        recipientId: recipientOrg.id,
        recipientName: recipientOrg.name,
        requiresCoordinatorApproval,
        approvalReason,
      },
    });

    // Audit log
    dbRepository.addAuditLog({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'PROPOSE_ASSIGNMENT',
      resourceType: 'ASSIGNMENT',
      resourceId: assignment.id,
      outcome: 'SUCCESS',
      details: { recipientId: recipientOrg.id, donationId: donation.id },
    });

    return {
      assignment,
      requiresCoordinatorApproval,
      approvalReason,
      isIdempotentReplay: false,
    };
  }

  /**
   * Approves assignment (Coordinator role only)
   */
  static approveAssignment(params: {
    assignmentId: string;
    actorId: string;
    actorRole: 'COORDINATOR';
    idempotencyKey: string;
    notes?: string;
  }): Assignment {
    const assignment = dbRepository.getAssignmentById(params.assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${params.assignmentId} not found`);
    }

    // Prevent duplicate approval if already approved
    if (assignment.status === 'APPROVED' || assignment.status === 'ACCEPTED') {
      return assignment;
    }

    const donation = dbRepository.getDonationById(assignment.donationId);
    if (!donation) throw new Error('Donation not found');

    const canTransition = WorkflowEngine.canTransition(donation.status, 'APPROVED', params.actorRole);
    if (!canTransition.allowed) {
      throw new Error(canTransition.reason || 'Invalid state for approval');
    }

    const now = new Date().toISOString();
    const updated = dbRepository.updateAssignment(assignment.id, {
      status: 'APPROVED',
      approvedAt: now,
      approvedByActorId: params.actorId,
    })!;

    dbRepository.updateDonation(donation.id, { status: 'APPROVED' });

    dbRepository.addWorkflowEvent({
      workflowId: assignment.id,
      donationId: donation.id,
      eventType: 'ASSIGNMENT_APPROVED',
      actorId: params.actorId,
      actorRole: params.actorRole,
      newStatus: 'APPROVED',
      metadata: { notes: params.notes },
    });

    dbRepository.addAuditLog({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'APPROVE_ASSIGNMENT',
      resourceType: 'ASSIGNMENT',
      resourceId: assignment.id,
      outcome: 'SUCCESS',
      details: { donationId: donation.id, recipientId: assignment.recipientId },
    });

    return updated;
  }

  /**
   * Recipient declines assignment -> Automatically triggers Agent 4 recovery pipeline
   */
  static async declineAndRecover(params: {
    assignmentId: string;
    actorId: string;
    actorRole: UserRole | 'SYSTEM_AGENT';
    reason: string;
  }): Promise<{
    failedAssignment: Assignment;
    recoveredAssignment?: Assignment;
    recoverySuccess: boolean;
    recoveryMessage: string;
  }> {
    const assignment = dbRepository.getAssignmentById(params.assignmentId);
    if (!assignment) throw new Error(`Assignment ${params.assignmentId} not found`);

    const donation = dbRepository.getDonationById(assignment.donationId);
    if (!donation) throw new Error(`Donation ${assignment.donationId} not found`);

    // 1. Mark assignment as DECLINED
    const now = new Date().toISOString();
    const failedAssignment = dbRepository.updateAssignment(assignment.id, {
      status: 'DECLINED',
      declinedAt: now,
      declineReason: params.reason,
    })!;

    // Release recipient reserved capacity
    const decliningOrg = dbRepository.getOrgById(assignment.recipientId);
    if (decliningOrg) {
      dbRepository.updateOrg(decliningOrg.id, {
        currentDailyLoadKg: Math.max(0, decliningOrg.currentDailyLoadKg - donation.estimatedKg),
      });
    }

    // 2. Set donation status to RECOVERY_PENDING
    dbRepository.updateDonation(donation.id, {
      status: 'RECOVERY_PENDING',
    });

    dbRepository.addWorkflowEvent({
      workflowId: assignment.id,
      donationId: donation.id,
      eventType: 'ASSIGNMENT_DECLINED',
      actorId: params.actorId,
      actorRole: params.actorRole,
      newStatus: 'DECLINED',
      reason: params.reason,
    });

    dbRepository.addAuditLog({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'DECLINE_ASSIGNMENT',
      resourceType: 'ASSIGNMENT',
      resourceId: assignment.id,
      outcome: 'RECOVERED',
      details: { reason: params.reason },
    });

    // 3. Agent 4: Search for alternative eligible recipients excluding the declining recipient
    const allOrgs = dbRepository.listOrganizations();
    const otherRecipients = allOrgs.filter(o => o.id !== assignment.recipientId);

    const matches = await MatchingAgent.findAndRankMatches(donation, otherRecipients, 30);
    const topAlternative = matches.find(m => m.score > 0 && !m.disqualificationReasons);

    if (!topAlternative) {
      // Recovery failed - no alternative candidates available
      dbRepository.updateDonation(donation.id, { status: 'FAILED' });

      dbRepository.addWorkflowEvent({
        workflowId: donation.id,
        donationId: donation.id,
        eventType: 'RECOVERY_FAILED_EXHAUSTED',
        actorId: 'SYSTEM_AGENT',
        actorRole: 'SYSTEM_AGENT',
        newStatus: 'FAILED',
        reason: 'No alternative eligible recipient with sufficient capacity found within safety radius',
      });

      return {
        failedAssignment,
        recoverySuccess: false,
        recoveryMessage: 'No alternative eligible recipient with available capacity found within service radius.',
      };
    }

    // 4. Create reassignment proposal
    const recoveryIdempotencyKey = `recovery_${assignment.id}_attempt_${assignment.recoveryAttemptCount + 1}`;
    const newAssignment = dbRepository.createAssignment({
      donationId: donation.id,
      recipientId: topAlternative.recipientId,
      volunteerId: assignment.volunteerId,
      volunteerName: assignment.volunteerName,
      status: 'PROPOSED',
      proposedAt: new Date().toISOString(),
      idempotencyKey: recoveryIdempotencyKey,
      recoveryAttemptCount: assignment.recoveryAttemptCount + 1,
      previousAssignmentId: assignment.id,
    });

    dbRepository.updateDonation(donation.id, {
      status: 'PROPOSED',
      currentAssignmentId: newAssignment.id,
    });

    // Reserve alternative recipient capacity
    const altOrg = dbRepository.getOrgById(topAlternative.recipientId);
    if (altOrg) {
      dbRepository.updateOrg(altOrg.id, {
        currentDailyLoadKg: altOrg.currentDailyLoadKg + donation.estimatedKg,
      });
    }

    dbRepository.addWorkflowEvent({
      workflowId: newAssignment.id,
      donationId: donation.id,
      eventType: 'RECOVERY_REASSIGNED',
      actorId: 'SYSTEM_AGENT',
      actorRole: 'SYSTEM_AGENT',
      newStatus: 'PROPOSED',
      metadata: {
        previousAssignmentId: assignment.id,
        newRecipientId: topAlternative.recipientId,
        newRecipientName: topAlternative.recipientName,
        matchScore: topAlternative.score,
      },
    });

    dbRepository.addAuditLog({
      actorId: 'SYSTEM_AGENT',
      actorRole: 'SYSTEM_AGENT',
      action: 'EXECUTE_RECOVERY_REASSIGNMENT',
      resourceType: 'RECOVERY',
      resourceId: newAssignment.id,
      outcome: 'SUCCESS',
      details: {
        fromRecipientId: assignment.recipientId,
        toRecipientId: topAlternative.recipientId,
      },
    });

    return {
      failedAssignment,
      recoveredAssignment: newAssignment,
      recoverySuccess: true,
      recoveryMessage: `Agent 4 successfully recovered workflow: Reassigned to alternative recipient '${topAlternative.recipientName}' (Score: ${topAlternative.score}/100)`,
    };
  }
}
