import { getPrisma } from '../lib/prisma';

const prisma = getPrisma();

export const corporateLogger = {
  async log(
    level: 'INFO' | 'WARNING' | 'ERROR' | 'AUDIT',
    moduleName: string,
    action: string,
    description: string,
    user: string = 'System Admin',
    req?: any
  ) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] [${moduleName}] [${action}] ${description} (by ${user})`);

    // Only write AUDIT or ERROR levels to database for efficiency and cleaner log traces
    if (level === 'AUDIT' || level === 'ERROR') {
      try {
        let ip = null;
        let userAgent = null;
        if (req) {
          ip = req.ip || req.headers['x-forwarded-for'] || null;
          userAgent = req.headers['user-agent'] || null;
        }

        await prisma.corporateAuditLog.create({
          data: {
            user,
            module: moduleName,
            action,
            description,
            ip_address: ip,
            browser: userAgent ? userAgent.substring(0, 255) : null,
            device: 'Windows Company PC'
          }
        });
      } catch (err) {
        console.error('Audit Logger failed to log to DB:', err);
      }
    }
  }
};

// Corporate-safe Error Handler helper that returns standard format and hides sensitive info
export function handleApiError(res: any, error: any, customMessage?: string) {
  console.error('[API Error Details]:', error);
  res.status(500).json({
    success: false,
    message: customMessage || 'Operation failed. Please contact the system administrator.',
    details: []
  });
}
