export interface FirebaseConfigStatus {
  isConfigured: boolean;
  projectId: string;
  authDomain: string;
  mode: 'CLOUD_FIRESTORE' | 'LOCAL_DEMO_ADAPTER';
}

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const isConfigured = Boolean(projectId && projectId.length > 3 && !projectId.includes('placeholder'));

  return {
    isConfigured,
    projectId: isConfigured ? projectId! : 'rescuegrid-demo-local',
    authDomain: `${projectId || 'rescuegrid-demo-local'}.firebaseapp.com`,
    mode: isConfigured ? 'CLOUD_FIRESTORE' : 'LOCAL_DEMO_ADAPTER',
  };
}

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  DONATIONS: 'donations',
  ASSIGNMENTS: 'assignments',
  MATCH_RECOMMENDATIONS: 'matchRecommendations',
  WORKFLOW_EVENTS: 'workflowEvents',
  AUDIT_LOGS: 'auditLogs',
  FORECASTS: 'surplusForecasts',
} as const;
