import {
  UserProfile,
  Organization,
  DonationItem,
  Assignment,
  WorkflowEvent,
  AuditLogEntry,
  MatchRecommendation,
  SurplusForecast,
  UserRole,
} from '../types';
import {
  SEED_USERS,
  SEED_ORGANIZATIONS,
  SEED_DONATIONS,
  SEED_ASSIGNMENTS,
  SEED_WORKFLOW_EVENTS,
  SEED_AUDIT_LOGS,
  SEED_FORECASTS,
} from './seedData';

// Global singleton in Node to persist across Next.js Hot Module Reloading (HMR)
interface AppDatabase {
  users: Map<string, UserProfile>;
  organizations: Map<string, Organization>;
  donations: Map<string, DonationItem>;
  assignments: Map<string, Assignment>;
  matchRecommendations: Map<string, MatchRecommendation[]>; // donationId -> MatchRecommendation[]
  workflowEvents: WorkflowEvent[];
  auditLogs: AuditLogEntry[];
  forecasts: Map<string, SurplusForecast>;
  processedIdempotencyKeys: Set<string>;
}

declare global {
  // eslint-disable-next-line no-var
  var __rescueGridDb: AppDatabase | undefined;
}

function initializeDatabase(): AppDatabase {
  const db: AppDatabase = {
    users: new Map(),
    organizations: new Map(),
    donations: new Map(),
    assignments: new Map(),
    matchRecommendations: new Map(),
    workflowEvents: [...SEED_WORKFLOW_EVENTS],
    auditLogs: [...SEED_AUDIT_LOGS],
    forecasts: new Map(),
    processedIdempotencyKeys: new Set(['idemp_seed_asg_1', 'idemp_seed_asg_2', 'idemp_seed_asg_delivered_1']),
  };

  SEED_USERS.forEach(u => db.users.set(u.id, { ...u }));
  SEED_ORGANIZATIONS.forEach(o => db.organizations.set(o.id, { ...o }));
  SEED_DONATIONS.forEach(d => db.donations.set(d.id, { ...d }));
  SEED_ASSIGNMENTS.forEach(a => db.assignments.set(a.id, { ...a }));
  SEED_FORECASTS.forEach(f => db.forecasts.set(f.id, { ...f }));

  return db;
}

export function getDb(): AppDatabase {
  if (!global.__rescueGridDb) {
    global.__rescueGridDb = initializeDatabase();
  }
  return global.__rescueGridDb;
}

export function resetDb(): void {
  global.__rescueGridDb = initializeDatabase();
}

// -------------------------------------------------------------
// Database Repository Methods
// -------------------------------------------------------------

export const dbRepository = {
  // Users
  getUserById(id: string): UserProfile | undefined {
    return getDb().users.get(id);
  },
  listUsers(): UserProfile[] {
    return Array.from(getDb().users.values());
  },

  // Organizations
  getOrgById(id: string): Organization | undefined {
    return getDb().organizations.get(id);
  },
  listOrganizations(filterType?: string): Organization[] {
    const orgs = Array.from(getDb().organizations.values());
    if (filterType) {
      return orgs.filter(o => o.organizationType === filterType);
    }
    return orgs;
  },
  updateOrg(id: string, updates: Partial<Organization>): Organization | undefined {
    const org = getDb().organizations.get(id);
    if (!org) return undefined;
    const updated = { ...org, ...updates };
    getDb().organizations.set(id, updated);
    return updated;
  },

  // Donations
  getDonationById(id: string): DonationItem | undefined {
    return getDb().donations.get(id);
  },
  listDonations(filters?: { status?: string; donorId?: string; donorOrgId?: string }): DonationItem[] {
    let list = Array.from(getDb().donations.values());
    if (filters?.status) {
      list = list.filter(d => d.status === filters.status);
    }
    if (filters?.donorId) {
      list = list.filter(d => d.donorId === filters.donorId);
    }
    if (filters?.donorOrgId) {
      list = list.filter(d => d.donorOrgId === filters.donorOrgId);
    }
    // Return newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  createDonation(item: Omit<DonationItem, 'id' | 'createdAt' | 'updatedAt'>): DonationItem {
    const id = `don_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const created: DonationItem = {
      ...item,
      id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    getDb().donations.set(id, created);
    
    // Log workflow event
    this.addWorkflowEvent({
      workflowId: id,
      donationId: id,
      eventType: 'DONATION_CREATED',
      actorId: item.donorId,
      actorRole: 'DONOR',
      newStatus: created.status,
      metadata: { foodName: item.foodName, quantity: item.quantity, unit: item.unit },
    });

    // Log audit log
    this.addAuditLog({
      actorId: item.donorId,
      actorRole: 'DONOR',
      action: 'CREATE_DONATION',
      resourceType: 'DONATION',
      resourceId: id,
      outcome: 'SUCCESS',
      details: { foodName: item.foodName, estimatedKg: item.estimatedKg },
    });

    return created;
  },
  updateDonation(id: string, updates: Partial<DonationItem>): DonationItem | undefined {
    const item = getDb().donations.get(id);
    if (!item) return undefined;
    const updated: DonationItem = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    getDb().donations.set(id, updated);
    return updated;
  },

  // Match Recommendations
  getRecommendationsForDonation(donationId: string): MatchRecommendation[] {
    return getDb().matchRecommendations.get(donationId) || [];
  },
  saveRecommendationsForDonation(donationId: string, recs: MatchRecommendation[]): void {
    getDb().matchRecommendations.set(donationId, recs);
  },

  // Assignments
  getAssignmentById(id: string): Assignment | undefined {
    return getDb().assignments.get(id);
  },
  getAssignmentByDonationId(donationId: string): Assignment | undefined {
    const all = Array.from(getDb().assignments.values());
    return all.find(a => a.donationId === donationId);
  },
  listAssignments(filters?: { status?: string; recipientId?: string; volunteerId?: string }): Assignment[] {
    let list = Array.from(getDb().assignments.values());
    if (filters?.status) {
      list = list.filter(a => a.status === filters.status);
    }
    if (filters?.recipientId) {
      list = list.filter(a => a.recipientId === filters.recipientId);
    }
    if (filters?.volunteerId) {
      list = list.filter(a => a.volunteerId === filters.volunteerId);
    }
    return list.sort((a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime());
  },
  createAssignment(data: Omit<Assignment, 'id'>): Assignment {
    const id = `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const created: Assignment = {
      ...data,
      id,
    };
    getDb().assignments.set(id, created);
    getDb().processedIdempotencyKeys.add(data.idempotencyKey);
    return created;
  },
  updateAssignment(id: string, updates: Partial<Assignment>): Assignment | undefined {
    const item = getDb().assignments.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...updates };
    getDb().assignments.set(id, updated);
    return updated;
  },

  // Idempotency
  isIdempotencyKeyUsed(key: string): boolean {
    return getDb().processedIdempotencyKeys.has(key);
  },
  registerIdempotencyKey(key: string): void {
    getDb().processedIdempotencyKeys.add(key);
  },

  // Workflow Events
  addWorkflowEvent(event: Omit<WorkflowEvent, 'id' | 'timestamp'>): WorkflowEvent {
    const id = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created: WorkflowEvent = {
      ...event,
      id,
      timestamp: new Date().toISOString(),
    };
    getDb().workflowEvents.unshift(created);
    return created;
  },
  listWorkflowEvents(workflowId?: string, limit = 50): WorkflowEvent[] {
    if (workflowId) {
      return getDb().workflowEvents.filter(e => e.workflowId === workflowId || e.donationId === workflowId).slice(0, limit);
    }
    return getDb().workflowEvents.slice(0, limit);
  },

  // Audit Logs
  addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created: AuditLogEntry = {
      ...entry,
      id,
      timestamp: new Date().toISOString(),
    };
    getDb().auditLogs.unshift(created);
    return created;
  },
  listAuditLogs(limit = 100): AuditLogEntry[] {
    return getDb().auditLogs.slice(0, limit);
  },

  // Forecasts
  listForecasts(donorOrgId?: string): SurplusForecast[] {
    const list = Array.from(getDb().forecasts.values());
    if (donorOrgId) {
      return list.filter(f => f.donorOrgId === donorOrgId);
    }
    return list;
  },
  saveForecast(forecast: SurplusForecast): void {
    getDb().forecasts.set(forecast.id, forecast);
  },
};
