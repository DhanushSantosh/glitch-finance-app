import { DbClient } from "../../db/client.js";
import { auditLogs } from "../../db/schema.js";

export type AuditEvent = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ipAddress?: string;
};

export class AuditService {
  constructor(private readonly db: DbClient) {}

  async log(event: AuditEvent): Promise<void> {
    await this.db.insert(auditLogs).values({
      userId: event.userId ?? null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata ?? {},
      requestId: event.requestId,
      ipAddress: event.ipAddress
    });
  }
}
