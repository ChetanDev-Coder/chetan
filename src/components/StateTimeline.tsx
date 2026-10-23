'use client';

import React from 'react';
import { DonationStatus } from '@/lib/types';
import {
  Sparkles,
  Search,
  FileCheck,
  ShieldCheck,
  PackageCheck,
  Truck,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

interface StateTimelineProps {
  currentStatus: DonationStatus;
  events?: Array<{
    eventType: string;
    timestamp: string;
    actorRole?: string;
    reason?: string;
  }>;
}

export function StateTimeline({ currentStatus, events = [] }: StateTimelineProps) {
  const steps: Array<{ status: DonationStatus; label: string; icon: React.ReactNode }> = [
    { status: 'AVAILABLE', label: '1. Available', icon: <Sparkles className="w-4 h-4" /> },
    { status: 'MATCHING', label: '2. Matching', icon: <Search className="w-4 h-4" /> },
    { status: 'PROPOSED', label: '3. Proposed', icon: <FileCheck className="w-4 h-4" /> },
    { status: 'APPROVED', label: '4. Approved', icon: <ShieldCheck className="w-4 h-4" /> },
    { status: 'ACCEPTED', label: '5. Accepted', icon: <PackageCheck className="w-4 h-4" /> },
    { status: 'PICKUP_CONFIRMED', label: '6. In Transit', icon: <Truck className="w-4 h-4" /> },
    { status: 'DELIVERED', label: '7. Delivered', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  // Helper to determine step status
  const orderMap: Record<DonationStatus, number> = {
    AVAILABLE: 1,
    MATCHING: 2,
    PROPOSED: 3,
    APPROVED: 4,
    ACCEPTED: 5,
    PICKUP_CONFIRMED: 6,
    DELIVERED: 7,
    DECLINED: 3.5,
    RECOVERY_PENDING: 3.8,
    CANCELLED: -1,
    FAILED: -1,
    EXPIRED: -1,
  };

  const currentOrder = orderMap[currentStatus] || 1;
  const isRecovery = currentStatus === 'RECOVERY_PENDING' || currentStatus === 'DECLINED';

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>Workflow State Machine</span>
        </h4>
        {isRecovery && (
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
            <RotateCcw className="w-3 h-3 animate-spin" />
            <span>Agent 4 Recovery Active</span>
          </span>
        )}
      </div>

      {/* Progress Bar / Steps */}
      <div className="relative">
        <div className="hidden sm:flex items-center justify-between relative z-10">
          {steps.map((step, idx) => {
            const stepOrder = orderMap[step.status];
            const isCompleted = currentOrder > stepOrder || currentStatus === 'DELIVERED';
            const isCurrent = currentStatus === step.status;

            return (
              <div key={step.status} className="flex flex-col items-center flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 scale-110'
                      : 'bg-stone-100 text-stone-400 border border-stone-200'
                  }`}
                >
                  {step.icon}
                </div>
                <span
                  className={`text-[11px] mt-2 font-medium text-center ${
                    isCurrent
                      ? 'text-emerald-800 font-bold'
                      : isCompleted
                      ? 'text-stone-700'
                      : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step connector line */}
        <div className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-stone-200 -z-0">
          <div
            className="h-full bg-emerald-600 transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, ((currentOrder - 1) / (steps.length - 1)) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* Mobile view simple list */}
      <div className="sm:hidden flex items-center justify-between text-xs py-2 bg-stone-50 rounded-lg px-3">
        <span className="text-stone-500">Current Phase:</span>
        <span className="font-bold text-emerald-800">{currentStatus}</span>
      </div>

      {/* Event Details log */}
      {events.length > 0 && (
        <div className="mt-4 pt-3 border-t border-stone-100">
          <p className="text-[11px] font-semibold text-stone-500 mb-2">Recent Workflow Transitions:</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {events.slice(0, 4).map((e, idx) => (
              <div
                key={idx}
                className="text-[11px] flex items-center justify-between bg-stone-50 px-2.5 py-1.5 rounded border border-stone-100"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                    {e.eventType}
                  </span>
                  {e.reason && <span className="text-stone-600 italic">“{e.reason}”</span>}
                </div>
                <span className="text-[10px] text-stone-400">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
