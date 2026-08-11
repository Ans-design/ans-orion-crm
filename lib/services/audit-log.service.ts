import { prisma } from '@/lib/prisma';
import { logAudit, logAuditChange } from '@/lib/audit';

export { logAudit, logAuditChange };

export type AuditLogListParams = {
  page?: number;
  limit?: number;
  entity?: string;
  action?: string;
};

export async function listAuditLogs(params: AuditLogListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 40));
  const skip = (page - 1) * limit;

  const where: { entity?: string; action?: string } = {};
  if (params.entity) where.entity = params.entity;
  if (params.action) where.action = params.action;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}
