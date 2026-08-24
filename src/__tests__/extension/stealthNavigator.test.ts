import { describe, it, expect } from 'vitest';
import {
  getStealthSequenceDelay,
  getEntryDelay,
  WATCHDOG_TIMEOUT_MS,
} from '@/lib/serpAuthorEnricher';

describe('Stealth Navigator Timing Engine (UT-EXT-STEALTH-NAV-01)', () => {
  it('WATCHDOG_TIMEOUT_MS is 2500ms', () => {
    expect(WATCHDOG_TIMEOUT_MS).toBe(2500);
  });

  it('getEntryDelay returns value between 800ms and 1500ms', () => {
    for (let i = 0; i < 30; i++) {
      const delay = getEntryDelay();
      expect(delay).toBeGreaterThanOrEqual(800);
      expect(delay).toBeLessThanOrEqual(1500);
    }
  });

  it('getStealthSequenceDelay base jitter is within 500ms - 1200ms range', () => {
    // Step index 1 should always return base jitter (never triggers linger at index 1)
    for (let i = 0; i < 30; i++) {
      const delay = getStealthSequenceDelay(1);
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(1200);
    }
  });

  it('getStealthSequenceDelay at step 0 returns base jitter only (no linger)', () => {
    for (let i = 0; i < 30; i++) {
      const delay = getStealthSequenceDelay(0);
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(1200);
    }
  });

  it('getStealthSequenceDelay can produce smart linger delays at multiples of 4-6', () => {
    // Run many trials at indices 4, 5, 6 (which are candidates for linger)
    // At least some should exceed base max of 1200ms
    let foundLinger = false;
    for (let trial = 0; trial < 100; trial++) {
      for (const idx of [4, 5, 6, 8, 10, 12]) {
        const delay = getStealthSequenceDelay(idx);
        expect(delay).toBeGreaterThanOrEqual(500);
        if (delay > 1200) {
          foundLinger = true;
          // Linger delay = base (500-1200) + extra (1500-2500) → max 3700
          expect(delay).toBeLessThanOrEqual(3700);
        }
      }
    }
    expect(foundLinger).toBe(true);
  });

  it('getStealthSequenceDelay returns integer values', () => {
    for (let i = 0; i < 20; i++) {
      const delay = getStealthSequenceDelay(i);
      expect(Number.isInteger(delay)).toBe(true);
    }
  });
});
