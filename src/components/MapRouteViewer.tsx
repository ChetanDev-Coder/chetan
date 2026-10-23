'use client';

import React from 'react';
import { RouteDetail } from '@/lib/types';
import { MapPin, Navigation, Clock, ShieldCheck, AlertCircle, Compass, Zap } from 'lucide-react';

interface MapRouteViewerProps {
  route?: RouteDetail | null;
  originName?: string;
  destinationName?: string;
  foodCategory?: string;
  storageReq?: string;
  isSafeForPerishable?: boolean;
}

export function MapRouteViewer({
  route,
  originName = 'Donor Pickup Location',
  destinationName = 'Recipient Distribution Center',
  foodCategory = 'COOKED_MEALS',
  storageReq = 'HOT_HELD_ABOVE_60C',
  isSafeForPerishable = true,
}: MapRouteViewerProps) {
  if (!route) {
    return (
      <div className="bg-stone-50 rounded-xl border border-dashed border-stone-300 p-8 text-center">
        <Compass className="w-8 h-8 text-stone-400 mx-auto mb-2 animate-spin-slow" />
        <h4 className="text-sm font-semibold text-stone-700">No Route Selected</h4>
        <p className="text-xs text-stone-500 mt-1">Select an active donation or assignment to compute safe transit routing.</p>
      </div>
    );
  }

  // Calculate SVG projection coordinates from lat/lng
  const minLat = Math.min(route.origin.lat, route.destination.lat) - 0.01;
  const maxLat = Math.max(route.origin.lat, route.destination.lat) + 0.01;
  const minLng = Math.min(route.origin.lng, route.destination.lng) - 0.01;
  const maxLng = Math.max(route.origin.lng, route.destination.lng) + 0.01;

  const latSpan = maxLat - minLat || 0.02;
  const lngSpan = maxLng - minLng || 0.02;

  // Project lat/lng to SVG 0-100%
  const projectX = (lng: number) => ((lng - minLng) / lngSpan) * 80 + 10;
  const projectY = (lat: number) => 90 - ((lat - minLat) / latSpan) * 80;

  const originX = projectX(route.origin.lng);
  const originY = projectY(route.origin.lat);
  const destX = projectX(route.destination.lng);
  const destY = projectY(route.destination.lat);

  // Generate SVG path through waypoints
  const pathD = route.waypoints.reduce((acc, pt, idx) => {
    const x = projectX(pt[1]);
    const y = projectY(pt[0]);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
      {/* Route Header Info */}
      <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900 text-sm">Rescue Transit Route</span>
            {route.isRealRoutesApi ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600" />
                <span>Google Maps Routes API (Live Traffic)</span>
              </span>
            ) : (
              <span className="bg-stone-200 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded border border-stone-300 flex items-center gap-1">
                <Compass className="w-3 h-3 text-stone-600" />
                <span>Deterministic Road Model (1.32x Circuity)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {originName} ➔ {destinationName}
          </p>
        </div>

        {/* Food safety status pill */}
        <div>
          {isSafeForPerishable ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Safe Food Transit Window</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Exceeds Critical Safe Window</span>
            </span>
          )}
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="relative bg-[#f8f9fa] h-72 w-full overflow-hidden border-b border-stone-200">
        {/* Subtle grid pattern representing urban map terrain */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#15803d 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Street outline lines in background */}
          <line x1="5" y1="30" x2="95" y2="30" stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="2,2" />
          <line x1="15" y1="70" x2="85" y2="70" stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="2,2" />
          <line x1="40" y1="5" x2="40" y2="95" stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="2,2" />

          {/* Planned transit route path */}
          <path
            d={pathD}
            fill="none"
            stroke="#0d9488"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />

          {/* Animated pulsing dash for in-transit simulation */}
          <path
            d={pathD}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
            strokeDasharray="2,4"
            className="animate-pulse"
          />

          {/* Origin Marker (Donor) */}
          <circle cx={originX} cy={originY} r="3.5" fill="#15803d" stroke="#ffffff" strokeWidth="1.2" />
          <circle cx={originX} cy={originY} r="7" fill="#15803d" opacity="0.2" className="animate-ping" />

          {/* Destination Marker (Recipient) */}
          <circle cx={destX} cy={destY} r="3.5" fill="#dc2626" stroke="#ffffff" strokeWidth="1.2" />
        </svg>

        {/* Floating Pins & Labels */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{ left: `${originX}%`, top: `${originY}%` }}
        >
          <div className="bg-emerald-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>PICKUP</span>
          </div>
        </div>

        <div
          className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{ left: `${destX}%`, top: `${destY}%` }}
        >
          <div className="bg-red-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-300"></span>
            <span>RECIPIENT</span>
          </div>
        </div>

        {/* Waypoints Counter */}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono text-stone-600 border border-stone-200">
          Waypoints: {route.waypoints.length} | Lat/Lng Range: ({route.origin.lat.toFixed(3)}, {route.origin.lng.toFixed(3)})
        </div>
      </div>

      {/* Route Key Performance Metrics */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white text-xs">
        <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
          <div className="text-stone-500 flex items-center gap-1 text-[11px]">
            <Navigation className="w-3 h-3 text-teal-600" />
            <span>Transit Distance</span>
          </div>
          <div className="text-base font-bold text-stone-900 mt-1">
            {route.distanceKm} <span className="text-xs font-normal text-stone-500">km</span>
          </div>
        </div>

        <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
          <div className="text-stone-500 flex items-center gap-1 text-[11px]">
            <Clock className="w-3 h-3 text-emerald-600" />
            <span>Estimated Duration</span>
          </div>
          <div className="text-base font-bold text-stone-900 mt-1">
            {route.durationMinutes} <span className="text-xs font-normal text-stone-500">mins</span>
          </div>
        </div>

        <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
          <div className="text-stone-500 flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            <span>CO2 Saved (Delivery)</span>
          </div>
          <div className="text-base font-bold text-stone-900 mt-1">
            {route.estimatedCo2SavedKg} <span className="text-xs font-normal text-stone-500">kg CO2e</span>
          </div>
        </div>

        <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
          <div className="text-stone-500 flex items-center gap-1 text-[11px]">
            <MapPin className="w-3 h-3 text-amber-600" />
            <span>Traffic Condition</span>
          </div>
          <div className="text-xs font-bold text-stone-900 mt-1.5 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                route.trafficCondition === 'LIGHT'
                  ? 'bg-emerald-500'
                  : route.trafficCondition === 'MODERATE'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
            />
            <span>{route.trafficCondition} TRAFFIC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
