import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Support Socket.io WebSocket upgrade
  if (request.nextUrl.pathname.startsWith('/api/socket')) {
    console.log('Socket.io request detected in middleware:', 
      request.headers.get('upgrade') || 'HTTP Request', 
      'from', request.headers.get('origin') || 'unknown origin');
    
    // Create a response that allows the WebSocket upgrade
    const response = NextResponse.next();
    
    // If it's a WebSocket upgrade request, add proper headers
    if (request.headers.get('upgrade') === 'websocket') {
      console.log('Adding WebSocket upgrade headers in middleware');
      
      // Ensure proper websocket upgrade headers
      response.headers.set('Connection', 'Upgrade');
      response.headers.set('Upgrade', 'websocket');
    }
    
    // Always add CORS headers for all Socket.io requests (WebSocket and HTTP polling)
    const origin = request.headers.get('origin') || '*';
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    return response;
  }

  // For all other requests, continue normally
  return NextResponse.next()
}

// Add the matcher for WebSocket endpoint
export const config = {
  matcher: ['/api/socket']
} 