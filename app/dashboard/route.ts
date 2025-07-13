import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
export function GET(request: NextRequest) {
  // Redirect /dashboard to the root URL
  return NextResponse.redirect(new URL('/', request.url));
}
