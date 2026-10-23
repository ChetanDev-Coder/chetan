'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/components/RoleContext';
import {
  SlidersHorizontal,
  ShieldCheck,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  KeyRound,
  FileCode,
  UserCheck,
} from 'lucide-react';
import { AuditLogEntry, WorkflowEvent, Organization } from '@/lib/types';

export default function AdminPage() {
  const { currentRole, allUsers } = useRole();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'audit' | 'orgs' | 'rules'>('audit');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [auditRes, sessRes] = await Promise.all([
        fetch('/api/audit?limit=50'),
        fetch('/api/auth/session'),
      ]);

      const [auditData, sessData] = await Promise.all([auditRes.json(), sessRes.json()]);

      if (auditData.success) {
        setAuditLogs(auditData.auditLogs || []);
        setWorkflowEvents(auditData.workflowEvents || []);
      }
      if (sessData.allOrganizations) {
        setOrganizations(sessData.allOrganizations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const toggleOrgVerification = (orgId: string) => {
    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, verifiedStatus: !o.verifiedStatus } : o))
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-800 text-xs px-2.5 py-1 rounded-full border border-stone-200 font-semibold mb-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-stone-600" />
            <span>Governance & Security Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Compliance & Security Audit Log</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Cryptographically timestamped audit trail of all role mutations, approvals, and recovery workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold">
            Role: {currentRole}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'audit'
              ? 'bg-emerald-800 text-white'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          Audit Event Logs ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('orgs')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'orgs'
              ? 'bg-emerald-800 text-white'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          Organization Verification ({organizations.length})
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'rules'
              ? 'bg-emerald-800 text-white'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          Firestore Security Rules
        </button>
      </div>

      {/* Tab 1: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500">
              Immutable Action Log
            </h3>
            <span className="text-[11px] text-stone-400">Total Entries: {auditLogs.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 border-b border-stone-100 text-[11px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor / Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3">Outcome</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                {auditLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-stone-50/70">
                    <td className="p-3 text-stone-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-3 font-semibold text-stone-800 whitespace-nowrap">
                      <span className="bg-stone-100 px-1.5 py-0.5 rounded mr-1 text-[10px]">
                        {entry.actorRole}
                      </span>
                      <span>{entry.actorId}</span>
                    </td>
                    <td className="p-3 font-bold text-emerald-800 whitespace-nowrap">{entry.action}</td>
                    <td className="p-3 text-stone-600 whitespace-nowrap">
                      {entry.resourceType} : {entry.resourceId}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          entry.outcome === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : entry.outcome === 'RECOVERED'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {entry.outcome}
                      </span>
                    </td>
                    <td className="p-3 text-stone-500 max-w-xs truncate font-sans">
                      {JSON.stringify(entry.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Organizations Management */}
      {activeTab === 'orgs' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-sm text-stone-900">Partner Facility Verification</h3>
            <p className="text-xs text-stone-500">
              Only verified 501(c)(3) nonprofits or certified community kitchens pass Agent 2 deterministic eligibility filters.
            </p>
          </div>

          <div className="divide-y divide-stone-100">
            {organizations.map((org) => (
              <div key={org.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-stone-900">{org.name}</span>
                    <span className="font-mono text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded">
                      {org.organizationType}
                    </span>
                  </div>
                  <div className="text-stone-500 mt-0.5">
                    {org.location.address} • Daily Capacity: {org.capacityKg} kg • Rating: {org.rating}/5.00
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      org.verifiedStatus
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {org.verifiedStatus ? 'VERIFIED' : 'UNVERIFIED'}
                  </span>

                  <button
                    onClick={() => toggleOrgVerification(org.id)}
                    className="px-3 py-1.5 border border-stone-200 rounded-lg font-semibold hover:bg-stone-50 transition-colors"
                  >
                    Toggle Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Firestore Security Rules */}
      {activeTab === 'rules' && (
        <div className="bg-stone-900 text-stone-200 rounded-xl p-6 border border-stone-800 space-y-4 font-mono text-xs shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3 text-emerald-400">
            <div className="flex items-center gap-2 font-bold">
              <KeyRound className="w-4 h-4" />
              <span>Cloud Firestore Production Security Rules (firestore.rules)</span>
            </div>
            <span className="text-[10px] text-stone-400">Default Deny Authorization Model</span>
          </div>

          <p className="text-[11px] text-stone-400 font-sans">
            Enforced on the database level. Frontend visual controls are never considered sufficient security boundaries.
          </p>

          <pre className="bg-stone-950 p-4 rounded-lg overflow-x-auto text-[11px] text-emerald-300 leading-relaxed max-h-96">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Default deny all access
    match /{document=**} {
      allow read, write: if false;
    }

    // Organizations collection
    match /organizations/{orgId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'COORDINATOR';
    }

    // Donations collection
    match /donations/{donationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && (request.auth.token.role == 'DONOR' || request.auth.token.role == 'COORDINATOR')
        && request.resource.data.safetyChecklistPassed == true;
      allow update: if request.auth != null;
    }

    // Assignments collection
    match /assignments/{assignmentId} {
      allow read: if request.auth != null;
      allow create: if request.auth.token.role == 'COORDINATOR' || request.auth.token.role == 'DONOR';
      allow update: if request.auth != null; // Enforced via state machine
    }

    // Audit logs - append-only, never modifiable
    match /auditLogs/{logId} {
      allow read: if request.auth.token.role == 'COORDINATOR';
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}`}
          </pre>
        </div>
      )}
    </div>
  );
}
