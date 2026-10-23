'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { Sparkles, Building, Clock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DonationItem } from '@/lib/types';

export default function MatchingIndexPage() {
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/donations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDonations(data.donations || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded-full border border-emerald-200 font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Agent 2 — Constrained Decision Support Hub</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900">AI Matching Engine</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Select a commercial surplus donation to evaluate deterministic constraints and Gemini ranking.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm divide-y divide-stone-100">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-400">Loading candidate surplus batches...</div>
        ) : donations.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">No surplus donations available.</div>
        ) : (
          donations.map((d) => (
            <div
              key={d.id}
              className="p-5 hover:bg-stone-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-stone-900">{d.foodName}</span>
                  <StatusBadge status={d.status} size="sm" />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-stone-400" />
                    <span>{d.donorOrgName}</span>
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-stone-700">
                    {d.quantity} {d.unit} (~{d.estimatedKg} kg)
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-stone-600">{d.storageRequirement}</span>
                </div>
              </div>

              <Link
                href={`/matching/${d.id}`}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto shadow-sm"
              >
                <span>Inspect Match Recommendations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
