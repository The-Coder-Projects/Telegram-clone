import type { User } from "./user";

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "gif"
  | "location"
  | "contact"
  | "poll";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type MessageRead = {
  userId: string;
  readAt: string | Date;
};

export type MessageReaction = {
  userId: string;
  emoji: string;
  createdAt: string | Date;
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string;
  createdAt: string | Date;
  editedAt?: string | Date | null;
  deletedAt?: string | Date | null;
  sender?: User;
  reads?: MessageRead[];
  replyTo?: Pick<Message, "id" | "content" | "senderId"> & { sender?: User } | null;
  reactions?: MessageReaction[];
  clientMessageId?: string | null;
  status?: MessageStatus;
};

