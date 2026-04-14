import { NextRequest, NextResponse } from "next/server";

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security event logging (console only - Firebase doesn't work in middleware)
function logSecurityEvent(type: string, ip: string, details: string, severity: string = "medium") {
  console.log(`[SECURITY] ${type} | ${ip} | ${details} | ${severity}`);
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIP || 'unknown';
  return ip;
}

// Rate limiting middleware
function rateLimit(request: NextRequest, maxRequests: number = 100, windowMs: number = 15 * 60 * 1000): { allowed: boolean; retryAfter?: number } {
  const ip = getClientIP(request);
  const key = `rate_limit:${ip}`;
  const now = Date.now();
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // New window or expired window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true };
  }
  
  if (record.count >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Increment count
  record.count++;
  return { allowed: true };
}

// Cleanup expired rate limit entries (called on each request)
function cleanupRateLimits(): void {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, record] of entries) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export async function middleware(request: NextRequest) {
  // Cleanup on each request (since setInterval doesn't work in edge runtime)
  cleanupRateLimits();
  const response = NextResponse.next();
  const ip = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  
  // Add security headers to all responses
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: blob: https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://api.paystack.co https://firebase.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://*.googleapis.com https://firebasestorage.googleapis.com; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com"
  );
  
  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    let maxRequests = 100; // Default
    let windowMs = 15 * 60 * 1000; // 15 minutes
    
    // Stricter limits for sensitive endpoints
    if (pathname.includes('/paystack/')) {
      maxRequests = 10; // Very strict for payment endpoints
    } else if (pathname.includes('/auth/')) {
      maxRequests = 20; // Strict for auth endpoints
    } else if (pathname.includes('/admin/')) {
      maxRequests = 50; // Strict for admin endpoints
    }
    
    const rateLimitResult = rateLimit(request, maxRequests, windowMs);
    
    if (!rateLimitResult.allowed) {
      // Log rate limit violation
      logSecurityEvent(
        'RATE_LIMIT',
        ip,
        `Rate limit exceeded for ${pathname}: ${maxRequests} requests per ${windowMs / 1000}s`,
        'medium'
      );
      
      return new NextResponse(
        JSON.stringify({ error: "Too many requests" }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + (rateLimitResult.retryAfter || 60) * 1000).toISOString(),
          },
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const record = rateLimitStore.get(`rate_limit:${ip}`);
    if (record) {
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count).toString());
      response.headers.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
    }
  }
  
  // Log suspicious requests
  if (pathname.includes('/api/') && request.method !== 'GET' && request.method !== 'POST') {
    logSecurityEvent(
      'SUSPICIOUS_METHOD',
      ip,
      `Suspicious HTTP method ${request.method} used for ${pathname}`,
      'medium'
    );
  }
  
  // Block common attack patterns
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousPatterns = [
    /sqlmap/i,
    /nmap/i,
    /nikto/i,
    /dirb/i,
    /gobuster/i,
    /wfuzz/i,
    /burp/i,
    /owasp/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent)) {
      logSecurityEvent(
        'SUSPICIOUS_USER_AGENT',
        ip,
        `Suspicious user agent detected: ${userAgent}`,
        'high'
      );
      
      return new NextResponse(
        JSON.stringify({ error: "Access denied" }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
  
  // Additional security for admin routes
  if (pathname.startsWith('/admin')) {
    // Log all admin access attempts
    logSecurityEvent(
      'ADMIN_ACCESS',
      ip,
      `Admin access attempt: ${pathname}`,
      'low'
    );
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
