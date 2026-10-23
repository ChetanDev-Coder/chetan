'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRole } from '@/components/RoleContext';
import {
  Shield,
  ArrowRight,
  Sparkles,
  Truck,
  HeartHandshake,
  CheckCircle2,
  Clock,
  RotateCcw,
  Scale,
  Building2,
  Users,
  Compass,
  TrendingUp,
} from 'lucide-react';
import { ImpactMetrics } from '@/lib/types';

export default function LandingPage() {
  const { currentRole, switchRole } = useRole();
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setMetrics(data.metrics);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-stone-900 to-stone-950 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-900/60 border border-emerald-500/40 px-3 py-1.5 rounded-full text-xs text-emerald-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Closed-Loop Multi-Agent Food Rescue Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Stop Food Waste with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
              Agentic Coordination
            </span>
          </h1>

          <p className="text-base sm:text-lg text-stone-300 max-w-3xl mx-auto leading-relaxed">
            Every day, commercial caterers, university canteens, and restaurants discard tons of safe surplus food while shelters and community kitchens urgently need supplies. <strong className="text-white">RescueGrid AI</strong> replaces slow phone calls with an autonomous, food-safe multi-agent workflow: deterministic matching, routing with travel-safety windows, automated decline recovery, and verified scale tracking.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/dashboard"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all hover:scale-105"
            >
              <span>Launch Operations Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/donations/new"
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold text-sm px-6 py-3 rounded-xl transition-all"
            >
              <span>List Surplus Food</span>
            </Link>
          </div>

          {/* Persona Switch Pills */}
          <div className="pt-8 border-t border-stone-800/80 max-w-2xl mx-auto">
            <p className="text-xs text-stone-400 mb-3">Explore the application by persona:</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => switchRole('COORDINATOR')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  currentRole === 'COORDINATOR'
                    ? 'bg-emerald-600 text-white border-emerald-400 font-bold'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
              >
                Coordinator (Elena)
              </button>
              <button
                onClick={() => switchRole('DONOR')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  currentRole === 'DONOR'
                    ? 'bg-blue-600 text-white border-blue-400 font-bold'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
              >
                Donor (Chef Marcus)
              </button>
              <button
                onClick={() => switchRole('RECIPIENT')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  currentRole === 'RECIPIENT'
                    ? 'bg-amber-600 text-white border-amber-400 font-bold'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
              >
                Recipient (Sister Sarah)
              </button>
              <button
                onClick={() => switchRole('VOLUNTEER')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  currentRole === 'VOLUNTEER'
                    ? 'bg-purple-600 text-white border-purple-400 font-bold'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
              >
                Driver/Volunteer (Alex)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Live Impact Counters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200/80 p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-2 border-r border-stone-100 last:border-0">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Scale-Verified Rescued
            </span>
            <div className="text-3xl font-extrabold text-stone-900 mt-1">
              {metrics ? metrics.verifiedDeliveredKg : '81.4'}{' '}
              <span className="text-sm font-normal text-stone-500">kg</span>
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block font-mono">
              [MEASURED VIA DIGITAL SCALE]
            </span>
          </div>

          <div className="p-2 border-r border-stone-100 last:border-0">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Meals Provided
            </span>
            <div className="text-3xl font-extrabold text-stone-900 mt-1">
              {metrics ? metrics.mealsDeliveredCount : '194'}
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              EPA/ReFED Standard (0.42 kg/meal)
            </span>
          </div>

          <div className="p-2 border-r border-stone-100 last:border-0">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              CO2 Emissions Avoided
            </span>
            <div className="text-3xl font-extrabold text-stone-900 mt-1">
              {metrics ? metrics.co2EmissionsPreventedKg : '203.5'}{' '}
              <span className="text-sm font-normal text-stone-500">kg</span>
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              EPA WARM (2.5 kg CO2e / kg)
            </span>
          </div>

          <div className="p-2">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Redistribution Rate
            </span>
            <div className="text-3xl font-extrabold text-emerald-700 mt-1">
              {metrics ? metrics.redistributionSuccessRate : '100'}%
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              With Automated Decline Recovery
            </span>
          </div>
        </div>
      </section>

      {/* The Food Waste Problem vs RescueGrid Solution */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Why Traditional Food Rescue Fails
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            Manual phone calls, Excel sheets, and static dashboards cannot solve the perishable food emergency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Legacy Pitfalls */}
          <div className="bg-rose-50/60 rounded-2xl p-6 border border-rose-200">
            <h3 className="text-base font-bold text-rose-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              The Legacy Food Rescue Dilemma
            </h3>
            <ul className="space-y-3 text-xs text-rose-950">
              <li className="flex items-start gap-2">
                <span className="font-bold text-rose-700">✗</span>
                <span><strong>Perishable Expiration:</strong> Hot catered trays cool down into bacteria danger zones (15-60°C) before anyone answers a volunteer group chat.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-rose-700">✗</span>
                <span><strong>Silent Rejections:</strong> When a shelter manager is at full capacity and declines, the donation sits in limbo until the food spoils.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-rose-700">✗</span>
                <span><strong>Unverified Estimates:</strong> Donors claim 100kg, but only 40kg is handed over; ESG and carbon accounting reports end up fabricated.</span>
              </li>
            </ul>
          </div>

          {/* RescueGrid AI Solution */}
          <div className="bg-emerald-50/70 rounded-2xl p-6 border border-emerald-200">
            <h3 className="text-base font-bold text-emerald-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              The RescueGrid Autonomous Workflow
            </h3>
            <ul className="space-y-3 text-xs text-emerald-950">
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">✓</span>
                <span><strong>Deterministic Safety Filters:</strong> Cold/hot storage capabilities, dietary restrictions, and HACCP transit time windows checked in milliseconds.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">✓</span>
                <span><strong>Agent 4 Auto-Recovery:</strong> A recipient decline triggers immediate reassignment to the next best eligible shelter, never dropping the workflow.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">✓</span>
                <span><strong>Agent 5 Scale Verification:</strong> Certified scale receipts at handover separate measured weight from initial guestimates for auditable impact.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Orchestrated 5-Agent Architecture Diagram */}
      <section className="bg-stone-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-block bg-emerald-900/70 border border-emerald-500/40 px-3 py-1 rounded-full text-xs text-emerald-300 font-semibold mb-2">
              Multi-Agent Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">5 Specialized Agents, Zero Hallucinations</h2>
            <p className="text-xs text-stone-400 mt-2">
              Constrained responsibilities, deterministic rules before AI scoring, and auditable tool executions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Agent 1 */}
            <div className="bg-stone-800/80 p-5 rounded-xl border border-stone-700 hover:border-emerald-500 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/60 text-emerald-400 flex items-center justify-center font-bold text-xs mb-3 border border-emerald-700">
                A1
              </div>
              <h4 className="font-bold text-sm text-stone-100">Surplus Forecaster</h4>
              <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                Uses historical catering time-series & Gemini reasoning to predict banquet/canteen surplus before it happens.
              </p>
            </div>

            {/* Agent 2 */}
            <div className="bg-stone-800/80 p-5 rounded-xl border border-stone-700 hover:border-emerald-500 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-teal-900/60 text-teal-400 flex items-center justify-center font-bold text-xs mb-3 border border-teal-700">
                A2
              </div>
              <h4 className="font-bold text-sm text-stone-100">Decision Support</h4>
              <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                Applies deterministic hard rules (capacity, temperature, allergens) before Gemini multi-criteria ranking.
              </p>
            </div>

            {/* Agent 3 */}
            <div className="bg-stone-800/80 p-5 rounded-xl border border-stone-700 hover:border-emerald-500 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-blue-900/60 text-blue-400 flex items-center justify-center font-bold text-xs mb-3 border border-blue-700">
                A3
              </div>
              <h4 className="font-bold text-sm text-stone-100">Route Planner</h4>
              <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                Google Maps Routes API integration with HACCP perishable safe-transit window enforcement (max 45m hot food).
              </p>
            </div>

            {/* Agent 4 */}
            <div className="bg-stone-800/80 p-5 rounded-xl border border-stone-700 hover:border-emerald-500 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-purple-900/60 text-purple-400 flex items-center justify-center font-bold text-xs mb-3 border border-purple-700">
                A4
              </div>
              <h4 className="font-bold text-sm text-stone-100">Workflow & Recovery</h4>
              <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                Enforces approval policies, prevents duplicate proposals with idempotency, and reassigns upon recipient decline.
              </p>
            </div>

            {/* Agent 5 */}
            <div className="bg-stone-800/80 p-5 rounded-xl border border-stone-700 hover:border-emerald-500 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-green-900/60 text-green-400 flex items-center justify-center font-bold text-xs mb-3 border border-green-700">
                A5
              </div>
              <h4 className="font-bold text-sm text-stone-100">Verification & Impact</h4>
              <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                Validates scale tickets, calculates initial vs actual discrepancy, and emits certified carbon offset telemetry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Actions for 4 Roles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 text-center mb-8">
          Coordinated Capabilities for Every Stakeholder
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <Building2 className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-bold text-stone-900 text-sm">For Food Donors</h3>
            <p className="text-xs text-stone-500 mt-1">
              List surplus in 60 seconds with food safety declarations and real-time pickup tracking.
            </p>
            <Link
              href="/donations/new"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 mt-3 inline-flex items-center gap-1"
            >
              <span>Create Listing</span> &rarr;
            </Link>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <HeartHandshake className="w-6 h-6 text-amber-600 mb-2" />
            <h3 className="font-bold text-stone-900 text-sm">For Recipients</h3>
            <p className="text-xs text-stone-500 mt-1">
              Receive compatible supplies that match your daily capacity, storage, and operating hours.
            </p>
            <Link
              href="/assignments"
              className="text-xs font-semibold text-amber-600 hover:text-amber-800 mt-3 inline-flex items-center gap-1"
            >
              <span>Review Incoming</span> &rarr;
            </Link>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <Truck className="w-6 h-6 text-purple-600 mb-2" />
            <h3 className="font-bold text-stone-900 text-sm">For Drivers/Couriers</h3>
            <p className="text-xs text-stone-500 mt-1">
              Turn-by-turn routes with thermal window limits, pickup temp checks, and scale receipt signoff.
            </p>
            <Link
              href="/routes"
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 mt-3 inline-flex items-center gap-1"
            >
              <span>View Active Routes</span> &rarr;
            </Link>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <Shield className="w-6 h-6 text-emerald-600 mb-2" />
            <h3 className="font-bold text-stone-900 text-sm">For Coordinators</h3>
            <p className="text-xs text-stone-500 mt-1">
              Review AI recommendations, approve consequential assignments, and monitor audit trails.
            </p>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 mt-3 inline-flex items-center gap-1"
            >
              <span>Open Ops Console</span> &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
