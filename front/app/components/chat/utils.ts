import { ChatMessage } from "./socketClient";

// Aggregate reactions per emoji with memo-friendly pure function
export interface AggregatedReaction {
  emoji: string;
  count: number;
  mine: boolean;
  users: string[];
}

export function aggregateReactions(
  reactions: ChatMessage["reactions"],
  currentUserId?: string
): AggregatedReaction[] {
  if (!reactions || !reactions.length) return [];
  const map: Record<string, AggregatedReaction> = {};
  for (const r of reactions) {
    let entry = map[r.emoji];
    if (!entry)
      entry = map[r.emoji] = {
        emoji: r.emoji,
        count: 0,
        mine: false,
        users: [],
      };
    entry.count++;
    entry.users.push(r.userId);
    if (r.userId === currentUserId) entry.mine = true;
  }
  return Object.values(map).sort(
    (a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji)
  );
}

// Day label (FR) – extracted for reuse / future i18n
export function dayLabelFR(date: Date): string {
  const today = new Date();
  const yday = new Date(Date.now() - 86400000);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Aujourd'hui";
  if (sameDay(date, yday)) return "Hier";
  return date.toLocaleDateString();
}

export function canEditMessage(message: ChatMessage, userId?: string): boolean {
  if (!userId) return false;
  if (message.senderId !== userId) return false;
  if (message.isDeleted) return false;
  const created = new Date(message.createdAt).getTime();
  return Date.now() - created <= 15 * 60 * 1000; // 15 min window
}
