import { dbRepository } from '../db/storageAdapter';
import { WorkflowEngine } from '../stateMachine/workflowEngine';
import { ImpactCalculator } from '../utils/impactCalculator';
import { Assignment, UserRole, ImpactMetrics } from '../types';

export class VerificationImpactAgent {
  /**
   * Confirms food pickup by driver/volunteer
   */
  static confirmPickup(params: {
    assignmentId: string;
    actorId: string;
    actorRole: UserRole | 'SYSTEM_AGENT';
    pickupNotes?: string;
    verificationMethod: 'DIGITAL_SCALE_RECEIPT' | 'VOLUNTEER_SIGNATURE' | 'PHOTO_CONFIRMATION';
    confirmedTempCelsius?: number;
  }): Assignment {
    const assignment = dbRepository.getAssignmentById(params.assignmentId);
    if (!assignment) throw new Error(`Assignment ${params.assignmentId} not found`);

    const donation = dbRepository.getDonationById(assignment.donationId);
    if (!donation) throw new Error(`Donation ${assignment.donationId} not found`);

    const canTransition = WorkflowEngine.canTransition(donation.status, 'PICKUP_CONFIRMED', params.actorRole);
    if (!canTransition.allowed) {
      throw new Error(canTransition.reason || 'Invalid transition to PICKUP_CONFIRMED');
    }

    // Safety temperature verification
    if (params.confirmedTempCelsius !== undefined) {
      if (donation.storageRequirement === 'HOT_HELD_ABOVE_60C' && params.confirmedTempCelsius < 60) {
        throw new Error(
          `Food safety violation: Hot food measured at ${params.confirmedTempCelsius}°C. Must be strictly >= 60°C for pickup handover.`
        );
      }
      if (donation.storageRequirement === 'REFRIGERATED_0_4C' && params.confirmedTempCelsius > 5) {
        throw new Error(
          `Food safety violation: Chilled food measured at ${params.confirmedTempCelsius}°C. Must be strictly <= 4°C for pickup handover.`
        );
      }
    }

    const now = new Date().toISOString();
    const updated = dbRepository.updateAssignment(assignment.id, {
      status: 'PICKUP_CONFIRMED',
      pickupConfirmedAt: now,
      pickupNotes: params.pickupNotes,
      verificationMethod: params.verificationMethod,
    })!;

    dbRepository.updateDonation(donation.id, { status: 'PICKUP_CONFIRMED' });

    dbRepository.addWorkflowEvent({
      workflowId: assignment.id,
      donationId: donation.id,
      eventType: 'PICKUP_CONFIRMED',
      actorId: params.actorId,
      actorRole: params.actorRole,
      newStatus: 'PICKUP_CONFIRMED',
      metadata: {
        method: params.verificationMethod,
        temperatureC: params.confirmedTempCelsius,
        notes: params.pickupNotes,
      },
    });

    dbRepository.addAuditLog({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'CONFIRM_PICKUP',
      resourceType: 'ASSIGNMENT',
      resourceId: assignment.id,
      outcome: 'SUCCESS',
      details: { verificationMethod: params.verificationMethod },
    });

    return updated;
  }

  /**
   * Confirms final delivery at recipient facility with verified digital scale weight
   */
  static confirmDelivery(params: {
    assignmentId: string;
    actorId: string;
    actorRole: UserRole | 'SYSTEM_AGENT';
    actualQuantityDeliveredKg: number;
    deliveryNotes?: string;
    recipientSigneeName: string;
  }): {
    assignment: Assignment;
    discrepancyKg: number;
    impactSummary: {
      mealsDelivered: number;
      co2AvoidedKg: number;
    };
  } {
    const assignment = dbRepository.getAssignmentById(params.assignmentId);
    if (!assignment) throw new Error(`Assignment ${params.assignmentId} not found`);

    const donation = dbRepository.getDonationById(assignment.donationId);
    if (!donation) throw new Error(`Donation ${assignment.donationId} not found`);

    const canTransition = WorkflowEngine.canTransition(donation.status, 'DELIVERED', params.actorRole);
    if (!canTransition.allowed) {
      throw new Error(canTransition.reason || 'Invalid transition to DELIVERED');
    }

    if (params.actualQuantityDeliveredKg <= 0) {
      throw new Error('Actual delivered weight must be greater than 0 kg');
    }

    // Calculate weight discrepancy
    const discrepancyKg = Number((params.actualQuantityDeliveredKg - donation.estimatedKg).toFixed(1));

    const now = new Date().toISOString();
    const updated = dbRepository.updateAssignment(assignment.id, {
      status: 'DELIVERED',
      deliveredAt: now,
      actualQuantityDeliveredKg: params.actualQuantityDeliveredKg,
      discrepancyKg,
      deliveryNotes: `${params.deliveryNotes || ''} [Signed by: ${params.recipientSigneeName}]`.trim(),
    })!;

    dbRepository.updateDonation(donation.id, { status: 'DELIVERED' });

    // Update recipient total rescued
    const recipientOrg = dbRepository.getOrgById(assignment.recipientId);
    if (recipientOrg) {
      dbRepository.updateOrg(recipientOrg.id, {
        totalRescuedKg: Number((recipientOrg.totalRescuedKg + params.actualQuantityDeliveredKg).toFixed(1)),
      });
    }

    // Update donor total rescued
    const donorOrg = dbRepository.getOrgById(donation.donorOrgId);
    if (donorOrg) {
      dbRepository.updateOrg(donorOrg.id, {
        totalRescuedKg: Number((donorOrg.totalRescuedKg + params.actualQuantityDeliveredKg).toFixed(1)),
      });
    }

    // Calculate verified impact
    const mealsDelivered = Math.round(params.actualQuantityDeliveredKg / 0.42);
    const co2AvoidedKg = Number((params.actualQuantityDeliveredKg * 2.5).toFixed(1));

    dbRepository.addWorkflowEvent({
      workflowId: assignment.id,
      donationId: donation.id,
      eventType: 'DELIVERY_CONFIRMED_VERIFIED',
      actorId: params.actorId,
      actorRole: params.actorRole,
      newStatus: 'DELIVERED',
      metadata: {
        actualDeliveredKg: params.actualQuantityDeliveredKg,
        discrepancyKg,
        recipientSigneeName: params.recipientSigneeName,
        verifiedMeals: mealsDelivered,
        verifiedCo2AvoidedKg: co2AvoidedKg,
      },
    });

    dbRepository.addAuditLog({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'CONFIRM_DELIVERY_SCALE_VERIFIED',
      resourceType: 'ASSIGNMENT',
      resourceId: assignment.id,
      outcome: 'SUCCESS',
      details: {
        actualKg: params.actualQuantityDeliveredKg,
        discrepancyKg,
        signee: params.recipientSigneeName,
      },
    });

    return {
      assignment: updated,
      discrepancyKg,
      impactSummary: {
        mealsDelivered,
        co2AvoidedKg,
      },
    };
  }

  /**
   * Retrieves aggregate system impact metrics
   */
  static getMetrics(): ImpactMetrics {
    const donations = dbRepository.listDonations();
    const assignments = dbRepository.listAssignments();
    return ImpactCalculator.calculate(donations, assignments);
  }
}
