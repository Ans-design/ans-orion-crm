import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { isEmailConfigured, sendAlertEmail } from '@/lib/services/email-service';

describe('email-service', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('isEmailConfigured false sans clés', () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    expect(isEmailConfigured()).toBe(false);
  });

  it('isEmailConfigured true avec clés', () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'ORION <alert@ansdesign.mg>';
    expect(isEmailConfigured()).toBe(true);
  });

  it('sendAlertEmail skip sans configuration', async () => {
    delete process.env.RESEND_API_KEY;
    const r = await sendAlertEmail({
      to: 'test@example.com',
      subject: 'Test',
      title: 'Titre',
      message: 'Message',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.skipped).toBe(true);
  });
});
