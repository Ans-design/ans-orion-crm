import {
  calculateBlocNoteMaterialRecap,
  type BlocNoteMaterialRecap,
} from '@/lib/pricing/bloc-note-material-recap';
import { isBlocNoteArticleId } from '@/lib/pricing/bloc-note-pricing';

export type { BlocNoteMaterialRecap };

export function resolveBlocNoteMaterialRecap(
  articleId: string,
  config: Record<string, unknown>,
): BlocNoteMaterialRecap | null {
  if (!isBlocNoteArticleId(articleId)) return null;
  return calculateBlocNoteMaterialRecap(articleId, config);
}
