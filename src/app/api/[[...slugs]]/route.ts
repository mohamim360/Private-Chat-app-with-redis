import { redis } from "@/lib/redis";
import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import z from "zod";
import { Message, realtime } from "@/lib/realtime";

const ROOM_TTL_SECONDS = 60 * 10; // Room lifetime (10 minutes)

//ROOM ROUTES

const rooms = new Elysia({ prefix: "/room" })
  // Create a new room
  .post("/create", async () => {
    const roomId = nanoid();

    // Store room metadata
    await redis.hset(`meta:${roomId}`, {
      connected: [],
      createdAt: Date.now(),
    });

    // Auto-expire room
    await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);

    return { roomId };
  });

// MESSAGES ROUTES

const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware) // Protect routes with auth
  .post(
    "/",
    async ({ body, auth }) => {
      const { sender, text } = body;
      const { roomId } = auth;

      // Check if room exists
      const roomExists = await redis.exists(`meta:${roomId}`);
      if (!roomExists) throw new Error("Room does not exists");

      // Create message object
      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
      };

      // Save message to Redis
      await redis.rpush(`messages:${roomId}`, {
        ...message,
        token: auth.token,
      });

      // Broadcast message in real-time
      await realtime.channel(roomId).emit("chat.message", message);

      // Sync message TTL with room TTL
      const remaining = await redis.ttl(`meta:${roomId}`);
      await redis.expire(`messages:${roomId}`, remaining);
      await redis.expire(`history:${roomId}`, remaining);
      await redis.expire(roomId, remaining);
    },
    {
      // Validate query params
      query: z.object({ roomId: z.string() }),

      // Validate request body
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    }
  );

// API APP 

const app = new Elysia({ prefix: "/api" })
  .use(rooms)
  .use(messages)// Register room routes

export const GET = app.fetch;
export const POST = app.fetch;

export type App = typeof app;
