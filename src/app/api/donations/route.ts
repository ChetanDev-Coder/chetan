import { NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db';
import { CreateDonationSchema } from '@/lib/validation/schemas';
import { Security } from '@/lib/utils/security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const donorId = searchParams.get('donorId') || undefined;
    const donorOrgId = searchParams.get('donorOrgId') || undefined;

    const donations = dbRepository.listDonations({ status, donorId, donorOrgId });
    return NextResponse.json({
      success: true,
      count: donations.length,
      donations,
    });
  } catch (err) {
    return Security.errorResponse(err, 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = Security.getAuthContext(request);
    Security.assertRole(auth, ['DONOR', 'COORDINATOR']);

    const body = await request.json();
    const validated = CreateDonationSchema.parse(body);

    const created = dbRepository.createDonation({
      donorId: validated.donorId,
      donorOrgId: validated.donorOrgId,
      donorName: validated.donorName,
      donorOrgName: validated.donorOrgName,
      foodName: validated.foodName,
      category: validated.category,
      quantity: validated.quantity,
      unit: validated.unit,
      estimatedKg: validated.estimatedKg,
      preparedAt: validated.preparedAt,
      availableUntil: validated.availableUntil,
      storageRequirement: validated.storageRequirement,
      allergens: validated.allergens,
      dietaryTags: validated.dietaryTags,
      pickupLocation: validated.pickupLocation,
      pickupInstructions: validated.pickupInstructions,
      status: 'AVAILABLE',
      safetyChecklistPassed: validated.safetyChecklistPassed,
      notes: validated.notes,
    });

    return NextResponse.json({
      success: true,
      donation: created,
    }, { status: 201 });
  } catch (err) {
    return Security.errorResponse(err, 400);
  }
}
