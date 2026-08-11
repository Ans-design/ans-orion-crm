import { describe, expect, it, afterEach } from 'vitest';
import {
  buildStorageKey,
  isObjectStorageConfigured,
  maxUploadBytes,
} from '@/lib/storage/object-storage';

describe('object-storage', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('isObjectStorageConfigured false sans bucket', () => {
    delete process.env.S3_BUCKET;
    expect(isObjectStorageConfigured()).toBe(false);
  });

  it('isObjectStorageConfigured true avec credentials', () => {
    process.env.S3_BUCKET = 'orion-files';
    process.env.S3_ACCESS_KEY_ID = 'key';
    process.env.S3_SECRET_ACCESS_KEY = 'secret';
    expect(isObjectStorageConfigured()).toBe(true);
  });

  it('buildStorageKey inclut client et asset', () => {
    const key = buildStorageKey({
      clientId: 'cl_123',
      fileName: 'logo client.png',
      assetId: 'fa_abc',
    });
    expect(key).toBe('clients/cl_123/fa_abc/logo_client.png');
  });

  it('maxUploadBytes 2 Mo en mode local', () => {
    delete process.env.S3_BUCKET;
    expect(maxUploadBytes()).toBe(2 * 1024 * 1024);
  });

  it('maxUploadBytes 15 Mo avec S3', () => {
    process.env.S3_BUCKET = 'b';
    process.env.S3_ACCESS_KEY_ID = 'k';
    process.env.S3_SECRET_ACCESS_KEY = 's';
    expect(maxUploadBytes()).toBe(15 * 1024 * 1024);
  });
});
