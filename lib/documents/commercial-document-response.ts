import { NextResponse } from 'next/server';
import { htmlToPdfBuffer } from '@/lib/documents/html-to-pdf';

export type CommercialDocumentFormat = 'html' | 'pdf';

export function resolveDocumentFormat(
  searchParams: URLSearchParams,
  acceptHeader?: string | null,
): CommercialDocumentFormat {
  const fmt = searchParams.get('format');
  if (fmt === 'html' || fmt === 'preview') return 'html';
  if (fmt === 'pdf') return 'pdf';
  if (acceptHeader?.includes('application/pdf')) return 'pdf';
  return 'pdf';
}

export async function buildCommercialDocumentResponse(params: {
  html: string;
  filename: string;
  format: CommercialDocumentFormat;
  download?: boolean;
}): Promise<NextResponse> {
  if (params.format === 'html') {
    return new NextResponse(params.html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const pdf = await htmlToPdfBuffer(params.html);
  if (!pdf.ok) {
    return new NextResponse(params.html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-PDF-Fallback': pdf.error.slice(0, 200),
      },
    });
  }

  const disposition = params.download ? 'attachment' : 'inline';
  return new NextResponse(pdf.buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${sanitizeFilename(params.filename)}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_');
}
