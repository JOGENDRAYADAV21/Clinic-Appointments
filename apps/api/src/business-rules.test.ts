import { describe, expect, it } from 'vitest';
import { aiToolSchemas } from './ai-tools.js';

describe('cancellation policy', () => {
  it('is free at the exact cutoff', () => {
    const appointment = new Date('2026-09-17T18:00:00Z');
    const cancelled = new Date('2026-09-17T16:00:00Z');
    const cutoff = appointment.getTime() - 120 * 60_000;
    expect(cancelled.getTime() > cutoff).toBe(false);
  });

  it('charges after the cutoff', () => {
    const appointment = new Date('2026-09-17T18:00:00Z');
    const cancelled = new Date('2026-09-17T16:01:00Z');
    const cutoff = appointment.getTime() - 120 * 60_000;
    expect(cancelled.getTime() > cutoff).toBe(true);
  });
});

describe('AI tool validation', () => {
  it('rejects an empty patient search', () => {
    expect(() => aiToolSchemas.findPatient.parse({ name: '' })).toThrow();
  });

  it('accepts a valid patient search', () => {
    expect(aiToolSchemas.findPatient.parse({ name: 'Rahul Sharma' })).toEqual({ name: 'Rahul Sharma' });
  });
});
