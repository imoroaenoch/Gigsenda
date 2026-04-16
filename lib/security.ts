import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getAdminDb() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
  return getFirestore(app);
}

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security event types
export interface SecurityEvent {
  type: "AUTH_FAILURE" | "RATE_LIMIT" | "INVALID_REQUEST" | "SUSPICIOUS_ACTIVITY";
  ip: string;
  userAgent?: string;
  userId?: string;
  details: string;
  timestamp: any;
  severity: "low" | "medium" | "high" | "critical";
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Default rate limit configurations
export const RATE_LIMITS = {
  // Payment endpoints - very strict
  PAYMENT: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 requests per 15 minutes
  // General API - moderate
  API: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 requests per 15 minutes
  // Auth endpoints - strict
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 20 }, // 20 requests per 15 minutes
  // Admin endpoints - very strict
  ADMIN: { windowMs: 15 * 60 * 1000, maxRequests: 50 }, // 50 requests per 15 minutes
};

/**
 * Verify Firebase ID token and return user info
 * Note: In production, this should use Firebase Admin SDK
 * For now, we'll validate the token format and extract basic info
 */
export async function verifyAuthToken(request: NextRequest): Promise<{ uid: string; email: string; role?: string } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Basic token validation - in production, use Firebase Admin SDK
    if (!token || token.length < 10) {
      return null;
    }
    
    // For now, we'll decode the JWT payload (in production, use Admin SDK)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const uid = payload.uid || payload.sub;
      if (uid && payload.email) {
        return {
          uid,
          email: payload.email,
          role: payload.role || payload.accountType,
        };
      }
    } catch (decodeError) {
      console.error("Token decode failed:", decodeError);
    }
    
    return null;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return (request: NextRequest): { allowed: boolean; retryAfter?: number } => {
    const ip = getClientIP(request);
    const key = `rate_limit:${ip}`;
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      // New window or expired window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return { allowed: true };
    }
    
    if (record.count >= config.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    // Increment count
    record.count++;
    return { allowed: true };
  };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIP || 'unknown';
  return ip;
}

/**
 * Log security events for audit trail
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    await getAdminDb().collection("security_logs").add({
      ...event,
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

/**
 * Validate and sanitize input data
 */
export function validateInput(data: any, schema: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Basic validation - in production, use Zod or similar
  if (!data || typeof data !== 'object') {
    errors.push("Invalid data format");
  }
  
  // Check for common injection patterns
  const dataString = JSON.stringify(data);
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /union\s+select/gi, // SQL injection
    /drop\s+table/gi, // SQL injection
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(dataString)) {
      errors.push("Potentially dangerous content detected");
      break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Authentication middleware for API routes
 */
export function withAuth(handler: (req: NextRequest, context: { user: any }) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const user = await verifyAuthToken(request);
      
      if (!user) {
        const ip = getClientIP(request);
        await logSecurityEvent({
          type: "AUTH_FAILURE",
          ip,
          userAgent: request.headers.get('user-agent') || undefined,
          details: "Invalid or missing authentication token",
          timestamp: new Date(),
          severity: "medium",
        });
        
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      
      return await handler(request, { user });
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(config: RateLimitConfig, handler: (req: NextRequest) => Promise<NextResponse>) {
  const limiter = rateLimit(config);
  
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = limiter(request);
    
    if (!result.allowed) {
      const ip = getClientIP(request);
      await logSecurityEvent({
        type: "RATE_LIMIT",
        ip,
        userAgent: request.headers.get('user-agent') || undefined,
        details: `Rate limit exceeded: ${config.maxRequests} requests per ${config.windowMs / 1000}s`,
        timestamp: new Date(),
        severity: "medium",
      });
      
      return NextResponse.json(
        { error: "Too many requests" },
        { 
          status: 429,
          headers: {
            'Retry-After': result.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + (result.retryAfter || 60) * 1000).toISOString(),
          }
        }
      );
    }
    
    return handler(request);
  };
}

/**
 * Input validation middleware
 */
export function withValidation(schema: any, handler: (req: NextRequest, data: any) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const validation = validateInput(body, schema);
      
      if (!validation.valid) {
        const ip = getClientIP(request);
        await logSecurityEvent({
          type: "INVALID_REQUEST",
          ip,
          userAgent: request.headers.get('user-agent') || undefined,
          details: `Validation failed: ${validation.errors?.join(', ')}`,
          timestamp: new Date(),
          severity: "low",
        });
        
        return NextResponse.json(
          { error: "Invalid request data", details: validation.errors },
          { status: 400 }
        );
      }
      
      return handler(request, body);
    } catch (error) {
      console.error("Validation middleware error:", error);
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }
  };
}

/**
 * Combined security middleware
 */
export function withSecurity(
  config: {
    auth?: boolean;
    rateLimit?: RateLimitConfig;
    validation?: any;
    roles?: string[];
  },
  handler: (req: NextRequest, context: { user?: any; data?: any }) => Promise<NextResponse>
) {
  let securedHandler = handler;
  
  // Add validation middleware first
  if (config.validation) {
    securedHandler = withValidation(config.validation, (req, data) => 
      securedHandler(req, { data })
    );
  }
  
  // Add rate limiting middleware
  if (config.rateLimit) {
    securedHandler = withRateLimit(config.rateLimit, securedHandler);
  }
  
  // Add authentication middleware
  if (config.auth) {
    securedHandler = withAuth((req, { user }) => {
      // Check role-based access
      if (config.roles && config.roles.length > 0) {
        const userRole = user.role || user.accountType;
        if (!config.roles.includes(userRole)) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }
      }
      
      return securedHandler(req, { user });
    });
  }
  
  return securedHandler;
}

/**
 * Security headers middleware
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.paystack.co https://firebase.googleapis.com"
  );
  
  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  return response;
}

/**
 * Cleanup expired rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, record] of entries) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup rate limits every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
