import { describe, test, expect, beforeEach } from 'vitest';
import { RateLimitGuard } from './rate-limit-guard.js';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  beforeEach(() => {
    guard = new RateLimitGuard();
  });

  test('allows calls when not rate limited', () => {
    expect(guard.isBlocked()).toBe(false);
  });

  test('blocks calls after recording a 429', () => {
    guard.recordRateLimit(300);
    expect(guard.isBlocked()).toBe(true);
  });

  test('returns remaining cooldown seconds', () => {
    guard.recordRateLimit(300);
    const remaining = guard.remainingCooldownSec();
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(300);
  });

  test('unblocks after cooldown expires', () => {
    guard.recordRateLimit(1); // 1 second cooldown
    // Manually advance time by overriding internal state
    (guard as any).blockedUntil = Date.now() - 1000;
    expect(guard.isBlocked()).toBe(false);
  });

  test('extends cooldown on repeated rate limits', () => {
    guard.recordRateLimit(60);
    const firstUntil = (guard as any).blockedUntil;
    guard.recordRateLimit(300);
    const secondUntil = (guard as any).blockedUntil;
    expect(secondUntil).toBeGreaterThan(firstUntil);
  });

  test('checkOrThrow throws when blocked', () => {
    guard.recordRateLimit(300);
    expect(() => guard.checkOrThrow()).toThrow('Rate limited');
  });

  test('checkOrThrow does not throw when not blocked', () => {
    expect(() => guard.checkOrThrow()).not.toThrow();
  });

  test('extractBackoffSeconds parses Anthropic 429 error message', () => {
    const msg = 'Rate limited (backoff 300s). Try again later.';
    expect(RateLimitGuard.extractBackoffSeconds(msg)).toBe(300);
  });

  test('extractBackoffSeconds returns default for unparseable message', () => {
    expect(RateLimitGuard.extractBackoffSeconds('some error')).toBe(60);
  });

  test('extractBackoffSeconds handles retry-after header style', () => {
    expect(RateLimitGuard.extractBackoffSeconds('backoff 120s')).toBe(120);
  });
});
