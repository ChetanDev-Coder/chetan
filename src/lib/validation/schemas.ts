import { z } from 'zod';

export const FoodCategoryEnum = z.enum([
  'COOKED_MEALS',
  'FRESH_PRODUCE',
  'DAIRY_AND_EGGS',
  'BAKERY_AND_BREAD',
  'PACKAGED_PANTRY',
  'PREPARED_SALADS',
]);

export const StorageRequirementEnum = z.enum([
  'ROOM_TEMPERATURE',
  'REFRIGERATED_0_4C',
  'FROZEN_BELOW_MINUS_18C',
  'HOT_HELD_ABOVE_60C',
]);

export const GeoLocationSchema = z.object({
  address: z.string().min(5, 'Address must be at least 5 characters'),
  neighborhood: z.string().min(2, 'Neighborhood required'),
  city: z.string().min(2, 'City required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const CreateDonationSchema = z.object({
  donorId: z.string().min(1, 'Donor ID is required'),
  donorOrgId: z.string().min(1, 'Donor Org ID is required'),
  donorName: z.string().min(2, 'Donor name is required'),
  donorOrgName: z.string().min(2, 'Donor organization name is required'),
  foodName: z.string().min(3, 'Food description must be at least 3 characters').max(100),
  category: FoodCategoryEnum,
  quantity: z.number().positive('Quantity must be greater than 0').max(10000, 'Single batch exceeds max capacity limit'),
  unit: z.enum(['kg', 'meals', 'boxes', 'portions']),
  estimatedKg: z.number().positive('Estimated weight must be greater than 0'),
  preparedAt: z.string().datetime({ message: 'Must be valid ISO datetime string' }),
  availableUntil: z.string().datetime({ message: 'Must be valid ISO datetime string' }),
  storageRequirement: StorageRequirementEnum,
  allergens: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
  pickupLocation: GeoLocationSchema,
  pickupInstructions: z.string().max(300).optional(),
  safetyChecklistPassed: z.boolean().refine(val => val === true, {
    message: 'Food safety declaration checklist must be acknowledged and passed',
  }),
  notes: z.string().max(500).optional(),
}).refine(data => {
  const prepared = new Date(data.preparedAt).getTime();
  const availableUntil = new Date(data.availableUntil).getTime();
  // Safe window must be positive
  return availableUntil > prepared;
}, {
  message: 'Available-until deadline must be after preparation time',
  path: ['availableUntil'],
}).refine(data => {
  const now = Date.now();
  const availableUntil = new Date(data.availableUntil).getTime();
  // Deadline must not already be in the past
  return availableUntil > now - 1000 * 60; // 1 min buffer
}, {
  message: 'Donation collection deadline cannot be in the past',
  path: ['availableUntil'],
});

export const MatchRequestSchema = z.object({
  donationId: z.string().min(1, 'Donation ID is required'),
  maxRadiusKm: z.number().positive().max(50).default(25),
  maxCandidates: z.number().int().min(1).max(10).default(5),
  forceDeterministicFallback: z.boolean().optional().default(false),
});

export const ProposeAssignmentSchema = z.object({
  donationId: z.string().min(1),
  recipientId: z.string().min(1),
  volunteerId: z.string().optional(),
  idempotencyKey: z.string().min(8, 'Idempotency key required (minimum 8 chars)'),
});

export const ApproveAssignmentSchema = z.object({
  assignmentId: z.string().min(1),
  actorId: z.string().min(1),
  actorRole: z.enum(['COORDINATOR']),
  idempotencyKey: z.string().min(8),
  notes: z.string().optional(),
});

export const AcceptAssignmentSchema = z.object({
  assignmentId: z.string().min(1),
  actorId: z.string().min(1),
  actorRole: z.enum(['RECIPIENT']),
  idempotencyKey: z.string().min(8),
});

export const DeclineAssignmentSchema = z.object({
  assignmentId: z.string().min(1),
  actorId: z.string().min(1),
  actorRole: z.enum(['RECIPIENT', 'COORDINATOR']),
  reason: z.string().min(5, 'Reason for decline must be at least 5 characters'),
  triggerAutoRecovery: z.boolean().default(true),
});

export const ConfirmPickupSchema = z.object({
  assignmentId: z.string().min(1),
  actorId: z.string().min(1),
  actorRole: z.enum(['VOLUNTEER', 'COORDINATOR']),
  pickupNotes: z.string().max(300).optional(),
  verificationMethod: z.enum(['DIGITAL_SCALE_RECEIPT', 'VOLUNTEER_SIGNATURE', 'PHOTO_CONFIRMATION']),
  confirmedTempCelsius: z.number().optional(),
});

export const ConfirmDeliverySchema = z.object({
  assignmentId: z.string().min(1),
  actorId: z.string().min(1),
  actorRole: z.enum(['VOLUNTEER', 'RECIPIENT', 'COORDINATOR']),
  actualQuantityDeliveredKg: z.number().positive('Delivered quantity must be greater than 0'),
  deliveryNotes: z.string().max(300).optional(),
  recipientSigneeName: z.string().min(2, 'Signee recipient name is required'),
});

export const TriggerRecoverySchema = z.object({
  assignmentId: z.string().min(1),
  actorId: z.string().min(1),
  reason: z.string().min(5),
});

export const ForecastRequestSchema = z.object({
  donorOrgId: z.string().min(1),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  mealSlot: z.enum(['LUNCH', 'DINNER', 'BUFFET_CLOSURE', 'EVENT_EXTRA']),
  expectedHeadcount: z.number().positive().optional(),
  isHolidayOrEvent: z.boolean().default(false),
});
