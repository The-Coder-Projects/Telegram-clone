import { z } from "zod";

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const chatIdSchema = z.object({
  chatId: z.string().min(1),
});

export const createDirectChatSchema = z.object({
  userId: z.string().min(1).optional(),
  username: z
    .string()
    .min(1)
    .transform((v) => v.replace(/^@/, "").toLowerCase())
    .optional(),
  identifier: z.string().min(1).optional(),
});

export const listMessagesQuerySchema = z
  .object({
    chatId: z.string().min(1),
  })
  .merge(paginationSchema);

export const sendMessageSchema = z.object({
  chatId: z.string().min(1),
  content: z.string().min(1).max(5000),
  type: z.literal("text").default("text"),
  replyToId: z.string().min(1).optional(),
});

export const editMessageSchema = z.object({
  messageId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

export const deleteMessageSchema = z.object({
  messageId: z.string().min(1),
  scope: z.enum(["me", "everyone"]).default("everyone"),
});

export const forwardMessageSchema = z.object({
  toChatId: z.string().min(1),
  messageId: z.string().min(1),
});

export const reactMessageSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(12),
});

export const pinMessageSchema = z.object({
  chatId: z.string().min(1),
  messageId: z.string().min(1),
});

export const userSearchSchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(
      /^@?[a-z0-9_-]+$/i,
      "Username may contain letters, numbers, underscores, hyphens"
    )
    .transform((v) => v.replace(/^@/, "").toLowerCase()),
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(6).max(72),
});

export const addContactSchema = z.object({
  identifier: z.string().min(1),
});

