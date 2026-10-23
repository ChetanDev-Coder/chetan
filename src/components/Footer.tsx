import React from 'react';
import Link from 'next/link';
import { Shield, Sparkles, MapPin, Database, HeartHandshake } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold text-white text-base">RescueGrid AI</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Autonomous multi-agent platform coordinating surplus commercial food redistribution with verified delivery telemetry and food-safety enforcement.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Zero Preventable Waste</span>
            </div>
          </div>

          {/* Core Agents */}
          <div className="space-y-2 text-xs">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Orchestrated AI Agents
            </h4>
            <ul className="space-y-1.5 text-stone-400">
              <li>• Agent 1: Surplus Forecasting</li>
              <li>• Agent 2: Constrained Matching Support</li>
              <li>• Agent 3: Safety Route Planner</li>
              <li>• Agent 4: Workflow & Auto-Recovery</li>
              <li>• Agent 5: Scale Verification & Impact</li>
            </ul>
          </div>

          {/* Google Tech Stack */}
          <div className="space-y-2 text-xs">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Google Technologies
            </h4>
            <ul className="space-y-1.5 text-stone-400">
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Gemini API (Structured Reasoning)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-teal-400" />
                <span>Google Maps Routes Platform</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-blue-400" />
                <span>Firebase Auth & Cloud Firestore</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-purple-400" />
                <span>BigQuery Analytics Integration</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-2 text-xs">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Platform Navigation
            </h4>
            <div className="flex flex-col space-y-1 text-stone-400">
              <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">Operations Dashboard</Link>
              <Link href="/donations/new" className="hover:text-emerald-400 transition-colors">List Surplus Donation</Link>
              <Link href="/assignments" className="hover:text-emerald-400 transition-colors">Recovery & Assignments</Link>
              <Link href="/analytics" className="hover:text-emerald-400 transition-colors">Verified Impact Metrics</Link>
              <Link href="/admin" className="hover:text-emerald-400 transition-colors">Audit & Security Logs</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-2">
          <p>© 2026 RescueGrid AI. Built for real-world food rescue operations.</p>
          <p className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            Deterministic Fallback Protected • Zero Silent Failures
          </p>
        </div>
      </div>
    </footer>
  );
}
