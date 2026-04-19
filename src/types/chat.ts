import type { User } from "./user";
import type { Message } from "./message";

export type ChatType = "direct" | "group" | "channel";

export type Chat = {
  id: string;
  type: ChatType;
  name?: string | null;
  photo?: string | null;
  pinnedMessageId?: string | null;
  pinnedMessage?: Message | null;
  createdAt: string | Date;
  members?: Array<{ user: User }>;
  messages?: Message[];
};

