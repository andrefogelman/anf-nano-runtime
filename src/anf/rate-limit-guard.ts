/**
 * Circuit breaker for LLM API errors.
 * Blocks all calls after ANY LLM failure (429, 502, timeout, etc.)
 * with exponential backoff. Prevents retry storms that spam WhatsApp
 * and exhaust the King proxy rate limit.
 */
export class RateLimitGuard {
  private blockedUntil = 0;
  private consecutiveErrors = 0;

  isBlocked(): boolean {
    return Date.now() < this.blockedUntil;
  }

  remainingCooldownSec(): number {
    const remaining = this.blockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  /** Record a rate limit with explicit backoff (from 429 response). */
  recordRateLimit(backoffSeconds: number): void {
    this.consecutiveErrors++;
    this.blockedUntil = Date.now() + backoffSeconds * 1000;
    console.log(
      `[rate-limit-guard] Blocked for ${backoffSeconds}s (429 rate limit, streak=${this.consecutiveErrors})`,
    );
  }

  /** Record any LLM error (502, timeout, network, etc.) with exponential backoff. */
  recordError(): void {
    this.consecutiveErrors++;
    // Exponential backoff: 30s, 60s, 120s, 240s, max 300s
    const backoff = Math.min(30 * Math.pow(2, this.consecutiveErrors - 1), 300);
    this.blockedUntil = Date.now() + backoff * 1000;
    console.log(
      `[rate-limit-guard] Blocked for ${backoff}s (LLM error, streak=${this.consecutiveErrors})`,
    );
  }

  /** Call on success to reset the streak. */
  recordSuccess(): void {
    if (this.consecutiveErrors > 0) {
      console.log(
        `[rate-limit-guard] Reset after ${this.consecutiveErrors} consecutive errors`,
      );
    }
    this.consecutiveErrors = 0;
  }

  checkOrThrow(): void {
    if (this.isBlocked()) {
      throw new Error(
        `Rate limited — cooldown ${this.remainingCooldownSec()}s remaining`,
      );
    }
  }

  static extractBackoffSeconds(message: string): number {
    const match = message.match(/backoff\s+(\d+)s/i);
    return match ? parseInt(match[1], 10) : 60;
  }
}
