import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  console.log('Middleware called');
  const res = NextResponse.next();

  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Origin', '*'); // Adjust this in production
  res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200 });
  }

  return res;
}

export const config = {
  matcher: '/api/:path*', // Apply middleware only to API routes
};