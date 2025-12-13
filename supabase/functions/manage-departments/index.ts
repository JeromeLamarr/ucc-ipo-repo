import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can manage departments' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const body = req.method !== 'GET' ? await req.json() : null;

    // GET - List all departments
    if (req.method === 'GET' && action === 'list') {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // GET - List active departments only (for frontend dropdowns)
    if (req.method === 'GET' && action === 'list-active') {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // POST - Create department
    if (req.method === 'POST' && action === 'create') {
      if (!body.name) {
        return new Response(
          JSON.stringify({ error: 'Department name is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const { data, error } = await supabase
        .from('departments')
        .insert([
          {
            name: body.name,
            description: body.description || null,
            active: body.active !== false,
            created_by: user.id,
          },
        ])
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({ data: data[0], success: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // PUT - Update department
    if (req.method === 'PUT' && action === 'update') {
      if (!body.id) {
        return new Response(
          JSON.stringify({ error: 'Department ID is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const { data, error } = await supabase
        .from('departments')
        .update({
          name: body.name,
          description: body.description,
          active: body.active,
        })
        .eq('id', body.id)
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({ data: data[0], success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // DELETE - Delete department
    if (req.method === 'DELETE' && action === 'delete') {
      if (!body.id) {
        return new Response(
          JSON.stringify({ error: 'Department ID is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', body.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Department management error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

Deno.serve(handle);
