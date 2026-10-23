'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/RoleContext';
import {
  PackagePlus,
  ShieldCheck,
  AlertTriangle,
  Clock,
  MapPin,
  Thermometer,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function CreateDonationPage() {
  const router = useRouter();
  const { currentUser } = useRole();

  const [formData, setFormData] = useState({
    foodName: '',
    category: 'COOKED_MEALS',
    quantity: '30',
    unit: 'kg',
    estimatedKg: '30',
    preparedAt: '2026-10-23T11:00',
    availableUntil: '2026-10-23T16:00',
    storageRequirement: 'HOT_HELD_ABOVE_60C',
    allergens: [] as string[],
    dietaryTags: ['Vegetarian'] as string[],
    address: '400 Grand Convention Blvd, Loading Bay 3',
    neighborhood: 'Downtown Hub',
    city: 'Metro City',
    lat: '12.9716',
    lng: '77.5946',
    pickupInstructions: 'Enter Gate 2 behind Main Hall. Security has visitor badge pre-printed.',
    safetyChecklistPassed: false,
    notes: 'Buffet completed 45 mins ago. Stored in commercial hot holding cambro units at 68°C.',
  });

  useEffect(() => {
    const now = new Date();
    const prep = new Date(now.getTime() - 1 * 3600 * 1000).toISOString().slice(0, 16);
    const until = new Date(now.getTime() + 4 * 3600 * 1000).toISOString().slice(0, 16);
    setFormData((prev) => ({
      ...prev,
      preparedAt: prep,
      availableUntil: until,
    }));
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successId, setSuccessId] = useState('');

  const availableAllergens = ['Dairy', 'Gluten', 'Eggs', 'Soy', 'Peanuts', 'Tree Nuts', 'Fish', 'Shellfish'];
  const availableDietary = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free', 'Nut-Free'];

  const toggleAllergen = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(item)
        ? prev.allergens.filter((a) => a !== item)
        : [...prev.allergens, item],
    }));
  };

  const toggleDietary = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      dietaryTags: prev.dietaryTags.includes(item)
        ? prev.dietaryTags.filter((d) => d !== item)
        : [...prev.dietaryTags, item],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.safetyChecklistPassed) {
      setErrorMsg('You must certify that this surplus food complies with food safety handling standards.');
      return;
    }

    const prepDate = new Date(formData.preparedAt).getTime();
    const untilDate = new Date(formData.availableUntil).getTime();
    if (untilDate <= prepDate) {
      setErrorMsg('Available-until deadline must be later than preparation time.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        donorId: currentUser.id,
        donorOrgId: currentUser.organizationId || 'org_donor_1',
        donorName: currentUser.displayName,
        donorOrgName: 'Grand Plaza Convention & Caterers',
        foodName: formData.foodName.trim(),
        category: formData.category,
        quantity: parseFloat(formData.quantity) || 1,
        unit: formData.unit,
        estimatedKg: parseFloat(formData.estimatedKg) || parseFloat(formData.quantity) || 1,
        preparedAt: new Date(formData.preparedAt).toISOString(),
        availableUntil: new Date(formData.availableUntil).toISOString(),
        storageRequirement: formData.storageRequirement,
        allergens: formData.allergens,
        dietaryTags: formData.dietaryTags,
        pickupLocation: {
          address: formData.address,
          neighborhood: formData.neighborhood,
          city: formData.city,
          lat: parseFloat(formData.lat) || 12.9716,
          lng: parseFloat(formData.lng) || 77.5946,
        },
        pickupInstructions: formData.pickupInstructions,
        safetyChecklistPassed: formData.safetyChecklistPassed,
        notes: formData.notes,
      };

      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to list surplus food');
      }

      setSuccessId(data.donation.id);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred during donation submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Surplus Food Successfully Registered</h2>
          <p className="text-xs text-stone-600">
            Donation ID: <code className="bg-stone-100 px-2 py-0.5 rounded font-mono">{successId}</code> has entered the RescueGrid matching pipeline.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/matching/${successId}`}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Run AI Matching Now &rarr;
            </Link>
            <Link
              href="/donations"
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/donations"
          className="text-stone-500 hover:text-stone-800 p-1.5 rounded-lg border border-stone-200 bg-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">List Commercial Surplus Food</h1>
          <p className="text-xs text-stone-500">
            Register prepared catering, mess surplus, or fresh items with strict safety tracking.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs text-rose-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
        {/* Basic Food Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100 pb-2">
            1. Surplus Item Details
          </h3>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Food Item Name & Description *
            </label>
            <input
              type="text"
              required
              value={formData.foodName}
              onChange={(e) => setFormData({ ...formData, foodName: e.target.value })}
              placeholder="e.g. Basmati Rice, Paneer Curry & Naan Trays (Hotel Buffet Surplus)"
              className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Food Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="COOKED_MEALS">Cooked Meals (Hot/Prepared)</option>
                <option value="BAKERY_AND_BREAD">Bakery & Bread</option>
                <option value="FRESH_PRODUCE">Fresh Produce (Fruits/Vegetables)</option>
                <option value="DAIRY_AND_EGGS">Dairy & Eggs</option>
                <option value="PREPARED_SALADS">Prepared Cold Salads</option>
                <option value="PACKAGED_PANTRY">Packaged / Shelf-Stable Pantry</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  required
                  value={formData.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, quantity: val, estimatedKg: val });
                  }}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="kg">kg</option>
                  <option value="meals">meals</option>
                  <option value="boxes">boxes</option>
                  <option value="portions">portions</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Safety & Storage */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100 pb-2">
            2. Temperature & Critical Safety Windows
          </h3>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-stone-500" />
              <span>Storage & Temperature Requirement *</span>
            </label>
            <select
              value={formData.storageRequirement}
              onChange={(e) => setFormData({ ...formData, storageRequirement: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
            >
              <option value="HOT_HELD_ABOVE_60C">Hot-Held (&gt;60°C) — Commercial thermal carrier required (Max 45m transit)</option>
              <option value="REFRIGERATED_0_4C">Refrigerated (0°C to 4°C) — Insulated cold box / cooler required</option>
              <option value="FROZEN_BELOW_MINUS_18C">Frozen (&lt;-18°C) — Deep freeze carrier</option>
              <option value="ROOM_TEMPERATURE">Ambient / Room Temperature (Shelf-stable)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                <span>Prepared Time</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.preparedAt}
                onChange={(e) => setFormData({ ...formData, preparedAt: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Collection Deadline (Available Until) *</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.availableUntil}
                onChange={(e) => setFormData({ ...formData, availableUntil: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Allergens and Dietary */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-stone-700">Allergen Declarations</label>
            <div className="flex flex-wrap gap-2">
              {availableAllergens.map((item) => {
                const isSelected = formData.allergens.includes(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggleAllergen(item)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-stone-700">Dietary Badges</label>
            <div className="flex flex-wrap gap-2">
              {availableDietary.map((item) => {
                const isSelected = formData.dietaryTags.includes(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggleDietary(item)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pickup Location */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100 pb-2">
            3. Logistics & Loading Dock
          </h3>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-500" />
              <span>Pickup Street Address & Dock Number *</span>
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Courier Access Instructions
            </label>
            <input
              type="text"
              value={formData.pickupInstructions}
              onChange={(e) => setFormData({ ...formData, pickupInstructions: e.target.value })}
              placeholder="e.g. Ring Bell at Dock B; Ask for Sous Chef Marcus"
              className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Food Safety Declaration Certification */}
        <div className="bg-emerald-50/80 border border-emerald-300/80 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="safetyCheck"
              checked={formData.safetyChecklistPassed}
              onChange={(e) => setFormData({ ...formData, safetyChecklistPassed: e.target.checked })}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
            />
            <label htmlFor="safetyCheck" className="text-xs text-emerald-950 font-medium leading-relaxed">
              <strong>Mandatory Food Safety Certification:</strong> I certify that this surplus food was prepared under licensed hygienic commercial conditions, has been kept continuously under appropriate temperature controls (HACCP), and has not been contaminated or served to individuals.
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
          <Link
            href="/donations"
            className="text-xs px-4 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <PackagePlus className="w-4 h-4" />
            <span>{submitting ? 'Registering Surplus...' : 'Create Surplus Listing'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
