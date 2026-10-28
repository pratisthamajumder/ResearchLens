import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth.js';
import { handler } from '@/lib/errors.js';

// GET /api/auth/me -> the logged-in user, or { user: null }
export const GET = handler(async () => {
  return NextResponse.json({ user: await getSessionUser() });
});
