import { prisma } from '@/lib/prisma';
import {
  ARTICLE_TEMPLATES,
  type ArticleTemplate as ArticleTemplateDto,
} from '@/lib/data/article-templates';
import { createBackofficeArticle } from './backoffice-article-service';

function parseJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function rowToDto(row: {
  id: string;
  label: string;
  family: string;
  calculationType: string;
  saleUnit: string;
  description: string;
  defaultVariables: string;
  exampleArticleIds: string;
}): ArticleTemplateDto {
  return {
    id: row.id,
    label: row.label,
    family: row.family,
    calculationType: row.calculationType as ArticleTemplateDto['calculationType'],
    saleUnit: row.saleUnit,
    description: row.description,
    defaultVariables: parseJsonArray(row.defaultVariables),
    exampleArticleIds: parseJsonArray(row.exampleArticleIds),
  };
}

/** Seed idempotent des modèles statiques → DB */
export async function ensureArticleTemplatesSeeded() {
  try {
    const count = await prisma.articleTemplate.count();
    if (count > 0) return count;

    for (let i = 0; i < ARTICLE_TEMPLATES.length; i++) {
      const t = ARTICLE_TEMPLATES[i];
      await prisma.articleTemplate.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          label: t.label,
          family: t.family,
          calculationType: t.calculationType,
          saleUnit: t.saleUnit,
          description: t.description,
          defaultVariables: JSON.stringify(t.defaultVariables),
          exampleArticleIds: JSON.stringify(t.exampleArticleIds),
          sortOrder: i,
          active: true,
        },
        update: {
          label: t.label,
          family: t.family,
          calculationType: t.calculationType,
          saleUnit: t.saleUnit,
          description: t.description,
          defaultVariables: JSON.stringify(t.defaultVariables),
          exampleArticleIds: JSON.stringify(t.exampleArticleIds),
          sortOrder: i,
        },
      });
    }
    return ARTICLE_TEMPLATES.length;
  } catch {
    return 0;
  }
}

export async function listArticleTemplates(): Promise<{
  templates: ArticleTemplateDto[];
  source: 'database' | 'static-fallback';
}> {
  await ensureArticleTemplatesSeeded();
  try {
    const rows = await prisma.articleTemplate.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    if (rows.length) {
      return { templates: rows.map(rowToDto), source: 'database' };
    }
  } catch {
    /* table absente — dev sans migrate */
  }
  return { templates: ARTICLE_TEMPLATES, source: 'static-fallback' };
}

export async function getArticleTemplateById(id: string) {
  await ensureArticleTemplatesSeeded();
  try {
    const row = await prisma.articleTemplate.findUnique({ where: { id } });
    if (row) return rowToDto(row);
  } catch {
    /* ignore */
  }
  return ARTICLE_TEMPLATES.find((t) => t.id === id) ?? null;
}

export async function createArticleFromTemplate(
  templateId: string,
  input: { articleId: string; articleLabel?: string },
) {
  const template = await getArticleTemplateById(templateId);
  if (!template) throw new Error('Modèle introuvable');

  const articleId = input.articleId.trim();
  if (!articleId) throw new Error('articleId requis');

  return createBackofficeArticle({
    articleId,
    articleLabel: input.articleLabel?.trim() || template.label,
    family: template.family,
    calculationType: template.calculationType,
    saleUnit: template.saleUnit,
    status: 'draft',
  });
}
