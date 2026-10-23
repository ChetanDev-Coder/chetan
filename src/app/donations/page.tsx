'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/components/RoleContext';
import { StatusBadge } from '@/components/StatusBadge';
import {
  PackagePlus,
  Search,
  Filter,
  Clock,
  Building,
  MapPin,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Thermometer,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { DonationItem, DonationStatus } from '@/lib/types';

export default function DonationsPage() {
  const { currentRole, currentUser } = useRole();
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [currentTime, setCurrentTime] = useState<number>(0);

  const fetchDonations = async () => {
    setLoading(true);
    setCurrentTime(Date.now());
    try {
      const res = await fetch('/api/donations');
      const data = await res.json();
      if (data.success) {
        setDonations(data.donations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const now = currentTime || 0;

  const filteredDonations = donations.filter((d) => {
    const matchesSearch =
      d.foodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.donorOrgName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || d.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Surplus Food Listings</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Verified inventory of commercial food surplus ready for redistribution.
          </p>
        </div>

        <Link
          href="/donations/new"
          className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all shrink-0 self-start sm:self-auto"
        >
          <PackagePlus className="w-4 h-4" />
          <span>New Surplus Listing</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by food description or donor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="MATCHING">Matching</option>
            <option value="PROPOSED">Proposed</option>
            <option value="APPROVED">Approved</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PICKUP_CONFIRMED">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="DECLINED">Declined</option>
            <option value="RECOVERY_PENDING">Recovery Active</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="COOKED_MEALS">Cooked Meals</option>
            <option value="BAKERY_AND_BREAD">Bakery & Bread</option>
            <option value="FRESH_PRODUCE">Fresh Produce</option>
            <option value="DAIRY_AND_EGGS">Dairy & Eggs</option>
            <option value="PREPARED_SALADS">Prepared Salads</option>
            <option value="PACKAGED_PANTRY">Packaged Pantry</option>
          </select>
        </div>
      </div>

      {/* Grid of Donations */}
      {loading ? (
        <div className="text-center py-12">
          <RotateCcw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-500">Loading surplus listings...</p>
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <PackagePlus className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-stone-700">No matching surplus listings found</h3>
          <p className="text-xs text-stone-500 mt-1">Try adjusting your search terms or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonations.map((d) => {
            const hoursLeft = Number(
              ((new Date(d.availableUntil).getTime() - now) / (1000 * 3600)).toFixed(1)
            );
            const isUrgent = hoursLeft > 0 && hoursLeft <= 3 && !['DELIVERED', 'CANCELLED', 'EXPIRED'].includes(d.status);

            return (
              <div
                key={d.id}
                className={`bg-white rounded-xl border transition-all hover:shadow-md flex flex-col justify-between p-5 ${
                  isUrgent ? 'border-amber-400 ring-1 ring-amber-200' : 'border-stone-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                      {d.category.replace(/_/g, ' ')}
                    </span>
                    <StatusBadge status={d.status} size="sm" />
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-stone-900 leading-snug">{d.foodName}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                      <Building className="w-3.5 h-3.5 text-stone-400" />
                      <span>{d.donorOrgName}</span>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Declared Quantity:</span>
                      <span className="font-bold text-stone-800">
                        {d.quantity} {d.unit} (~{d.estimatedKg} kg)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Storage Req:</span>
                      <span className="font-mono text-[11px] text-stone-700 font-medium">
                        {d.storageRequirement}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Time to Expiry:</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          hoursLeft <= 3 ? 'text-amber-700 font-bold' : 'text-stone-700'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{hoursLeft > 0 ? `${hoursLeft} hours` : 'Expired'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Dietary / Allergens Badges */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {d.dietaryTags?.map((tag) => (
                      <span key={tag} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                    {d.allergens?.map((alg) => (
                      <span key={alg} className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                        Contains: {alg}
                      </span>
                    ))}
                  </div>

                  <div className="text-[11px] text-stone-500 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <span className="truncate">{d.pickupLocation.address}</span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/matching/${d.id}`}
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold py-1.5 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Run Matcher</span>
                  </Link>

                  <Link
                    href="/routes"
                    className="p-1.5 text-stone-500 hover:text-stone-900 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                    title="View Safe Transit Route"
                  >
                    <MapPin className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
