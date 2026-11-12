import "server-only";
import { db, type Tx } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import type { Viewer } from "@/lib/dal";
import { logger } from "@/lib/logger";
import { clientIp } from "@/lib/request-meta";

type AuditInput = {
  actor: Pick<Viewer, "id" | "email"> | null;
  clubId?: string | null;
  action: string;
  summary: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Records a privileged mutation. Pass the transaction when available so the
 * audit row commits atomically with the change it describes.
 */
export async function audit(input: AuditInput, tx?: Tx) {
  const values = {
    clubId: input.clubId ?? null,
    actorId: input.actor?.id ?? null,
    actorEmail: input.actor?.email ?? null,
    action: input.action,
    summary: input.summary,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? null,
    ipAddress: await clientIp().catch(() => null),
  };
  await (tx ?? db).insert(auditLogs).values(values);
  logger.info("audit", { action: input.action, clubId: values.clubId, actor: values.actorEmail });
}
