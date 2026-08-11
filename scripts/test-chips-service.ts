import { listChipArticles, getArticleChips, getGlobalChips } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.service';
import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';

async function main() {
  const { articles, stats } = await listChipArticles({ includeInactive: true });
  console.log('POS_CATALOGUE', POS_CATALOGUE.length);
  console.log('articles returned', articles.length);
  console.log('stats', stats);
  if (articles[0]) {
    const chips = await getArticleChips(articles[0].articleId);
    console.log('first article', articles[0].articleId, 'chips', chips?.counts);
  }
  const hangtag = await getArticleChips('pkg-hangtag');
  console.log('pkg-hangtag chips', hangtag?.counts);
  const global = await getGlobalChips({ limit: 50 });
  console.log('global sample', global.total, 'rows', global.rows.length);
}

main().catch(console.error).finally(() => process.exit(0));
