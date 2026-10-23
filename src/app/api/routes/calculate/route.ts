import { NextResponse } from 'next/server';
import { RoutingAgent } from '@/lib/agents/routingAgent';
import { Security } from '@/lib/utils/security';
import { GeoLocationSchema, StorageRequirementEnum } from '@/lib/validation/schemas';
import { z } from 'zod';

const RouteCalcSchema = z.object({
  origin: GeoLocationSchema,
  destination: GeoLocationSchema,
  storageRequirement: StorageRequirementEnum.default('ROOM_TEMPERATURE'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = RouteCalcSchema.parse(body);

    const assessment = await RoutingAgent.planRoute(
      validated.origin,
      validated.destination,
      validated.storageRequirement
    );

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (err) {
    return Security.errorResponse(err, 400);
  }
}
