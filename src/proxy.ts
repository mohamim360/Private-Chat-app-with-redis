import { NextRequest, NextResponse } from "next/server";
import { redis } from "./lib/redis";
import { nanoid } from "nanoid";

// Middleware to protect and manage room access
export const proxy = async (req: NextRequest) => {
  // Get current request path
  const pathname = req.nextUrl.pathname;

  // Match /room/:roomId pattern
  const roomMatch = pathname.match(/^\/room\/([^/]+)$/);

  // Redirect if room ID is missing or invalid
  if (!roomMatch) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Extract room ID from URL
  const roomId = roomMatch[1];

  // Fetch room metadata from Redis
  const meta = await redis.hgetall<{
    connected: string[];
    createdAt: number;
  }>(`meta:${roomId}`);

  // Redirect if room does not exist
  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
  }

  // Check if user already has a valid auth token
  const existingToken = req.cookies.get("x-auth-token")?.value;

  // Allow access if token is already connected
  if (existingToken && meta.connected.includes(existingToken)) {
    return NextResponse.next();
  }

  // Prevent more than 2 users from joining the room
  if (meta.connected.length >= 2) {
    return NextResponse.redirect(new URL("/?error=room-full", req.url));
  }

  // Continue request processing
  const response = NextResponse.next();

  // Generate a unique token for the user
  const token = nanoid();

  // Store token securely in an HTTP-only cookie
  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true, // Prevent JS access
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "strict", // Protect against CSRF
  });

  // Save the new connection in Redis
  await redis.hset(`meta:${roomId}`, {
    connected: [...meta.connected, token],
  });

  return response;
};

// Apply middleware only to /room routes
export const config = {
  matcher: "/room/:path*",
};
