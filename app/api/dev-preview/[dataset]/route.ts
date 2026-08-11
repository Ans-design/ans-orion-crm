import { NextResponse } from 'next/server';
import { isDevPreviewEnabled } from '@/lib/local-dev';
import { MOCK_DATASETS, getMockDataset } from '@/src/mock';

type Params = { params: { dataset: string } };

export async function GET(_req: Request, { params }: Params) {
  if (!isDevPreviewEnabled()) {
    return NextResponse.json({ error: 'Dev preview désactivé' }, { status: 404 });
  }
  if (!(params.dataset in MOCK_DATASETS)) {
    return NextResponse.json(
      { error: 'Dataset inconnu', available: Object.keys(MOCK_DATASETS) },
      { status: 404 },
    );
  }
  const data = getMockDataset(params.dataset);
  return NextResponse.json({ dataset: params.dataset, data, _local: true });
}
