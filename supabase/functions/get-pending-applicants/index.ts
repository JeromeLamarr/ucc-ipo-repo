import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[get-pending-applicants] Request received');

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[get-pending-applicants] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create client with user's token to verify they're authenticated
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated and is admin
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('[get-pending-applicants] Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[get-pending-applicants] User authenticated:', user.id);

    // Check if user is admin using service role
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userProfile, error: profileError } = await serviceClient
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      console.error('[get-pending-applicants] Not authorized - user is not admin');
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[get-pending-applicants] Admin verified, fetching pending applicants...');

    // Fetch pending applicants using SERVICE ROLE (bypasses RLS)
    // Using explicit FK constraint name to fix PostgREST embedded join
    const { data: applicants, error: fetchError } = await serviceClient
      .from('users')
      .select(`
        id,
        email,
        full_name,
        department_id,
        created_at,
        department:departments!users_department_id_fkey(name)
      `)
      .eq('role', 'applicant')
      .eq('is_approved', false)
      .is('rejected_at', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[get-pending-applicants] Query error:', {
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
        code: fetchError.code,
        full_error: JSON.stringify(fetchError, null, 2),
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch pending applicants',
          details: fetchError.message,
          hint: fetchError.hint,
          code: fetchError.code,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[get-pending-applicants] Found', applicants?.length || 0, 'pending applicants');
    console.log('[get-pending-applicants] Raw data:', JSON.stringify(applicants, null, 2));

    // Transform the data to match expected format
    const transformedApplicants = (applicants || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      department_id: user.department_id,
      created_at: user.created_at,
      department_name: user.department?.name || 'N/A',
    }));

    return new Response(
      JSON.stringify({
        success: true,
        applicants: transformedApplicants,
        count: transformedApplicants.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[get-pending-applicants] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
