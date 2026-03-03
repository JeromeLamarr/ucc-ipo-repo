import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

/**
 * Get or create Supabase client (lazy-loaded to ensure env vars are ready)
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Verify JWT and attach user info to request
 */
export async function verifyAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    // Get Supabase client (lazy-loaded)
    const client = getSupabaseClient();

    // Verify JWT with Supabase
    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Get user metadata to check if admin
    const { data: userData, error: userError } = await client
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      res.status(403).json({ error: 'User record not found' });
      return;
    }

    // Check if user is admin
    if (userData.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can generate full record PDFs' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || userData.email,
      role: userData.role,
    };

    next();
  } catch (err: any) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
}
