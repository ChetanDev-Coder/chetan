'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/components/RoleContext';
import { StatusBadge } from '@/components/StatusBadge';
import { StateTimeline } from '@/components/StateTimeline';
import {
  ClipboardList,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Truck,
  Scale,
  Building,
  Clock,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Assignment, DonationItem, Organization } from '@/lib/types';

export default function AssignmentsPage() {
  const { currentRole, currentUser } = useRole();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');

  // Modal states
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('Daily walk-in capacity full; walk-in freezer undergoing defroster check');
  const [declineSubmitting, setDeclineSubmitting] = useState(false);

  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pickupTemp, setPickupTemp] = useState('66.5');
  const [pickupMethod, setPickupMethod] = useState<'VOLUNTEER_SIGNATURE' | 'DIGITAL_SCALE_RECEIPT'>('VOLUNTEER_SIGNATURE');
  const [pickupNotes, setPickupNotes] = useState('Thermal insulated containers verified intact.');

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [actualScaleKg, setActualScaleKg] = useState('36.5');
  const [recipientSignee, setRecipientSignee] = useState('Sister Sarah Jenkins');
  const [deliveryNotes, setDeliveryNotes] = useState('Weighed on certified kitchen platform scale.');

  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assignments');
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments || []);
        if (data.assignments && data.assignments.length > 0 && !selectedAssignmentId) {
          setSelectedAssignmentId(data.assignments[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const activeAssignment = assignments.find((a) => a.id === selectedAssignmentId) || assignments[0];
  const activeDonation = (activeAssignment as unknown as { donation?: DonationItem })?.donation;
  const activeRecipient = (activeAssignment as unknown as { recipient?: Organization })?.recipient;

  // 1. Recipient Accepts Assignment
  const handleAccept = async () => {
    if (!activeAssignment) return;
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/assignments/${activeAssignment.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentRole === 'COORDINATOR' ? 'RECIPIENT' : currentRole,
        },
        body: JSON.stringify({
          action: 'ACCEPT',
          idempotencyKey: `accept_${activeAssignment.id}_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: 'Assignment officially accepted by recipient! Logistics carrier notified.', type: 'success' });
        fetchAssignments();
      } else {
        throw new Error(data.error);
      }
    } catch (err: unknown) {
      setStatusMessage({ text: err instanceof Error ? err.message : 'Accept failed', type: 'error' });
    }
  };

  // 2. Recipient Declines -> Agent 4 Auto Recovery Loop
  const handleDeclineAndRecover = async () => {
    if (!activeAssignment) return;
    setDeclineSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/assignments/${activeAssignment.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentRole === 'COORDINATOR' ? 'RECIPIENT' : currentRole,
        },
        body: JSON.stringify({
          action: 'DECLINE',
          reason: declineReason,
          triggerAutoRecovery: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          text: data.recoveryMessage || 'Assignment declined. Agent 4 executed automated recovery!',
          type: 'success',
        });
        setDeclineModalOpen(false);
        fetchAssignments();
      } else {
        throw new Error(data.error);
      }
    } catch (err: unknown) {
      setStatusMessage({ text: err instanceof Error ? err.message : 'Decline failed', type: 'error' });
    } finally {
      setDeclineSubmitting(false);
    }
  };

  // 3. Driver Confirms Pickup
  const handleConfirmPickup = async () => {
    if (!activeAssignment) return;
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/assignments/${activeAssignment.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentRole === 'COORDINATOR' ? 'VOLUNTEER' : currentRole,
        },
        body: JSON.stringify({
          action: 'CONFIRM_PICKUP',
          verificationMethod: pickupMethod,
          confirmedTempCelsius: parseFloat(pickupTemp) || undefined,
          pickupNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: 'Pickup verified with temperature audit! Cargo in transit.', type: 'success' });
        setPickupModalOpen(false);
        fetchAssignments();
      } else {
        throw new Error(data.error);
      }
    } catch (err: unknown) {
      setStatusMessage({ text: err instanceof Error ? err.message : 'Pickup failed', type: 'error' });
    }
  };

  // 4. Delivery Confirmation with Scale Weight
  const handleConfirmDelivery = async () => {
    if (!activeAssignment) return;
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/assignments/${activeAssignment.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentRole === 'COORDINATOR' ? 'VOLUNTEER' : currentRole,
        },
        body: JSON.stringify({
          action: 'CONFIRM_DELIVERY',
          actualQuantityDeliveredKg: parseFloat(actualScaleKg) || 1,
          deliveryNotes,
          recipientSigneeName: recipientSignee,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          text: `Delivery scale-verified (${actualScaleKg} kg)! Discrepancy: ${data.discrepancyKg} kg. Rescued ${data.impactSummary?.mealsDelivered} meals!`,
          type: 'success',
        });
        setDeliveryModalOpen(false);
        fetchAssignments();
      } else {
        throw new Error(data.error);
      }
    } catch (err: unknown) {
      setStatusMessage({ text: err instanceof Error ? err.message : 'Delivery verification failed', type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-800 text-xs px-2.5 py-1 rounded-full border border-purple-200 font-semibold mb-2">
            <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
            <span>Agent 4 — State Machine & Failure Recovery Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Assignment Coordination & Recovery</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manages handover lifecycle states, enforces approvals, and executes automated decline recovery.
          </p>
        </div>

        <button
          onClick={fetchAssignments}
          className="p-2 border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-600 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Split: Assignments List (Left) and Active Tracker & Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Assignments List */}
        <div className="space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500">
            Active Assignments ({assignments.length})
          </h3>

          <div className="space-y-2">
            {assignments.map((asg) => {
              const isSelected = asg.id === (activeAssignment?.id);
              const d = (asg as unknown as { donation?: DonationItem })?.donation;
              const r = (asg as unknown as { recipient?: Organization })?.recipient;

              return (
                <button
                  key={asg.id}
                  onClick={() => setSelectedAssignmentId(asg.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-white border-emerald-600 shadow-md ring-2 ring-emerald-100'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] text-stone-400 font-semibold">{asg.id}</span>
                    <StatusBadge status={asg.status} size="sm" />
                  </div>

                  <div className="font-bold text-xs text-stone-900 truncate">
                    {d?.foodName || 'Surplus Food Batch'}
                  </div>

                  <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
                    <span className="truncate">➔ {r?.name || 'Recipient Org'}</span>
                    <span className="font-semibold text-stone-700">{d?.estimatedKg || 30} kg</span>
                  </div>

                  {asg.recoveryAttemptCount > 0 && (
                    <div className="mt-2 text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-mono">
                      Recovered (Attempt #{asg.recoveryAttemptCount})
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: State Machine & Active Handover Actions */}
        <div className="lg:col-span-2 space-y-6">
          {activeAssignment ? (
            <>
              {/* Visual State Timeline */}
              <StateTimeline
                currentStatus={
                  (activeDonation?.status as unknown as DonationItem['status']) ||
                  (activeAssignment.status as unknown as DonationItem['status'])
                }
              />

              {/* Assignment Details Card */}
              <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-stone-400">ASSIGNMENT ID: {activeAssignment.id}</span>
                    <h3 className="text-lg font-bold text-stone-900 mt-0.5">
                      {activeDonation?.foodName || 'Food Surplus Batch'}
                    </h3>
                  </div>
                  <StatusBadge status={activeAssignment.status} size="lg" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[11px]">Recipient Org</span>
                    <span className="font-semibold text-stone-800 mt-0.5 block">{activeRecipient?.name}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[11px]">Assigned Carrier</span>
                    <span className="font-semibold text-stone-800 mt-0.5 block">
                      {activeAssignment.volunteerName || 'Alex Rivera (EV Van)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[11px]">Proposed At</span>
                    <span className="font-semibold text-stone-800 mt-0.5 block">
                      {new Date(activeAssignment.proposedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Verified Weight Discrepancy Display if Delivered */}
                {activeAssignment.status === 'DELIVERED' && (
                  <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-xs space-y-2">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-emerald-700" />
                      <span>Scale-Verified Delivery Record</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-emerald-700 block">Initial Estimate</span>
                        <span className="font-bold text-emerald-950">{activeDonation?.estimatedKg} kg</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 block">Scale Measured</span>
                        <span className="font-bold text-emerald-950">{activeAssignment.actualQuantityDeliveredKg} kg</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 block">Weight Discrepancy</span>
                        <span className="font-bold text-emerald-950">
                          {activeAssignment.discrepancyKg && activeAssignment.discrepancyKg > 0 ? `+${activeAssignment.discrepancyKg}` : activeAssignment.discrepancyKg} kg
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-700 block">Delivered Notes</span>
                        <span className="font-semibold text-emerald-950 truncate block">{activeAssignment.deliveryNotes}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons by Workflow Stage */}
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase text-stone-700 tracking-wide">
                      Available Handover Actions
                    </span>
                    <span className="text-[11px] text-stone-400">Current Actor Role: {currentRole}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Stage 1: APPROVED -> Recipient can ACCEPT or DECLINE */}
                    {activeAssignment.status === 'APPROVED' && (
                      <>
                        <button
                          onClick={handleAccept}
                          className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Recipient: Accept Handover</span>
                        </button>

                        <button
                          onClick={() => setDeclineModalOpen(true)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Recipient: Decline (Trigger Auto-Recovery)</span>
                        </button>
                      </>
                    )}

                    {/* Stage 2: ACCEPTED -> Driver can CONFIRM PICKUP */}
                    {activeAssignment.status === 'ACCEPTED' && (
                      <button
                        onClick={() => setPickupModalOpen(true)}
                        className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Driver: Confirm Pickup & Temperature</span>
                      </button>
                    )}

                    {/* Stage 3: PICKUP_CONFIRMED -> Driver/Recipient can CONFIRM DELIVERY */}
                    {activeAssignment.status === 'PICKUP_CONFIRMED' && (
                      <button
                        onClick={() => setDeliveryModalOpen(true)}
                        className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Scale className="w-4 h-4" />
                        <span>Confirm Scale-Verified Delivery</span>
                      </button>
                    )}

                    {/* Re-trigger recovery test if declined */}
                    {activeAssignment.status === 'DECLINED' && (
                      <button
                        onClick={() => {
                          setDeclineReason('Manual coordinator recovery trigger');
                          handleDeclineAndRecover();
                        }}
                        className="bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Trigger Backup Recovery Candidate</span>
                      </button>
                    )}

                    {activeAssignment.status === 'DELIVERED' && (
                      <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Handover Completed & Verified. Terminal state reached.</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-xs text-stone-400">
              Select an assignment from the list to track or advance state.
            </div>
          )}
        </div>
      </div>

      {/* Decline Modal (Demonstrating Agent 4 Automated Recovery) */}
      {declineModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-stone-900">Decline Assignment Proposal</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Declining will activate <strong className="text-purple-700">Agent 4 Automated Decline Recovery</strong> to reassign surplus to the next highest-scoring shelter.
                </p>
              </div>
              <button
                onClick={() => setDeclineModalOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Reason for Inability to Accept *
              </label>
              <textarea
                rows={3}
                required
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-xs text-purple-900 space-y-1">
              <span className="font-bold block text-[11px]">Recovery Guarantee:</span>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                The food will NOT be discarded. The system immediately loads candidate backups, evaluates capacity, and submits an alternative proposal with full audit logging.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeclineModalOpen(false)}
                className="px-4 py-2 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={declineSubmitting}
                onClick={handleDeclineAndRecover}
                className="bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{declineSubmitting ? 'Recovering...' : 'Decline & Trigger Reassignment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickup Confirmation Modal */}
      {pickupModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="font-bold text-base text-stone-900">Courier Pickup Handover</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Measured Cargo Temperature (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={pickupTemp}
                  onChange={(e) => setPickupTemp(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Hot food must be &ge; 60°C; Chilled food must be &le; 4°C.
                </span>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Verification Method
                </label>
                <select
                  value={pickupMethod}
                  onChange={(e) => setPickupMethod(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="VOLUNTEER_SIGNATURE">Courier Digital Signature Verification</option>
                  <option value="DIGITAL_SCALE_RECEIPT">Certified Platform Scale Receipt</option>
                  <option value="PHOTO_CONFIRMATION">Photo Packaging Handover Proof</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Pickup Notes</label>
                <input
                  type="text"
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPickupModalOpen(false)}
                className="px-4 py-2 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPickup}
                className="bg-teal-700 hover:bg-teal-600 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Sign Pickup & Begin Transit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Confirmation Modal */}
      {deliveryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="font-bold text-base text-stone-900">Final Delivery & Scale Verification</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Certified Scale Weight Delivered (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={actualScaleKg}
                  onChange={(e) => setActualScaleKg(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg font-bold text-emerald-900 text-base"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Initial donor estimate: {activeDonation?.estimatedKg || 30} kg. Discrepancy will be tracked automatically.
                </span>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Recipient Signee Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={recipientSignee}
                  onChange={(e) => setRecipientSignee(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Delivery Notes</label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeliveryModalOpen(false)}
                className="px-4 py-2 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelivery}
                className="bg-green-700 hover:bg-green-600 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Confirm Delivery & Record Impact</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
