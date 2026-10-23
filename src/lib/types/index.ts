export type UserRole = 'DONOR' | 'RECIPIENT' | 'VOLUNTEER' | 'COORDINATOR';

export interface UserProfile {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  organizationId?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
}

export type OrganizationType = 
  | 'DONOR_BUSINESS'
  | 'COMMUNITY_KITCHEN'
  | 'FOOD_BANK'
  | 'SHELTER'
  | 'STUDENT_PANTRY'
  | 'RELIEF_CENTER';

export type FoodCategory =
  | 'COOKED_MEALS'
  | 'FRESH_PRODUCE'
  | 'DAIRY_AND_EGGS'
  | 'BAKERY_AND_BREAD'
  | 'PACKAGED_PANTRY'
  | 'PREPARED_SALADS';

export type StorageRequirement =
  | 'ROOM_TEMPERATURE'
  | 'REFRIGERATED_0_4C'
  | 'FROZEN_BELOW_MINUS_18C'
  | 'HOT_HELD_ABOVE_60C';

export interface GeoLocation {
  address: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
}

export interface Organization {
  id: string;
  name: string;
  organizationType: OrganizationType;
  verifiedStatus: boolean;
  location: GeoLocation;
  supportedFoodCategories: FoodCategory[];
  supportedStorage: StorageRequirement[];
  capacityKg: number;
  currentDailyLoadKg: number;
  operationalHours: {
    startHour: number; // e.g. 8 for 08:00
    endHour: number;   // e.g. 21 for 21:00
    activeDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  };
  contactPreferences: {
    email: string;
    phone: string;
    smsAlerts: boolean;
    autoAcceptUnderKg?: number;
  };
  rating: number; // 1-5 scale reliability
  totalRescuedKg: number;
}

export type DonationStatus =
  | 'AVAILABLE'
  | 'MATCHING'
  | 'PROPOSED'
  | 'APPROVED'
  | 'ACCEPTED'
  | 'PICKUP_CONFIRMED'
  | 'DELIVERED'
  | 'DECLINED'
  | 'RECOVERY_PENDING'
  | 'CANCELLED'
  | 'FAILED'
  | 'EXPIRED';

export interface DonationItem {
  id: string;
  donorId: string;
  donorOrgId: string;
  donorName: string;
  donorOrgName: string;
  foodName: string;
  category: FoodCategory;
  quantity: number;
  unit: 'kg' | 'meals' | 'boxes' | 'portions';
  estimatedKg: number;
  preparedAt: string; // ISO string
  availableUntil: string; // ISO string
  storageRequirement: StorageRequirement;
  allergens: string[];
  dietaryTags: string[]; // 'Vegetarian', 'Vegan', 'Halal', 'Nut-Free', etc.
  pickupLocation: GeoLocation;
  pickupInstructions?: string;
  status: DonationStatus;
  safetyChecklistPassed: boolean;
  notes?: string;
  currentAssignmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConstraintCheckResult {
  constraintName: string;
  passed: boolean;
  explanation: string;
  isHardRule: boolean;
}

export interface MatchRecommendation {
  id: string;
  donationId: string;
  recipientId: string;
  recipientName: string;
  score: number; // 0 - 100
  scoreBreakdown: {
    distanceScore: number;    // weight 25%
    capacityScore: number;    // weight 25%
    urgencyScore: number;     // weight 20%
    reliabilityScore: number; // weight 15%
    priorityNeedScore: number;// weight 15%
  };
  distanceKm: number;
  estimatedTransitMinutes: number;
  reasons: string[];
  disqualificationReasons?: string[];
  constraintResults: ConstraintCheckResult[];
  modelVersion: string;
  isAiRanked: boolean;
  createdAt: string;
}

export type AssignmentStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'ACCEPTED'
  | 'PICKUP_CONFIRMED'
  | 'DELIVERED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'FAILED';

export interface Assignment {
  id: string;
  donationId: string;
  recipientId: string;
  volunteerId?: string;
  volunteerName?: string;
  status: AssignmentStatus;
  proposedAt: string;
  approvedAt?: string;
  approvedByActorId?: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  pickupConfirmedAt?: string;
  pickupNotes?: string;
  deliveredAt?: string;
  deliveryNotes?: string;
  verificationMethod?: 'DIGITAL_SCALE_RECEIPT' | 'VOLUNTEER_SIGNATURE' | 'PHOTO_CONFIRMATION';
  actualQuantityDeliveredKg?: number;
  discrepancyKg?: number;
  idempotencyKey: string;
  recoveryAttemptCount: number;
  previousAssignmentId?: string;
}

export interface WorkflowEvent {
  id: string;
  workflowId: string; // usually assignmentId or donationId
  donationId: string;
  eventType: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole | 'SYSTEM_AGENT';
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: UserRole | 'SYSTEM_AGENT';
  action: string;
  resourceType: 'DONATION' | 'ASSIGNMENT' | 'MATCH' | 'RECOVERY' | 'SECURITY';
  resourceId: string;
  timestamp: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED' | 'RECOVERED';
  ipAddress?: string;
  details?: Record<string, unknown>;
}

export interface RouteDetail {
  origin: GeoLocation;
  destination: GeoLocation;
  distanceKm: number;
  durationMinutes: number;
  estimatedCo2SavedKg: number;
  waypoints: [number, number][]; // [lat, lng] array
  isRealRoutesApi: boolean;
  routeSummary: string;
  trafficCondition: 'LIGHT' | 'MODERATE' | 'HEAVY';
}

export interface SurplusForecast {
  id: string;
  donorOrgId: string;
  donorOrgName: string;
  dayOfWeek: string;
  mealTimeSlot: 'LUNCH' | 'DINNER' | 'BUFFET_CLOSURE' | 'EVENT_EXTRA';
  predictedSurplusKg: number;
  uncertaintyRangeKg: [number, number]; // [min, max]
  confidenceScore: number; // 0 - 1.0
  keyFactors: string[];
  deterministicBaselineKg: number;
  isAiGenerated: boolean;
  modelVersion: string;
  historicalSampleSize: number;
  createdAt: string;
}

export interface ImpactMetrics {
  totalEligibleDonations: number;
  verifiedDeliveredKg: number;
  estimatedDonatedKg: number;
  discrepancyRatePercent: number;
  mealsDeliveredCount: number; // std 0.42kg/meal
  co2EmissionsPreventedKg: number; // 2.5 kg CO2e / kg food
  redistributionSuccessRate: number; // percentage
  averageAssignmentMinutes: number;
  failedAndRecoveredCount: number;
  activeRescuesNow: number;
  dataSourceLabels: {
    verifiedKg: 'MEASURED';
    mealsCount: 'ESTIMATED_STANDARD';
    co2Offset: 'ESTIMATED_EPA_WARM';
    routesTime: 'MEASURED_OR_SIMULATED';
  };
}
