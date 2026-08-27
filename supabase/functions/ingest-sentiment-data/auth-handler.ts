
export interface AuthResult {
  userContext: any;
  isAuthorized: boolean;
  error?: string;
}

export async function handleAuthentication(
  supabase: any,
  authHeader: string | null,
  requestBody: any
): Promise<AuthResult> {
  console.log('🔐 Authorization header present:', !!authHeader);
  
  // Safely handle user context - this function can run without user authentication
  let userContext = null;
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    );
    if (!userError && user) {
      userContext = user;
      console.log('👤 User context found:', user.id);
    } else {
      console.log('⚠️ No user context - running as system process');
    }
  } catch (userErr) {
    console.log('⚠️ User context unavailable - continuing as system process:', userErr);
  }

  // Authorization gate: Only allow CRON or manual runs
  const { triggered_by_cron = false, manual = false } = requestBody;
  
  if (!triggered_by_cron && !manual) {
    console.log('🚫 UNAUTHORIZED RUN: Must be triggered via CRON or manual override');
    return {
      userContext,
      isAuthorized: false,
      error: 'Unauthorized run: must be triggered via CRON or manual override.'
    };
  }

  return {
    userContext,
    isAuthorized: true
  };
}
