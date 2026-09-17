import { describe, expect, it } from 'vitest';

describe('appointment overlap rule', () => {
  it('treats touching appointments as available', () => {
    const existingStart = new Date('2026-09-17T10:00:00Z');
    const existingEnd = new Date('2026-09-17T10:30:00Z');
    const requestedStart = new Date('2026-09-17T10:30:00Z');
    const requestedEnd = new Date('2026-09-17T11:00:00Z');
    expect(existingStart < requestedEnd && existingEnd > requestedStart).toBe(false);
  });

  it('rejects partial overlap', () => {
    const existingStart = new Date('2026-09-17T10:00:00Z');
    const existingEnd = new Date('2026-09-17T10:30:00Z');
    const requestedStart = new Date('2026-09-17T10:15:00Z');
    const requestedEnd = new Date('2026-09-17T10:45:00Z');
    expect(existingStart < requestedEnd && existingEnd > requestedStart).toBe(true);
  });
});
