'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Sparkles,
  Search,
  Navigation,
  RotateCcw,
  Scale,
  Play,
  CheckCircle2,
  AlertCircle,
  Database,
  ShieldCheck,
  Calendar,
  Building,
} from 'lucide-react';
import { SurplusForecast, Organization } from '@/lib/types';

export default function AgentsHubPage() {
  const [activeTab, setActiveTab] = useState<'agent1' | 'agent2' | 'agent3' | 'agent4' | 'agent5'>('agent1');

  // Agent 1 Forecaster State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedDonorOrgId, setSelectedDonorOrgId] = useState('org_donor_1');
  const [forecastDay, setForecastDay] = useState('FRIDAY');
  const [forecastSlot, setForecastSlot] = useState<'LUNCH' | 'DINNER' | 'BUFFET_CLOSURE' | 'EVENT_EXTRA'>('BUFFET_CLOSURE');
  const [forecastHeadcount, setForecastHeadcount] = useState('450');
  const [forecastHoliday, setForecastHoliday] = useState(false);
  const [forecastResult, setForecastResult] = useState<SurplusForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Agent 2 Matcher Inspector State
  const [agent2Result, setAgent2Result] = useState<any>(null);
  const [agent2Loading, setAgent2Loading] = useState(false);

  // Load donor orgs
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.allOrganizations) {
          const donors = data.allOrganizations.filter((o: Organization) => o.organizationType === 'DONOR_BUSINESS');
          setOrganizations(donors);
          if (donors.length > 0) setSelectedDonorOrgId(donors[0].id);
        }
      });
  }, []);

  const runForecaster = async () => {
    setForecastLoading(true);
    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorOrgId: selectedDonorOrgId,
          dayOfWeek: forecastDay,
          mealSlot: forecastSlot,
          expectedHeadcount: parseInt(forecastHeadcount, 10) || 300,
          isHolidayOrEvent: forecastHoliday,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForecastResult(data.forecast);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setForecastLoading(false);
    }
  };

  const testAgent2 = async () => {
    setAgent2Loading(true);
    try {
      const res = await fetch('/api/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId: 'don_active_1',
          forceDeterministicFallback: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAgent2Result(data.recommendations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAgent2Loading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded-full border border-emerald-200 font-semibold mb-2">
          <Cpu className="w-3.5 h-3.5 text-emerald-600" />
          <span>Multi-Agent System Control Architecture</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Agentic Orchestration Console</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Audit, test, and inspect individual agent behaviors, tool contracts, and failure recovery protocols.
        </p>
      </div>

      {/* Agent Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('agent1')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'agent1'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Agent 1: Forecaster</span>
        </button>

        <button
          onClick={() => setActiveTab('agent2')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'agent2'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Agent 2: Decision Support</span>
        </button>

        <button
          onClick={() => setActiveTab('agent3')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'agent3'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Agent 3: Route Planner</span>
        </button>

        <button
          onClick={() => setActiveTab('agent4')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'agent4'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Agent 4: Workflow & Recovery</span>
        </button>

        <button
          onClick={() => setActiveTab('agent5')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'agent5'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Agent 5: Verification & Impact</span>
        </button>
      </div>

      {/* Tab 1: Agent 1 - Surplus Forecasting */}
      {activeTab === 'agent1' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm text-stone-900">Run Forecast Prediction</h3>
              <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                Gemini Structured Output
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-medium mb-1">Donor Facility</label>
                <select
                  value={selectedDonorOrgId}
                  onChange={(e) => setSelectedDonorOrgId(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg bg-white"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Day of Week</label>
                  <select
                    value={forecastDay}
                    onChange={(e) => setForecastDay(e.target.value)}
                    className="w-full p-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="MONDAY">Monday</option>
                    <option value="TUESDAY">Tuesday</option>
                    <option value="WEDNESDAY">Wednesday</option>
                    <option value="THURSDAY">Thursday</option>
                    <option value="FRIDAY">Friday (Weekend surge)</option>
                    <option value="SATURDAY">Saturday</option>
                    <option value="SUNDAY">Sunday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 font-medium mb-1">Meal Service Slot</label>
                  <select
                    value={forecastSlot}
                    onChange={(e) => setForecastSlot(e.target.value as any)}
                    className="w-full p-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="LUNCH">Lunch Service</option>
                    <option value="DINNER">Dinner Service</option>
                    <option value="BUFFET_CLOSURE">Buffet Closure</option>
                    <option value="EVENT_EXTRA">Banquet / Event Extra</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Expected Dining Headcount</label>
                <input
                  type="number"
                  value={forecastHeadcount}
                  onChange={(e) => setForecastHeadcount(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fcHoliday"
                  checked={forecastHoliday}
                  onChange={(e) => setForecastHoliday(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300"
                />
                <label htmlFor="fcHoliday" className="text-xs text-stone-700">
                  Campus Holiday or Special Conference Event Buffer (+25%)
                </label>
              </div>

              <button
                onClick={runForecaster}
                disabled={forecastLoading}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 mt-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{forecastLoading ? 'Synthesizing...' : 'Execute Surplus Forecast Tool'}</span>
              </button>
            </div>
          </div>

          {/* Forecast Output Inspector */}
          <div className="bg-stone-900 text-white rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Structured Prediction Output
                </span>
                <span className="text-[10px] font-mono text-stone-400">
                  {forecastResult?.modelVersion || 'Ready'}
                </span>
              </div>

              {forecastResult ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-stone-400 block">Predicted Surplus</span>
                    <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                      {forecastResult.predictedSurplusKg} <span className="text-sm font-normal text-stone-400">kg</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-stone-800/80 p-3 rounded-lg border border-stone-700">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Uncertainty Range</span>
                      <span className="font-mono text-stone-200">
                        [{forecastResult.uncertaintyRangeKg[0]}kg, {forecastResult.uncertaintyRangeKg[1]}kg]
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Confidence Score</span>
                      <span className="font-mono text-emerald-300">
                        {Math.round(forecastResult.confidenceScore * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <span className="text-stone-400 font-semibold block text-[11px]">
                      Predictive Reasoning Factors:
                    </span>
                    {forecastResult.keyFactors.map((f, i) => (
                      <p key={i} className="text-stone-300 text-[11px] flex items-start gap-1.5">
                        <span className="text-emerald-400">•</span>
                        <span>{f}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-stone-500 text-xs py-12 text-center">
                  Click Execute to generate real-time AI surplus forecast.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-800 text-[10px] text-stone-400 flex items-center justify-between">
              <span>Tool: calculateSurplusForecast</span>
              <span>Deterministic baseline fallback verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Agent 2 - Decision Support & Deterministic Eligibility */}
      {activeTab === 'agent2' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-stone-900">Deterministic Hard Rules Checklist</h3>
              <p className="text-xs text-stone-500">
                LLMs are NEVER permitted to override hard safety, temperature, or capacity rules.
              </p>
            </div>

            <button
              onClick={testAgent2}
              disabled={agent2Loading}
              className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{agent2Loading ? 'Evaluating...' : 'Run Decision Engine (Donation #1)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
              <span className="font-bold text-stone-900 block">Rule 1: Storage Equipment</span>
              <p className="text-stone-600 text-[11px] mt-1">
                Recipient must possess verified hot-holding cambros (&gt;60°C) or walk-in refrigeration (0-4°C).
              </p>
            </div>
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
              <span className="font-bold text-stone-900 block">Rule 2: Daily Capacity Margin</span>
              <p className="text-stone-600 text-[11px] mt-1">
                <code>(capacityKg - currentLoadKg) &ge; donationKg</code>. Prevents food spoilage from overflow.
              </p>
            </div>
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
              <span className="font-bold text-stone-900 block">Rule 3: HACCP Transit Limit</span>
              <p className="text-stone-600 text-[11px] mt-1">
                Hot food transit duration must be &le; 45 mins. Beyond this, candidate is disqualified.
              </p>
            </div>
          </div>

          {agent2Result && (
            <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
              <h4 className="font-bold text-xs text-stone-800 uppercase tracking-wide">
                Agent 2 Evaluated Candidate Rankings:
              </h4>
              <div className="space-y-2">
                {agent2Result.map((r: any) => (
                  <div key={r.recipientId} className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900">{r.recipientName}</span>
                      <span className="text-stone-500 text-[11px] ml-2">({r.distanceKm} km • ~{r.estimatedTransitMinutes}m)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-800 text-sm">{r.score}/100</span>
                      {r.score > 0 ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">ELIGIBLE</span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded font-bold">DISQUALIFIED</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Agent 3 - Route Planner */}
      {activeTab === 'agent3' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
            Agent 3 — Safety Route Planner Telemetry
          </h3>
          <p className="text-stone-600 leading-relaxed">
            Integrates with Google Maps Platform Routes API v2 using field masks for optimal latency. When unconfigured in local sandbox mode, executes deterministic Haversine distance with an urban road circuity coefficient of 1.32x.
          </p>
          <div className="bg-stone-900 text-stone-200 p-4 rounded-xl font-mono text-[11px] space-y-1">
            <span className="text-emerald-400 block">// Agent 3 Tool Execution Schema</span>
            <p>calculateRoute(origin: GeoLocation, destination: GeoLocation, storageRequirement: StorageRequirement)</p>
            <p className="text-stone-400">Enforces: maxRecommendedTransitMinutes = 45m (Hot) | 60m (Cold)</p>
          </div>
          <Link href="/routes" className="inline-block bg-teal-700 hover:bg-teal-600 text-white font-semibold px-4 py-2 rounded-lg">
            Open Interactive Map & Route Viewer &rarr;
          </Link>
        </div>
      )}

      {/* Tab 4: Agent 4 - Workflow & Recovery Engine */}
      {activeTab === 'agent4' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
            Agent 4 — Workflow Orchestration & Automated Decline Recovery
          </h3>
          <p className="text-stone-600 leading-relaxed">
            Guarantees zero silent dropoffs. When any recipient organization declines or fails to confirm within the operational window, Agent 4 executes an automated recovery cycle:
          </p>
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center gap-2 font-mono text-[11px] text-stone-800">
              <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">1. DECLINE_DETECTED</span>
              <span>➔ Log decline reason in audit trail & release reserved capacity</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-stone-800">
              <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">2. RECOVERY_PENDING</span>
              <span>➔ Re-evaluate eligible recipient pool excluding declining party</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-stone-800">
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">3. PROPOSED</span>
              <span>➔ Transmit proposal to next highest scoring recipient with recovery counter incremented</span>
            </div>
          </div>
          <Link href="/assignments" className="inline-block bg-purple-700 hover:bg-purple-600 text-white font-semibold px-4 py-2 rounded-lg">
            Test Decline & Auto-Recovery on Live Assignments &rarr;
          </Link>
        </div>
      )}

      {/* Tab 5: Agent 5 - Scale Verification & Impact */}
      {activeTab === 'agent5' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
            Agent 5 — Verification & Certified Impact Calculation
          </h3>
          <p className="text-stone-600 leading-relaxed">
            Strictly separates measured real-world scale receipts from scientific estimation models:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 space-y-1">
              <span className="font-bold text-emerald-950 block">MEASURED (Digital Scale)</span>
              <p className="text-emerald-900 text-[11px]">
                Weight recorded at recipient dock. Tracks discrepancy against donor's initial estimate.
              </p>
            </div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1">
              <span className="font-bold text-stone-900 block">ESTIMATED (EPA WARM Standard)</span>
              <p className="text-stone-600 text-[11px]">
                <code>2.5 kg CO2e / kg food</code> prevented from landfill anaerobic degradation.
              </p>
            </div>
          </div>
          <Link href="/analytics" className="inline-block bg-green-700 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg">
            View Impact Analytics & BigQuery Ingestion Schema &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
