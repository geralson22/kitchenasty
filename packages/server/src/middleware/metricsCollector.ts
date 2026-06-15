import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/db.js';
import { metricsLogger } from '../lib/logger.js';

const CUID_OR_UUID = /[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function normalizePath(path: string): string {
  return path.replace(CUID_OR_UUID, ':id');
}

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
    return ip;
  }
  return req.socket?.remoteAddress?.replace('::ffff:', '');
}

export function metricsCollector(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const path = normalizePath(req.path);
    if (path === '/api/health') return;

    const responseTime = Date.now() - start;

    prisma.apiMetric.create({
      data: {
        method: req.method,
        path,
        statusCode: res.statusCode,
        responseTime,
        requestId: String(req.id),
        userId: req.user?.id,
        userType: req.user?.type,
        ipAddress: getClientIp(req),
      },
    }).catch((err) => {
      metricsLogger.error({ err }, 'Failed to record API metric');
    });
  });

  next();
}
