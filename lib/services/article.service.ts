/**
 * Façade articles — unifie catalogue backoffice et POS.
 */
export {
  listBackofficeArticles,
  getBackofficeArticle,
  createBackofficeArticle,
  updateBackofficeArticle,
  deleteBackofficeArticle,
  type CreateBackofficeArticleInput,
  type UpdateBackofficeArticleInput,
} from './backoffice-article-service';

export { getPosCatalogue, resolveCatalogueItemFromDb } from './catalogue-service';
export { listArticleTemplates, createArticleFromTemplate } from './article-template-service';
export { syncCatalogueProfilesToDb } from './catalogue-sync-service';
