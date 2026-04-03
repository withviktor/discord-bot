import { injectable } from "tsyringe";

const SPAM_WINDOW_MS = 5_000;
const SPAM_LIMIT = 5;
const INVITE_PATTERN = /(?:https?:\/\/)?(?:www\.)?discord(?:\.gg|(?:app)?\.com\/invite)\/\w+/i;

@injectable()
export class AutoModService {
  private readonly spamCache = new Map<string, number[]>();

  /** Returns true if the user is sending messages too fast. Updates internal state. */
  checkSpam(guildId: string, userId: string): boolean {
    const key = `${guildId}:${userId}`;
    const now = Date.now();
    const timestamps = (this.spamCache.get(key) ?? []).filter(
      (t) => now - t < SPAM_WINDOW_MS
    );
    timestamps.push(now);
    this.spamCache.set(key, timestamps);
    return timestamps.length > SPAM_LIMIT;
  }

  checkInvite(content: string): boolean {
    return INVITE_PATTERN.test(content);
  }

  checkWords(content: string, wordList: string[]): string | null {
    const lower = content.toLowerCase();
    return wordList.find((w) => lower.includes(w)) ?? null;
  }
}
