'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from './RoleContext';
import {
  Shield,
  LayoutDashboard,
  PackagePlus,
  GitBranch,
  MapPin,
  ClipboardList,
  Cpu,
  BarChart3,
  SlidersHorizontal,
  UserCheck,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { UserRole } from '@/lib/types';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, currentRole, allUsers, switchUser } = useRole();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/donations', label: 'Donations', icon: PackagePlus },
    { href: '/matching', label: 'AI Matching', icon: GitBranch },
    { href: '/routes', label: 'Routes & Safety', icon: MapPin },
    { href: '/assignments', label: 'Assignments', icon: ClipboardList },
    { href: '/agents', label: 'Agentic Hub', icon: Cpu },
    { href: '/analytics', label: 'Impact Analytics', icon: BarChart3 },
    { href: '/admin', label: 'Admin & Audit', icon: SlidersHorizontal },
  ];

  const roleColors: Record<UserRole, { badge: string; text: string }> = {
    COORDINATOR: { badge: 'bg-emerald-100 border-emerald-300 text-emerald-900', text: 'text-emerald-700' },
    DONOR: { badge: 'bg-blue-100 border-blue-300 text-blue-900', text: 'text-blue-700' },
    RECIPIENT: { badge: 'bg-amber-100 border-amber-300 text-amber-900', text: 'text-amber-700' },
    VOLUNTEER: { badge: 'bg-purple-100 border-purple-300 text-purple-900', text: 'text-purple-700' },
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-stone-900 tracking-tight">RescueGrid</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300/80">AI</span>
              </div>
              <span className="text-[10px] text-stone-500 font-medium tracking-wide block -mt-1">
                Autonomous Food Rescue Grid
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200/60'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-stone-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Role Switcher Dropdown */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors text-xs text-left"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
                  {currentUser.displayName.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="font-semibold text-stone-800 flex items-center gap-1">
                    <span>{currentUser.displayName.split(' ')[0]}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${roleColors[currentRole].badge}`}>
                      {currentRole}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-stone-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-2 border-b border-stone-100 mb-1">
                    <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                      Demo Role Switcher
                    </p>
                    <p className="text-xs text-stone-600">
                      Instantly switch personas to test permissions and workflows:
                    </p>
                  </div>

                  <div className="space-y-1">
                    {allUsers.map((user) => {
                      const isSelected = user.id === currentUser.id;
                      return (
                        <button
                          key={user.id}
                          onClick={() => {
                            switchUser(user.id);
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-[10px] text-stone-500">{user.email}</div>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${roleColors[user.role].badge}`}>
                            {user.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Links */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-4 py-3 space-y-1 shadow-lg">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-stone-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
