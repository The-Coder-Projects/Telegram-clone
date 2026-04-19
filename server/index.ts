import { config as loadEnv } from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

loadEnv({ path: ".env.local" });
loadEnv();

const PORT = Number(process.env.PORT ?? 3001);
const ORIGIN = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type AuthedSocketData = {
  userId: string;
};

type SendMessagePayload = {
  chatId: string;
  content: string;
  type?: "text";
  replyToId?: string;
  clientMessageId?: string;
};

type EditMessagePayload = {
  messageId: string;
  content: string;
};

type DeleteMessagePayload = {
  messageId: string;
};

type ReactMessagePayload = {
  messageId: string;
  emoji: string;
};

type ForwardMessagePayload = {
  messageId: string;
  targetChatId: string;
};

type PinChatPayload = {
  chatId: string;
  messageId: string | null;
};

type ChatReadPayload = {
  chatId: string;
  messageId: string;
};

async function joinUserChats(socket: import("socket.io").Socket, userId: string) {
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    select: { chatId: true },
  });
  for (const { chatId } of memberships) {
    socket.join(`chat:${chatId}`);
  }
}

async function setOnline(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastSeen: new Date() },
  });
}

async function setOffline(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastSeen: new Date() },
  });
}

const app = express();
app.use(cors({ origin: ORIGIN, credentials: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ORIGIN, credentials: true },
  transports: ["websocket"],
});

io.use(async (socket, next) => {
  const userId =
    (socket.handshake.auth?.userId as string | undefined) ??
    (socket.handshake.query?.userId as string | undefined);

  if (!userId) return next(new Error("Missing userId"));
  (socket.data as AuthedSocketData).userId = userId;
  next();
});

io.on("connection", async (socket) => {
  const { userId } = socket.data as AuthedSocketData;

  socket.join(`user:${userId}`);
  await joinUserChats(socket, userId);
  await setOnline(userId);
  io.emit("user:online", { userId });

  socket.on("typing:start", ({ chatId }: { chatId: string }) => {
    socket.to(`chat:${chatId}`).emit("typing:start", { chatId, userId });
  });

  socket.on("typing:stop", ({ chatId }: { chatId: string }) => {
    socket.to(`chat:${chatId}`).emit("typing:stop", { chatId, userId });
  });

  socket.on("chat:read", async ({ chatId, messageId }: ChatReadPayload) => {
    await prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { readAt: new Date() },
      create: { messageId, userId },
    });

    socket.to(`chat:${chatId}`).emit("chat:read", {
      chatId,
      userId,
      messageId,
    });
  });

  socket.on("message:send", async (payload: SendMessagePayload) => {
    const isMember = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: payload.chatId, userId } },
      select: { chatId: true },
    });
    if (!isMember) return;

    const message = await prisma.message.create({
      data: {
        chatId: payload.chatId,
        senderId: userId,
        type: "text",
        content: payload.content,
        replyToId: payload.replyToId ?? null,
      },
      include: {
        sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
        reads: { select: { userId: true, readAt: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        },
        reactions: { select: { userId: true, emoji: true, createdAt: true } },
        attachments: {
          select: {
            id: true,
            kind: true,
            url: true,
            thumbUrl: true,
            mime: true,
            size: true,
            width: true,
            height: true,
            durationMs: true,
            fileName: true,
            createdAt: true,
          },
        },
      },
    });

    io.to(`chat:${payload.chatId}`).emit("message:received", {
      message,
      clientMessageId: payload.clientMessageId ?? null,
    });
  });

  socket.on("message:edit", async ({ messageId, content }: EditMessagePayload) => {
    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, senderId: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) return;
    if (existing.senderId !== userId) return;
    const isMember = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: existing.chatId, userId } },
      select: { chatId: true },
    });
    if (!isMember) return;

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: {
        sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
        reads: { select: { userId: true, readAt: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        },
        reactions: { select: { userId: true, emoji: true, createdAt: true } },
        attachments: {
          select: {
            id: true,
            kind: true,
            url: true,
            thumbUrl: true,
            mime: true,
            size: true,
            width: true,
            height: true,
            durationMs: true,
            fileName: true,
            createdAt: true,
          },
        },
      },
    });

    io.to(`chat:${existing.chatId}`).emit("message:edited", { message });
  });

  socket.on("message:delete", async ({ messageId }: DeleteMessagePayload) => {
    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, senderId: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) return;
    if (existing.senderId !== userId) return;
    const isMember = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: existing.chatId, userId } },
      select: { chatId: true },
    });
    if (!isMember) return;

    const deletedAt = new Date();
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt, content: "" },
    });

    io.to(`chat:${existing.chatId}`).emit("message:deleted", {
      chatId: existing.chatId,
      messageId,
      deletedAt: deletedAt.toISOString(),
    });
  });

  socket.on("message:react", async ({ messageId, emoji }: ReactMessagePayload) => {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, deletedAt: true },
    });
    if (!msg || msg.deletedAt) return;

    const isMember = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: msg.chatId, userId } },
      select: { chatId: true },
    });
    if (!isMember) return;

    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      select: { messageId: true },
    });
    if (existing) {
      await prisma.messageReaction.delete({
        where: { messageId_userId_emoji: { messageId, userId, emoji } },
      });
    } else {
      await prisma.messageReaction.create({
        data: { messageId, userId, emoji },
      });
    }

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      select: { userId: true, emoji: true, createdAt: true },
    });

    io.to(`chat:${msg.chatId}`).emit("message:reacted", {
      chatId: msg.chatId,
      messageId,
      reactions,
    });
  });

  socket.on("message:forward", async ({ messageId, targetChatId }: ForwardMessagePayload) => {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, content: true, type: true, deletedAt: true },
    });
    if (!msg || msg.deletedAt) return;

    const isMember = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: targetChatId, userId } },
      select: { chatId: true },
    });
    if (!isMember) return;

    const message = await prisma.message.create({
      data: {
        chatId: targetChatId,
        senderId: userId,
        type: msg.type,
        content: msg.content,
      },
      include: {
        sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
        reads: { select: { userId: true, readAt: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        },
        reactions: { select: { userId: true, emoji: true, createdAt: true } },
        attachments: {
          select: {
            id: true,
            kind: true,
            url: true,
            thumbUrl: true,
            mime: true,
            size: true,
            width: true,
            height: true,
            durationMs: true,
            fileName: true,
            createdAt: true,
          },
        },
      },
    });

    io.to(`chat:${targetChatId}`).emit("message:received", { message, clientMessageId: null });
  });

  socket.on("chat:pin", async ({ chatId, messageId }: PinChatPayload) => {
    const isMember = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
      select: { chatId: true },
    });
    if (!isMember) return;

    await prisma.chat.update({
      where: { id: chatId },
      data: { pinnedMessageId: messageId },
    });

    io.to(`chat:${chatId}`).emit("chat:pinned", { chatId, messageId });
  });

  socket.on("disconnect", async () => {
    await setOffline(userId);
    io.emit("user:offline", { userId, lastSeen: new Date().toISOString() });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket server listening on :${PORT}`);
});

