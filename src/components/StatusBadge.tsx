'use client';

import React from 'react';
import { DonationStatus, AssignmentStatus } from '@/lib/types';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  RotateCcw,
  XCircle,
  Sparkles,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react';

interface StatusBadgeProps {
  status: DonationStatus | AssignmentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  let bg = 'bg-stone-100 text-stone-700 border-stone-200';
  let icon = <Clock className="w-3.5 h-3.5" />;
  let label = status as string;

  switch (status) {
    case 'AVAILABLE':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      icon = <Sparkles className="w-3.5 h-3.5 text-emerald-600" />;
      label = 'Surplus Available';
      break;
    case 'MATCHING':
      bg = 'bg-teal-50 text-teal-800 border-teal-200 animate-pulse';
      icon = <Sparkles className="w-3.5 h-3.5 text-teal-600" />;
      label = 'AI Matching';
      break;
    case 'PROPOSED':
      bg = 'bg-amber-50 text-amber-800 border-amber-200';
      icon = <Clock className="w-3.5 h-3.5 text-amber-600" />;
      label = 'Proposal Pending';
      break;
    case 'APPROVED':
      bg = 'bg-blue-50 text-blue-800 border-blue-200';
      icon = <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />;
      label = 'Coordinator Approved';
      break;
    case 'ACCEPTED':
      bg = 'bg-indigo-50 text-indigo-800 border-indigo-200';
      icon = <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />;
      label = 'Recipient Accepted';
      break;
    case 'PICKUP_CONFIRMED':
      bg = 'bg-cyan-50 text-cyan-800 border-cyan-200';
      icon = <Truck className="w-3.5 h-3.5 text-cyan-600" />;
      label = 'In Transit';
      break;
    case 'DELIVERED':
      bg = 'bg-green-100 text-green-900 border-green-300 font-semibold';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />;
      label = 'Scale-Verified Delivered';
      break;
    case 'DECLINED':
      bg = 'bg-orange-50 text-orange-800 border-orange-200';
      icon = <AlertCircle className="w-3.5 h-3.5 text-orange-600" />;
      label = 'Declined';
      break;
    case 'RECOVERY_PENDING':
      bg = 'bg-purple-50 text-purple-800 border-purple-200 animate-pulse';
      icon = <RotateCcw className="w-3.5 h-3.5 text-purple-600" />;
      label = 'Agent 4 Recovery Active';
      break;
    case 'CANCELLED':
      bg = 'bg-stone-100 text-stone-600 border-stone-200';
      icon = <XCircle className="w-3.5 h-3.5 text-stone-500" />;
      label = 'Cancelled';
      break;
    case 'FAILED':
      bg = 'bg-rose-50 text-rose-800 border-rose-200';
      icon = <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
      label = 'Rescue Failed';
      break;
    case 'EXPIRED':
      bg = 'bg-stone-200 text-stone-600 border-stone-300';
      icon = <Clock className="w-3.5 h-3.5 text-stone-500" />;
      label = 'Expired Deadline';
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full ${bg} ${sizeClasses}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
