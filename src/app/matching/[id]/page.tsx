'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRole } from '@/components/RoleContext';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Sparkles,
  ShieldCheck,
  Building,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { DonationItem, MatchRecommendation, Assignment } from '@/lib/types';

export default function DonationMatchingPage() {
  const params = useParams();
  const router = useRouter();
  const donationId = params.id as string;
  const { currentRole, currentUser } = useRole();

  const [donation, setDonation] = useState<DonationItem | null>(null);
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>([]);
  const [existingAssignment, setExistingAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchingRunning, setMatchingRunning] = useState(false);
  const [proposingRecipientId, setProposingRecipientId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadDonationAndMatches = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/donations/${donationId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load donation details');
      }

      setDonation(data.donation);
      setRecommendations(data.recommendations || []);
      setExistingAssignment(data.assignment || null);

      // If no recommendations exist yet, trigger matching automatically
      if (!data.recommendations || data.recommendations.length === 0) {
        runMatching(false);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error loading donation');
    } finally {
      setLoading(false);
    }
  };

  const runMatching = async (forceFallback = false) => {
    setMatchingRunning(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          donationId,
          forceDeterministicFallback: forceFallback,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate recommendations');
      }

      setRecommendations(data.recommendations || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Matching error');
    } finally {
      setMatchingRunning(false);
    }
  };

  useEffect(() => {
    if (donationId) {
      loadDonationAndMatches();
    }
  }, [donationId]);

  // Handle Propose / Coordinator Approve action
  const handleProposeAndApprove = async (recipientId: string) => {
    setProposingRecipientId(recipientId);
    setErrorMsg('');
    setActionSuccessMsg('');

    try {
      const idempotencyKey = `prop_asg_${donationId}_${recipientId}_${Date.now()}`;

      // 1. Propose Assignment
      const propRes = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          donationId,
          recipientId,
          idempotencyKey,
        }),
      });

      const propData = await propRes.json();
      if (!propRes.ok || !propData.success) {
        throw new Error(propData.error || 'Failed to propose assignment');
      }

      const createdAssignment = propData.assignment;

      // 2. If user is Coordinator, immediately approve it
      if (currentRole === 'COORDINATOR') {
        const appRes = await fetch(`/api/assignments/${createdAssignment.id}/transition`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
            'x-user-role': currentUser.role,
          },
          body: JSON.stringify({
            action: 'APPROVE',
            idempotencyKey: `app_${createdAssignment.id}_${Date.now()}`,
            notes: 'Approved via 1-click coordinator match review.',
          }),
        });

        const appData = await appRes.json();
        if (appData.success) {
          setActionSuccessMsg('Assignment proposed and approved by Coordinator! Recipient notified.');
          setExistingAssignment(appData.assignment);
          if (donation) setDonation({ ...donation, status: 'APPROVED' });
          return;
        }
      }

      setActionSuccessMsg('Proposal submitted successfully! Pending Coordinator approval.');
      setExistingAssignment(createdAssignment);
      if (donation) setDonation({ ...donation, status: 'PROPOSED' });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProposingRecipientId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <RotateCcw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-stone-500">Evaluating deterministic eligibility and AI ranking...</p>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="font-bold text-stone-800">Donation Not Found</h3>
        <Link href="/donations" className="text-xs text-emerald-700 hover:underline mt-2 inline-block">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const eligibleRecs = recommendations.filter((r) => r.score > 0 && !r.disqualificationReasons);
  const disqualifiedRecs = recommendations.filter((r) => r.disqualificationReasons && r.disqualificationReasons.length > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/donations"
            className="text-stone-500 hover:text-stone-800 p-1.5 rounded-lg border border-stone-200 bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded">
                {donation.id}
              </span>
              <StatusBadge status={donation.status} size="sm" />
            </div>
            <h1 className="text-xl font-bold text-stone-900 mt-0.5">{donation.foodName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => runMatching(false)}
            disabled={matchingRunning}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${matchingRunning ? 'animate-spin' : ''}`} />
            <span>{matchingRunning ? 'Running Reasoning...' : 'Re-Run Matching'}</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{actionSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs text-rose-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Donation Metadata Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-stone-400 block text-[11px]">Donor Facility</span>
          <span className="font-semibold text-stone-800 mt-0.5 block">{donation.donorOrgName}</span>
        </div>
        <div>
          <span className="text-stone-400 block text-[11px]">Weight & Category</span>
          <span className="font-semibold text-stone-800 mt-0.5 block">
            {donation.quantity} {donation.unit} ({donation.category})
          </span>
        </div>
        <div>
          <span className="text-stone-400 block text-[11px]">Storage Requirement</span>
          <span className="font-mono text-[11px] font-semibold text-stone-800 mt-0.5 block">
            {donation.storageRequirement}
          </span>
        </div>
        <div>
          <span className="text-stone-400 block text-[11px]">Collection Deadline</span>
          <span className="font-semibold text-stone-800 mt-0.5 block">
            {new Date(donation.availableUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (
            {new Date(donation.availableUntil).toLocaleDateString()})
          </span>
        </div>
      </div>

      {/* Eligible Candidates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Eligible Recipient Organizations ({eligibleRecs.length})</span>
          </h2>
          <span className="text-[11px] text-stone-500 font-mono">
            {eligibleRecs[0]?.isAiRanked ? 'Gemini 2.5 Structured Reasoning' : 'Deterministic Heuristic Mode'}
          </span>
        </div>

        {eligibleRecs.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-stone-800">No Eligible Recipients Passed Hard Constraints</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              Check the disqualification audit below for exact constraint failures (capacity limits, service radius, or missing temperature equipment).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {eligibleRecs.map((rec, index) => {
              const isSelected = existingAssignment?.recipientId === rec.recipientId;
              const isProposingThis = proposingRecipientId === rec.recipientId;

              return (
                <div
                  key={rec.recipientId}
                  className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${
                    index === 0 ? 'border-emerald-500/80 ring-1 ring-emerald-200' : 'border-stone-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                          #{index + 1}
                        </span>
                        <h3 className="font-bold text-base text-stone-900">{rec.recipientName}</h3>
                        {index === 0 && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                            TOP AI MATCH
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span>{rec.distanceKm} km transit</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>~{rec.estimatedTransitMinutes} mins travel time</span>
                        </span>
                      </div>
                    </div>

                    {/* Overall Score Badge */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-2xl font-black text-emerald-800">{rec.score}</div>
                        <span className="text-[10px] text-stone-400 block -mt-1 font-mono uppercase">
                          Match Score / 100
                        </span>
                      </div>

                      {/* Action Button */}
                      {isSelected ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-lg text-xs font-bold">
                          Assigned & Approved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleProposeAndApprove(rec.recipientId)}
                          disabled={isProposingThis}
                          className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>
                            {isProposingThis
                              ? 'Processing...'
                              : currentRole === 'COORDINATOR'
                              ? 'Approve Assignment'
                              : 'Propose Match'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-Criteria Score Breakdown Bar */}
                  <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px]">
                    <div className="bg-stone-50 p-1.5 rounded border border-stone-100">
                      <span className="text-stone-400 block">Distance (25%)</span>
                      <span className="font-bold text-stone-800 text-xs">
                        {rec.scoreBreakdown.distanceScore}/100
                      </span>
                    </div>
                    <div className="bg-stone-50 p-1.5 rounded border border-stone-100">
                      <span className="text-stone-400 block">Capacity (25%)</span>
                      <span className="font-bold text-stone-800 text-xs">
                        {rec.scoreBreakdown.capacityScore}/100
                      </span>
                    </div>
                    <div className="bg-stone-50 p-1.5 rounded border border-stone-100">
                      <span className="text-stone-400 block">Urgency (20%)</span>
                      <span className="font-bold text-stone-800 text-xs">
                        {rec.scoreBreakdown.urgencyScore}/100
                      </span>
                    </div>
                    <div className="bg-stone-50 p-1.5 rounded border border-stone-100">
                      <span className="text-stone-400 block">Reliability (15%)</span>
                      <span className="font-bold text-stone-800 text-xs">
                        {rec.scoreBreakdown.reliabilityScore}/100
                      </span>
                    </div>
                    <div className="bg-stone-50 p-1.5 rounded border border-stone-100">
                      <span className="text-stone-400 block">Priority Need (15%)</span>
                      <span className="font-bold text-stone-800 text-xs">
                        {rec.scoreBreakdown.priorityNeedScore}/100
                      </span>
                    </div>
                  </div>

                  {/* Reasons list */}
                  <div className="mt-3 bg-stone-50/70 p-3 rounded-lg border border-stone-100 text-xs space-y-1">
                    <span className="font-semibold text-stone-700 block text-[11px]">
                      Structured Match Justification:
                    </span>
                    {rec.reasons.map((reason, rIdx) => (
                      <p key={rIdx} className="text-stone-600 flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{reason}</span>
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disqualified Candidates Section (Proof of Deterministic Rules) */}
      {disqualifiedRecs.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-stone-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-stone-400" />
            <span>Deterministic Disqualification Audit Log (Hard Rule Enforcement)</span>
          </h3>

          <div className="space-y-2">
            {disqualifiedRecs.map((dRec) => (
              <div
                key={dRec.recipientId}
                className="bg-stone-50 rounded-lg border border-stone-200 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-semibold text-stone-700">{dRec.recipientName}</span>
                  <div className="text-[11px] text-stone-500 mt-0.5 flex flex-wrap gap-2">
                    {dRec.disqualificationReasons?.map((reason, idx) => (
                      <span
                        key={idx}
                        className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-mono text-[10px]"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-stone-400 font-mono">Hard Constraint Triggered</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
