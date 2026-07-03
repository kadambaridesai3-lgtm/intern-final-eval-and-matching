import { Router } from 'express';
import { getPrisma } from '../lib/prisma';

const router = Router();
const prisma = getPrisma();

// GET /api/audit-logs
router.get('/', async (req, res) => {
  try {
    const logs = await prisma.corporateAuditLog.findMany({
      orderBy: { date_time: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch corporate audit logs' });
  }
});

export default router;
