/**
 * Circuit breaker for Anthropic API rate limits.
 * When a 429 is received, blocks all calls for the backoff period.
 * Prevents retry storms that spam WhatsApp with error notifications.
 */
export class RateLimitGuard {
  private blockedUntil = 0;

  isBlocked(): boolean {
    return Date.now() < this.blockedUntil;
  }

  remainingCooldownSec(): number {
    const remaining = this.blockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  recordRateLimit(backoffSeconds: number): void {
    this.blockedUntil = Date.now() + backoffSeconds * 1000;
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
