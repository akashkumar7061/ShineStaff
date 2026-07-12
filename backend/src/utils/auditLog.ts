import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';

interface LogAuditParams {
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: any;
  status?: 'success' | 'failure';
}

// Fire-and-forget: never throws, never blocks the request/response cycle.
export const logAudit = (req: AuthRequest, params: LogAuditParams) => {
  if (!req.user) return;

  const rawIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '';
  // Clean up IPv6 loopback or proxy prefixes
  const ipAddress = rawIp.replace(/^.*:/, ''); 
  
  const userAgent = req.headers['user-agent'] || '';
  
  let device = 'Desktop';
  if (/mobile/i.test(userAgent)) {
    device = 'Mobile';
  } else if (/ipad|tablet|playbook|silk/i.test(userAgent)) {
    device = 'Tablet';
  }

  let browser = 'Browser';
  if (/edge|edg/i.test(userAgent)) {
    browser = 'Edge';
  } else if (/chrome|crios/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/safari/i.test(userAgent)) {
    browser = 'Safari';
  }

  AuditLog.create({
    adminId: req.user.id,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    summary: params.summary,
    metadata: params.metadata,
    ipAddress,
    device,
    browser,
    status: params.status || 'success'
  }).catch((err) => {
    console.error('Failed to write audit log:', err.message);
  });
};
