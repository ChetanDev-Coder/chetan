'use client';

import React, { useState } from 'react';
import { useRole } from './RoleContext';
import { Sparkles, MapPin, Database, ChevronDown, ChevronUp, KeyRound } from 'lucide-react';

export function IntegrationsBanner() {
  const { integrations } = useRole();
  const [showConfigDetails, setShowConfigDetails] = useState(false);

  return (
    <div className="bg-stone-900 text-stone-200 text-xs border-b border-stone-800">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-stone-400 uppercase tracking-wider text-[10px]">
            System Integrations:
          </span>

          {/* Gemini API */}
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-stone-300">Gemini AI:</span>
            {integrations.gemini.isConfigured ? (
              <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/60 font-mono text-[11px]">
                LIVE ({integrations.gemini.model})
              </span>
            ) : (
              <span className="bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/60 font-mono text-[11px] title='Deterministic Fallback Engine active'">
                DETERMINISTIC FALLBACK (Offline)
              </span>
            )}
          </div>

          {/* Google Maps Routes API */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-teal-400" />
            <span className="text-stone-300">Routes API:</span>
            {integrations.maps.isConfigured ? (
              <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/60 font-mono text-[11px]">
                LIVE GOOGLE MAPS
              </span>
            ) : (
              <span className="bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded border border-stone-700 font-mono text-[11px]">
                SIMULATED ROAD MODEL (1.32x)
              </span>
            )}
          </div>

          {/* Firebase / Storage */}
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-blue-400" />
            <span className="text-stone-300">Data Store:</span>
            <span className="bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded border border-stone-700 font-mono text-[11px]">
              {integrations.firebase.mode === 'CLOUD_FIRESTORE' ? 'CLOUD FIRESTORE' : 'LOCAL PERSISTENT ADAPTER'}
            </span>
          </div>
        </div>

        {/* Toggle Credentials Drawer */}
        <button
          onClick={() => setShowConfigDetails(!showConfigDetails)}
          className="flex items-center gap-1 text-stone-400 hover:text-white transition-colors cursor-pointer"
        >
          <KeyRound className="w-3 h-3 text-amber-400" />
          <span>API Config</span>
          {showConfigDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showConfigDetails && (
        <div className="bg-stone-950 border-t border-stone-800 p-3 text-stone-300 transition-all">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
            <div className="bg-stone-900 p-2.5 rounded border border-stone-800">
              <div className="font-semibold text-emerald-400 mb-1 flex items-center justify-between">
                <span>Google Gemini API</span>
                <span className="text-[10px] text-stone-400">GEMINI_API_KEY</span>
              </div>
              <p className="text-stone-400">
                Powers Agent 1 (Surplus Forecasting) & Agent 2 (Reasoning & Decision Support). When unconfigured, executes structured deterministic fallback algorithms with zero errors.
              </p>
            </div>
            <div className="bg-stone-900 p-2.5 rounded border border-stone-800">
              <div className="font-semibold text-teal-400 mb-1 flex items-center justify-between">
                <span>Google Maps Routes API</span>
                <span className="text-[10px] text-stone-400">GOOGLE_MAPS_API_KEY</span>
              </div>
              <p className="text-stone-400">
                Powers Agent 3 (Route Planner) for real-time traffic-aware route planning. When unconfigured, computes accurate Haversine distance with urban circuity coefficients.
              </p>
            </div>
            <div className="bg-stone-900 p-2.5 rounded border border-stone-800">
              <div className="font-semibold text-blue-400 mb-1 flex items-center justify-between">
                <span>Firebase Authentication & Firestore</span>
                <span className="text-[10px] text-stone-400">FIREBASE_PROJECT_ID</span>
              </div>
              <p className="text-stone-400">
                Provides multi-role authentication and database storage. In local mode, full persistence and audit logging run in memory across sessions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
