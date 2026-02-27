import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Using service key to verify JWTs and check admin role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Verify JWT with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Get user metadata to check if admin
    const { data: userData, error: userError } = await supabase
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
