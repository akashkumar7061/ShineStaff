import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';

interface LogAuditParams {
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected';
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: any;
}

// Fire-and-forget: never throws, never blocks the request/response cycle.
export const logAudit = (req: AuthRequest, params: LogAuditParams) => {
  if (!req.user) return;

  AuditLog.create({
    adminId: req.user.id,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    summary: params.summary,
    metadata: params.metadata
  }).catch((err) => {
    console.error('Failed to write audit log:', err.message);
  });
};
