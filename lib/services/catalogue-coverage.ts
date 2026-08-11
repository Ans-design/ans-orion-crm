export type CatalogueCoverageMode = 'static-fallback' | 'hybrid' | 'database-primary' | 'database-full';

export type CatalogueCoverage = {
  staticCount: number;
  dbProfileCount: number;
  matched: number;
  missingInDb: number;
  orphanInDb: number;
  coveragePercent: number;
  mode: CatalogueCoverageMode;
};

/** Couverture profils DB vs catalogue statique POS (hors articles masqués). */
export function computeCatalogueDbCoverage(
  staticIds: readonly string[],
  dbArticleIds: readonly string[],
  hiddenIds: ReadonlySet<string> = new Set(),
): CatalogueCoverage {
  const visibleStatic = staticIds.filter((id) => !hiddenIds.has(id));
  const staticSet = new Set(visibleStatic);
  const dbSet = new Set(dbArticleIds);
  const matched = visibleStatic.filter((id) => dbSet.has(id)).length;
  const missingInDb = visibleStatic.length - matched;
  const orphanInDb = dbArticleIds.filter((id) => !staticSet.has(id)).length;
  const coveragePercent =
    visibleStatic.length > 0 ? Math.round((matched / visibleStatic.length) * 100) : 0;

  let mode: CatalogueCoverageMode = 'static-fallback';
  if (dbArticleIds.length > 0) {
    if (coveragePercent === 100 && missingInDb === 0) {
      mode = 'database-full';
    } else if (coveragePercent >= 95) {
      mode = 'database-primary';
    } else {
      mode = 'hybrid';
    }
  }

  return {
    staticCount: visibleStatic.length,
    dbProfileCount: dbArticleIds.length,
    matched,
    missingInDb,
    orphanInDb,
    coveragePercent,
    mode,
  };
}
