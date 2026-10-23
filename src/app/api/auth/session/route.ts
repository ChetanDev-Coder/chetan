import { NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db';
import { getGeminiConfigStatus } from '@/lib/integrations/geminiClient';
import { getMapsConfigStatus } from '@/lib/integrations/mapsClient';
import { getFirebaseConfigStatus } from '@/lib/integrations/firebaseAdmin';
import { Security } from '@/lib/utils/security';

export async function GET(request: Request) {
  try {
    const auth = Security.getAuthContext(request);
    const currentUser = dbRepository.getUserById(auth.userId) || dbRepository.listUsers()[0];
    const allUsers = dbRepository.listUsers();
    const allOrgs = dbRepository.listOrganizations();

    const integrations = {
      gemini: getGeminiConfigStatus(),
      maps: getMapsConfigStatus(),
      firebase: getFirebaseConfigStatus(),
    };

    return NextResponse.json({
      success: true,
      currentUser,
      allUsers,
      allOrganizations: allOrgs,
      integrations,
    });
  } catch (err) {
    return Security.errorResponse(err, 500);
  }
}
