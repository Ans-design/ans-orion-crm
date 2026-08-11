import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  clearRhAttendanceCache,
  isRhAttendanceBlocked,
  isRhAttendanceExemptPath,
  isRhAttendanceGuardEnabled,
} from '@/lib/server/auth/rh-attendance-guard';
import { getLateArrivalGate } from '@/lib/services/late-arrival-service';

vi.mock('@/lib/services/late-arrival-service', () => ({
  getLateArrivalGate: vi.fn(),
}));

describe('rh-attendance-guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    clearRhAttendanceCache();
    vi.mocked(getLateArrivalGate).mockReset();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('exempte les routes auth et late-arrival', () => {
    expect(isRhAttendanceExemptPath('/api/auth/session')).toBe(true);
    expect(isRhAttendanceExemptPath('/api/rh/late-arrival')).toBe(true);
    expect(isRhAttendanceExemptPath('/api/clients')).toBe(false);
  });

  it('désactive le guard en dev local si SKIP_RH_ATTENDANCE_GUARD_IN_DEV', () => {
    process.env.SKIP_RH_ATTENDANCE_GUARD_IN_DEV = 'true';
    process.env.APP_ENV = 'local';
    expect(isRhAttendanceGuardEnabled()).toBe(false);
  });

  it('bloque quand getLateArrivalGate renvoie blocked', async () => {
    process.env.SKIP_RH_ATTENDANCE_GUARD_IN_DEV = 'false';
    vi.mocked(getLateArrivalGate).mockResolvedValue({ blocked: true } as never);
    await expect(isRhAttendanceBlocked('user-1', null)).resolves.toBe(true);
    expect(getLateArrivalGate).toHaveBeenCalledTimes(1);
    await expect(isRhAttendanceBlocked('user-1', null)).resolves.toBe(true);
    expect(getLateArrivalGate).toHaveBeenCalledTimes(1);
  });

  it('fail-closed sur erreur interne', async () => {
    process.env.SKIP_RH_ATTENDANCE_GUARD_IN_DEV = 'false';
    vi.mocked(getLateArrivalGate).mockRejectedValue(new Error('db down'));
    await expect(isRhAttendanceBlocked('user-2', null)).resolves.toBe(true);
  });

  it('laisse passer si gate clear', async () => {
    process.env.SKIP_RH_ATTENDANCE_GUARD_IN_DEV = 'false';
    vi.mocked(getLateArrivalGate).mockResolvedValue({ blocked: false, reason: 'not_late' } as never);
    await expect(isRhAttendanceBlocked('user-3', null)).resolves.toBe(false);
  });
});
