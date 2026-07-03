import { Router } from 'express';
import { getPrisma } from '../lib/prisma';

const router = Router();
const prisma = getPrisma();

// GET /api/upload-history
router.get('/', async (req, res) => {
  try {
    const history = await prisma.uploadHistory.findMany({
      orderBy: { upload_time: 'desc' }
    });
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch upload history' });
  }
});

// POST /api/upload-history
router.post('/', async (req, res) => {
  try {
    const { file_name, records_imported, status, module, uploaded_by } = req.body;
    const record = await prisma.uploadHistory.create({
      data: {
        file_name,
        records_imported: Number(records_imported || 0),
        status: status || 'Success',
        module: module || 'General',
        uploaded_by: uploaded_by || 'System Admin',
      }
    });
    res.json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to log history' });
  }
});

export default router;
