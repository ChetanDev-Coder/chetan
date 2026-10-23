import { describe, it, expect, beforeEach } from 'vitest';
import { dbRepository, resetDb } from '../src/lib/db';
import { CreateDonationSchema } from '../src/lib/validation/schemas';
import { WorkflowEngine } from '../src/lib/stateMachine/workflowEngine';
import { MatchingAgent } from '../src/lib/agents/matchingAgent';
import { WorkflowRecoveryAgent } from '../src/lib/agents/workflowRecoveryAgent';
import { VerificationImpactAgent } from '../src/lib/agents/verificationImpactAgent';
import { MapsRoutingService } from '../src/lib/integrations/mapsClient';
import { GeminiService } from '../src/lib/integrations/geminiClient';
import { ImpactCalculator } from '../src/lib/utils/impactCalculator';
import { DonationItem, Organization } from '../src/lib/types';

describe('RescueGrid AI Core Test Suite', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('1. Donation Creation & Zod Schema Validation', () => {
    it('should validate and create a valid donation', () => {
      const futureDate = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
      const pastDate = new Date(Date.now() - 1 * 3600 * 1000).toISOString();

      const validPayload = {
        donorId: 'user_donor_1',
        donorOrgId: 'org_donor_1',
        donorName: 'Chef Marcus Vance',
        donorOrgName: 'Grand Plaza Convention & Caterers',
        foodName: 'Surplus Catering Trays (Vegetable Biryani)',
        category: 'COOKED_MEALS',
        quantity: 50,
        unit: 'kg',
        estimatedKg: 50,
        preparedAt: pastDate,
        availableUntil: futureDate,
        storageRequirement: 'HOT_HELD_ABOVE_60C',
        allergens: ['Dairy'],
        dietaryTags: ['Vegetarian'],
        pickupLocation: {
          address: '400 Grand Convention Blvd',
          neighborhood: 'Downtown Hub',
          city: 'Metro City',
          lat: 12.9716,
          lng: 77.5946,
        },
        safetyChecklistPassed: true,
      };

      const parsed = CreateDonationSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
    });

    it('should reject donations with invalid dates (availableUntil before preparedAt)', () => {
      const now = Date.now();
      const payload = {
        donorId: 'user_donor_1',
        donorOrgId: 'org_donor_1',
        donorName: 'Chef Marcus',
        donorOrgName: 'Grand Plaza',
        foodName: 'Bad Time Food',
        category: 'COOKED_MEALS',
        quantity: 10,
        unit: 'kg',
        estimatedKg: 10,
        preparedAt: new Date(now + 3600000).toISOString(),
        availableUntil: new Date(now - 3600000).toISOString(), // in the past
        storageRequirement: 'ROOM_TEMPERATURE',
        pickupLocation: {
          address: '123 Test St',
          neighborhood: 'Downtown',
          city: 'Metro City',
          lat: 12.9,
          lng: 77.5,
        },
        safetyChecklistPassed: true,
      };

      const parsed = CreateDonationSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });

    it('should reject donations where safety checklist was not passed', () => {
      const futureDate = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
      const pastDate = new Date(Date.now() - 1 * 3600 * 1000).toISOString();

      const payload = {
        donorId: 'user_donor_1',
        donorOrgId: 'org_donor_1',
        donorName: 'Chef Marcus',
        donorOrgName: 'Grand Plaza',
        foodName: 'Safety Check Failed Food',
        category: 'COOKED_MEALS',
        quantity: 10,
        unit: 'kg',
        estimatedKg: 10,
        preparedAt: pastDate,
        availableUntil: futureDate,
        storageRequirement: 'ROOM_TEMPERATURE',
        pickupLocation: {
          address: '123 Test St',
          neighborhood: 'Downtown',
          city: 'Metro City',
          lat: 12.9,
          lng: 77.5,
        },
        safetyChecklistPassed: false, // Fails checklist!
      };

      const parsed = CreateDonationSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe('2. Recipient Eligibility & Deterministic Constraints (Agent 2)', () => {
    it('should pass matching when category, storage, capacity, and distance constraints align', () => {
      const donation = dbRepository.getDonationById('don_active_1')!;
      const recipient = dbRepository.getOrgById('org_recip_1')!; // Hope Community Kitchen

      const evaluation = MatchingAgent.evaluateDeterministicEligibility(donation, recipient);
      expect(evaluation.isEligible).toBe(true);
      expect(evaluation.disqualificationReasons.length).toBe(0);
      expect(evaluation.distanceKm).toBeGreaterThan(0);
    });

    it('should disqualify a recipient that lacks the required storage equipment', () => {
      const donation = dbRepository.getDonationById('don_active_1')!; // HOT_HELD_ABOVE_60C
      const recipient = dbRepository.getOrgById('org_recip_4')!; // Campus Pantry (only ROOM_TEMP and REFRIGERATED)

      const evaluation = MatchingAgent.evaluateDeterministicEligibility(donation, recipient);
      expect(evaluation.isEligible).toBe(false);
      expect(evaluation.disqualificationReasons.some(r => r.includes('storage') || r.includes('Missing storage equipment'))).toBe(true);
    });

    it('should disqualify an organization if donation exceeds remaining intake capacity', () => {
      const donation = dbRepository.getDonationById('don_active_1')!; // 45 kg
      // Create test recipient with only 10kg capacity remaining
      const smallOrg: Organization = {
        id: 'org_tiny',
        name: 'Tiny Neighborhood Pantry',
        organizationType: 'COMMUNITY_KITCHEN',
        verifiedStatus: true,
        location: {
          address: '10 Small Way',
          neighborhood: 'Downtown',
          city: 'Metro City',
          lat: 12.972,
          lng: 77.595,
        },
        supportedFoodCategories: ['COOKED_MEALS'],
        supportedStorage: ['HOT_HELD_ABOVE_60C'],
        capacityKg: 50,
        currentDailyLoadKg: 45, // only 5kg capacity left!
        operationalHours: { startHour: 8, endHour: 20, activeDays: [0, 1, 2, 3, 4, 5, 6] },
        contactPreferences: { email: 'test@tiny.org', phone: '123', smsAlerts: true },
        rating: 4.8,
        totalRescuedKg: 100,
      };

      const evaluation = MatchingAgent.evaluateDeterministicEligibility(donation, smallOrg);
      expect(evaluation.isEligible).toBe(false);
      expect(evaluation.disqualificationReasons.some(r => r.includes('Insufficient capacity'))).toBe(true);
    });
  });

  describe('3. Workflow State Machine & Role Enforcement', () => {
    it('should strictly prohibit transitioning a DELIVERED donation', () => {
      const canReassign = WorkflowEngine.canTransition('DELIVERED', 'PROPOSED', 'COORDINATOR');
      expect(canReassign.allowed).toBe(false);
      expect(canReassign.reason).toContain('Terminal status');
    });

    it('should prohibit transitioning an EXPIRED donation', () => {
      const canAssign = WorkflowEngine.canTransition('EXPIRED', 'PROPOSED', 'COORDINATOR');
      expect(canAssign.allowed).toBe(false);
      expect(canAssign.reason).toContain('Expired');
    });

    it('should prevent unauthorized roles from approving assignments (only COORDINATOR allowed)', () => {
      const donorApproval = WorkflowEngine.canTransition('PROPOSED', 'APPROVED', 'DONOR');
      expect(donorApproval.allowed).toBe(false);
      expect(donorApproval.reason).toContain('Permission denied');

      const coordinatorApproval = WorkflowEngine.canTransition('PROPOSED', 'APPROVED', 'COORDINATOR');
      expect(coordinatorApproval.allowed).toBe(true);
    });
  });

  describe('4. Idempotency & Duplicate Approval Prevention', () => {
    it('should safely handle duplicate proposal calls with the same idempotency key', () => {
      const idempotencyKey = 'unique_idemp_key_test_123';
      const result1 = WorkflowRecoveryAgent.proposeAssignment({
        donationId: 'don_active_1',
        recipientId: 'org_recip_1',
        actorId: 'user_coordinator_1',
        actorRole: 'COORDINATOR',
        idempotencyKey,
      });

      expect(result1.isIdempotentReplay).toBe(false);

      // Repeat identical call
      const result2 = WorkflowRecoveryAgent.proposeAssignment({
        donationId: 'don_active_1',
        recipientId: 'org_recip_1',
        actorId: 'user_coordinator_1',
        actorRole: 'COORDINATOR',
        idempotencyKey,
      });

      expect(result2.isIdempotentReplay).toBe(true);
      expect(result2.assignment.id).toBe(result1.assignment.id);
    });

    it('should prevent duplicate approvals from creating new records', () => {
      const asg = dbRepository.getAssignmentById('asg_seeded_1')!; // currently PROPOSED
      const approved1 = WorkflowRecoveryAgent.approveAssignment({
        assignmentId: asg.id,
        actorId: 'user_coordinator_1',
        actorRole: 'COORDINATOR',
        idempotencyKey: 'idemp_approve_1',
      });
      expect(approved1.status).toBe('APPROVED');

      // Call approve again on already approved assignment
      const approved2 = WorkflowRecoveryAgent.approveAssignment({
        assignmentId: asg.id,
        actorId: 'user_coordinator_1',
        actorRole: 'COORDINATOR',
        idempotencyKey: 'idemp_approve_2',
      });
      expect(approved2.status).toBe('APPROVED');
      expect(approved2.id).toBe(approved1.id);
    });
  });

  describe('5. Agent 4: Decline & Automatic Recovery Loop', () => {
    it('should automatically search for alternative eligible recipients when an assignment is declined', async () => {
      const asg = dbRepository.getAssignmentById('asg_seeded_1')!; // don_active_2 (Bread, 60kg) assigned to org_recip_4

      const recoveryResult = await WorkflowRecoveryAgent.declineAndRecover({
        assignmentId: asg.id,
        actorId: 'user_recipient_2',
        actorRole: 'RECIPIENT',
        reason: 'Emergency maintenance in loading freezer today',
      });

      expect(recoveryResult.failedAssignment.status).toBe('DECLINED');
      expect(recoveryResult.recoverySuccess).toBe(true);
      expect(recoveryResult.recoveredAssignment).toBeDefined();
      expect(recoveryResult.recoveredAssignment?.recipientId).not.toBe(asg.recipientId);
      expect(recoveryResult.recoveredAssignment?.recoveryAttemptCount).toBe(1);

      // Verify the donation is now PROPOSED with the new assignment
      const donation = dbRepository.getDonationById(asg.donationId)!;
      expect(donation.status).toBe('PROPOSED');
      expect(donation.currentAssignmentId).toBe(recoveryResult.recoveredAssignment?.id);
    });
  });

  describe('6. Agent 5: Delivery Verification & Discrepancy Tracking', () => {
    it('should enforce temperature check on pickup for hot food', () => {
      // asg_seeded_2 has don_active_3
      // Let's set up an accepted assignment for don_active_1 (Hot food)
      dbRepository.updateDonation('don_active_1', { status: 'ACCEPTED' });
      const asg = dbRepository.createAssignment({
        donationId: 'don_active_1',
        recipientId: 'org_recip_1',
        status: 'ACCEPTED',
        proposedAt: new Date().toISOString(),
        idempotencyKey: 'temp_check_key_1',
        recoveryAttemptCount: 0,
      });

      // Try pickup with dangerously low temperature (52°C < 60°C requirement)
      expect(() => {
        VerificationImpactAgent.confirmPickup({
          assignmentId: asg.id,
          actorId: 'user_volunteer_1',
          actorRole: 'VOLUNTEER',
          verificationMethod: 'VOLUNTEER_SIGNATURE',
          confirmedTempCelsius: 52,
        });
      }).toThrow(/Food safety violation/);

      // Try with compliant temperature (66°C >= 60°C)
      const confirmed = VerificationImpactAgent.confirmPickup({
        assignmentId: asg.id,
        actorId: 'user_volunteer_1',
        actorRole: 'VOLUNTEER',
        verificationMethod: 'VOLUNTEER_SIGNATURE',
        confirmedTempCelsius: 66,
      });
      expect(confirmed.status).toBe('PICKUP_CONFIRMED');
    });

    it('should record actual scale delivered weight and track discrepancy correctly', () => {
      // Pick up asg_seeded_2 first
      dbRepository.updateDonation('don_active_3', { status: 'ACCEPTED' });
      dbRepository.updateAssignment('asg_seeded_2', { status: 'ACCEPTED' });

      VerificationImpactAgent.confirmPickup({
        assignmentId: 'asg_seeded_2',
        actorId: 'user_volunteer_1',
        actorRole: 'VOLUNTEER',
        verificationMethod: 'VOLUNTEER_SIGNATURE',
      });

      // Deliver with verified weight of 36.8 kg (estimated was 35 kg -> discrepancy +1.8 kg)
      const deliveryResult = VerificationImpactAgent.confirmDelivery({
        assignmentId: 'asg_seeded_2',
        actorId: 'user_volunteer_1',
        actorRole: 'VOLUNTEER',
        actualQuantityDeliveredKg: 36.8,
        recipientSigneeName: 'Sister Sarah Jenkins',
      });

      expect(deliveryResult.assignment.status).toBe('DELIVERED');
      expect(deliveryResult.assignment.actualQuantityDeliveredKg).toBe(36.8);
      expect(deliveryResult.discrepancyKg).toBe(1.8);
      expect(deliveryResult.impactSummary.mealsDelivered).toBe(Math.round(36.8 / 0.42));
      expect(deliveryResult.impactSummary.co2AvoidedKg).toBe(Number((36.8 * 2.5).toFixed(1)));
    });
  });

  describe('7. Impact Metrics Calculations', () => {
    it('should calculate accurate verified impact metrics and differentiate measured vs estimated', () => {
      const donations = dbRepository.listDonations();
      const assignments = dbRepository.listAssignments();

      const metrics = ImpactCalculator.calculate(donations, assignments);

      expect(metrics.totalEligibleDonations).toBeGreaterThan(0);
      expect(metrics.verifiedDeliveredKg).toBeGreaterThan(0);
      expect(metrics.mealsDeliveredCount).toBeGreaterThan(0);
      expect(metrics.co2EmissionsPreventedKg).toBeGreaterThan(0);
      expect(metrics.dataSourceLabels.verifiedKg).toBe('MEASURED');
      expect(metrics.dataSourceLabels.co2Offset).toBe('ESTIMATED_EPA_WARM');
    });
  });

  describe('8. Fallback Behaviors (Gemini & Maps Offline)', () => {
    it('should perform deterministic candidate ranking when Gemini API is offline or unconfigured', () => {
      const ranking = GeminiService.deterministicRankingFallback({
        donation: {
          foodName: 'Test Food',
          category: 'COOKED_MEALS',
          estimatedKg: 25,
        },
        candidates: [
          {
            id: 'cand_1',
            name: 'Candidate A',
            type: 'COMMUNITY_KITCHEN',
            capacityKg: 100,
            currentLoadKg: 20,
            distanceKm: 4.2,
            estimatedTransitMins: 15,
            rating: 4.9,
          },
          {
            id: 'cand_2',
            name: 'Candidate B',
            type: 'FOOD_BANK',
            capacityKg: 500,
            currentLoadKg: 100,
            distanceKm: 18.5,
            estimatedTransitMins: 45,
            rating: 4.5,
          },
        ],
      });

      expect(ranking.isAiGenerated).toBe(false);
      expect(ranking.rankedResults.length).toBe(2);
      expect(ranking.rankedResults[0].score).toBeGreaterThan(ranking.rankedResults[1].score); // Closer community kitchen ranks higher
    });

    it('should perform deterministic route calculation when Google Maps API key is missing', () => {
      const origin = { address: 'A', neighborhood: 'N1', city: 'C', lat: 12.97, lng: 77.59 };
      const dest = { address: 'B', neighborhood: 'N2', city: 'C', lat: 12.93, lng: 77.58 };

      const route = MapsRoutingService.calculateDeterministicRoute(origin, dest);
      expect(route.isRealRoutesApi).toBe(false);
      expect(route.distanceKm).toBeGreaterThan(0);
      expect(route.durationMinutes).toBeGreaterThan(0);
      expect(route.waypoints.length).toBeGreaterThan(2);
    });
  });
});
