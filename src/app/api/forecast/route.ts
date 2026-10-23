import { NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db';
import { ForecastingAgent } from '@/lib/agents/forecastingAgent';
import { ForecastRequestSchema } from '@/lib/validation/schemas';
import { Security } from '@/lib/utils/security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const donorOrgId = searchParams.get('donorOrgId') || undefined;
    const forecasts = dbRepository.listForecasts(donorOrgId);

    return NextResponse.json({
      success: true,
      count: forecasts.length,
      forecasts,
    });
  } catch (err) {
    return Security.errorResponse(err, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = ForecastRequestSchema.parse(body);

    const donorOrg = dbRepository.getOrgById(validated.donorOrgId);
    if (!donorOrg) {
      return NextResponse.json({ success: false, error: 'Donor organization not found' }, { status: 404 });
    }

    const forecast = await ForecastingAgent.generateForecast({
      donorOrg,
      dayOfWeek: validated.dayOfWeek,
      mealSlot: validated.mealSlot,
      expectedHeadcount: validated.expectedHeadcount,
      isHolidayOrEvent: validated.isHolidayOrEvent,
    });

    return NextResponse.json({
      success: true,
      forecast,
    });
  } catch (err) {
    return Security.errorResponse(err, 400);
  }
}
