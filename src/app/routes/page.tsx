'use client';

import React, { useState, useEffect } from 'react';
import { MapRouteViewer } from '@/components/MapRouteViewer';
import { RouteDetail, GeoLocation, Organization, DonationItem, StorageRequirement } from '@/lib/types';
import {
  Compass,
  Navigation,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Building,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export default function RoutesPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [selectedDonationId, setSelectedDonationId] = useState<string>('');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [currentRoute, setCurrentRoute] = useState<RouteDetail | null>(null);
  const [storageRequirement, setStorageRequirement] = useState<StorageRequirement>('HOT_HELD_ABOVE_60C');
  const [isSafe, setIsSafe] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load organizations and donations
  useEffect(() => {
    Promise.all([fetch('/api/donations'), fetch('/api/auth/session')])
      .then(async ([donRes, sessRes]) => {
        const donData = await donRes.json();
        const sessData = await sessRes.json();

        if (donData.donations) setDonations(donData.donations);
        if (sessData.allOrganizations) {
          setOrganizations(sessData.allOrganizations);
          const recipOrgs = sessData.allOrganizations.filter(
            (o: Organization) => o.organizationType !== 'DONOR_BUSINESS'
          );
          if (recipOrgs.length > 0) setSelectedRecipientId(recipOrgs[0].id);
        }
        if (donData.donations && donData.donations.length > 0) {
          setSelectedDonationId(donData.donations[0].id);
          setStorageRequirement(donData.donations[0].storageRequirement);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const calculateRoute = async () => {
    const donation = donations.find((d) => d.id === selectedDonationId);
    const recipient = organizations.find((o) => o.id === selectedRecipientId);

    if (!donation || !recipient) return;

    setLoading(true);
    try {
      const res = await fetch('/api/routes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: donation.pickupLocation,
          destination: recipient.location,
          storageRequirement: donation.storageRequirement,
        }),
      });

      const data = await res.json();
      if (data.success && data.assessment) {
        setCurrentRoute(data.assessment.route);
        setIsSafe(data.assessment.isSafeForPerishable);
        setWarnings(data.assessment.warnings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDonationId && selectedRecipientId) {
      calculateRoute();
    }
  }, [selectedDonationId, selectedRecipientId]);

  const activeDonation = donations.find((d) => d.id === selectedDonationId);
  const activeRecipient = organizations.find((o) => o.id === selectedRecipientId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-800 text-xs px-2.5 py-1 rounded-full border border-teal-200 font-semibold mb-2">
          <Navigation className="w-3.5 h-3.5 text-teal-600" />
          <span>Agent 3 — Safety Route Planner</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Perishable Route & Safety Window Telemetry</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Calculates travel times, verifies HACCP bacterial danger zone safe windows, and routes couriers safely.
        </p>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-stone-700 font-semibold mb-1">Select Surplus Donation (Origin)</label>
          <select
            value={selectedDonationId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedDonationId(id);
              const d = donations.find((item) => item.id === id);
              if (d) setStorageRequirement(d.storageRequirement);
            }}
            className="w-full p-2 border border-stone-300 rounded-lg bg-white"
          >
            {donations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.foodName} ({d.estimatedKg}kg) — {d.donorOrgName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-stone-700 font-semibold mb-1">Select Recipient Facility (Destination)</label>
          <select
            value={selectedRecipientId}
            onChange={(e) => setSelectedRecipientId(e.target.value)}
            className="w-full p-2 border border-stone-300 rounded-lg bg-white"
          >
            {organizations
              .filter((o) => o.organizationType !== 'DONOR_BUSINESS')
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.organizationType})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Warnings Banner if unsafe */}
      {warnings.length > 0 && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs text-rose-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Food Safety Transit Warning</span>
          </div>
          {warnings.map((w, idx) => (
            <p key={idx} className="text-rose-950">{w}</p>
          ))}
        </div>
      )}

      {/* Map Component */}
      <MapRouteViewer
        route={currentRoute}
        originName={activeDonation ? `${activeDonation.foodName} @ ${activeDonation.donorOrgName}` : undefined}
        destinationName={activeRecipient ? activeRecipient.name : undefined}
        foodCategory={activeDonation?.category}
        storageReq={storageRequirement}
        isSafeForPerishable={isSafe}
      />

      {/* HACCP Food Safety Guidelines Table */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5 text-xs space-y-3">
        <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>HACCP Food Safety Transit Standards (Enforced by Agent 3)</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="bg-white p-3 rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block">Hot Cooked Foods</span>
            <span className="text-stone-500 block mt-0.5">Holding Temp: strictly &gt;60°C</span>
            <span className="font-mono text-emerald-700 font-bold block mt-1">Max Safe Transit: 45 mins</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block">Chilled & Dairy</span>
            <span className="text-stone-500 block mt-0.5">Holding Temp: 0°C to 4°C</span>
            <span className="font-mono text-teal-700 font-bold block mt-1">Max Safe Transit: 60 mins</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block">Ambient / Bakery</span>
            <span className="text-stone-500 block mt-0.5">Room temperature</span>
            <span className="font-mono text-stone-700 font-bold block mt-1">Max Safe Transit: 90 mins</span>
          </div>
        </div>
      </div>
    </div>
  );
}
