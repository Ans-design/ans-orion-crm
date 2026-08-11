import { describe, expect, it } from 'vitest';
import {
  buildPlaceholderSvg,
  fileExtension,
  isNativePreviewable,
  needsAsyncPreview,
} from '@/lib/file-preview/preview-utils';

describe('file-preview utils', () => {
  it('détecte les extensions async AI/PSD/CDR/EPS', () => {
    expect(needsAsyncPreview('logo.ai')).toBe(true);
    expect(needsAsyncPreview('bat.psd')).toBe(true);
    expect(needsAsyncPreview('visuel.cdr')).toBe(true);
    expect(needsAsyncPreview('trace.eps')).toBe(true);
    expect(needsAsyncPreview('photo.png')).toBe(false);
  });

  it('preview natif pour images et PDF', () => {
    expect(isNativePreviewable('flyer.pdf')).toBe(true);
    expect(isNativePreviewable('bat.png', 'image/png')).toBe(true);
    expect(isNativePreviewable('source.ai')).toBe(false);
  });

  it('génère un SVG placeholder avec extension et nom', () => {
    const svg = buildPlaceholderSvg({ name: 'test.psd', ext: 'psd', sizeBytes: 2048 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('PSD');
    expect(svg).toContain('test.psd');
    expect(svg).toContain('FF174D');
  });

  it('fileExtension extrait la bonne extension', () => {
    expect(fileExtension('folder/file.AI')).toBe('ai');
    expect(fileExtension('noext')).toBe('noext');
  });
});
