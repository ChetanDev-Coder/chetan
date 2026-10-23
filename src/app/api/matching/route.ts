import { NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db';
import { MatchingAgent } from '@/lib/agents/matchingAgent';
import { MatchRequestSchema } from '@/lib/validation/schemas';
import { Security } from '@/lib/utils/security';
import { WorkflowEngine } from '@/lib/stateMachine/workflowEngine';

export async function POST(request: Request) {
  try {
    const auth = Security.getAuthContext(request);
    Security.assertRole(auth, ['COORDINATOR', 'DONOR']);

    const body = await request.json();
    const validated = MatchRequestSchema.parse(body);

    const donation = dbRepository.getDonationById(validated.donationId);
    if (!donation) {
      return NextResponse.json({ success: false, error: 'Donation not found' }, { status: 404 });
    }

    // Check if donation can be matched
    if (['DELIVERED', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(donation.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot run matching on donation in terminal state '${donation.status}'` },
        { status: 400 }
      );
    }

    // Update donation status to MATCHING if available
    if (donation.status === 'AVAILABLE') {
      const transition = WorkflowEngine.canTransition('AVAILABLE', 'MATCHING', auth.role);
      if (transition.allowed) {
        dbRepository.updateDonation(donation.id, { status: 'MATCHING' });
      }
    }

    const allOrgs = dbRepository.listOrganizations();
    const recommendations = await MatchingAgent.findAndRankMatches(
      donation,
      allOrgs,
      validated.maxRadiusKm,
      validated.forceDeterministicFallback
    );

    // Save recommendations
    dbRepository.saveRecommendationsForDonation(donation.id, recommendations);

    // Audit log
    dbRepository.addAuditLog({
      actorId: auth.userId,
      actorRole: auth.role,
      action: 'RUN_AI_MATCHING',
      resourceType: 'MATCH',
      resourceId: donation.id,
      outcome: 'SUCCESS',
      details: {
        matchesFound: recommendations.filter(r => r.score > 0).length,
        disqualified: recommendations.filter(r => r.score === 0).length,
        modelVersion: recommendations[0]?.modelVersion || 'none',
      },
    });

    return NextResponse.json({
      success: true,
      donationId: donation.id,
      count: recommendations.length,
      recommendations,
    });
  } catch (err) {
    return Security.errorResponse(err, 400);
  }
}
