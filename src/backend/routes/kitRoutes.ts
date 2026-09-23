import { Router } from 'express';
import {
  createKit,
  runResearchOnly,
  generateKitProtected,
  getKits,
  getKitById,
  updateKit,
  deleteKit,
  regenerateSection,
} from '../controllers/kitController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken as any);

router.post('/research', runResearchOnly as any);
router.post('/generate', generateKitProtected as any);
router.post('/', createKit as any);
router.get('/', getKits as any);
router.get('/:id', getKitById as any);
router.put('/:id', updateKit as any);
router.delete('/:id', deleteKit as any);
router.post('/:id/regenerate', regenerateSection as any);

export default router;
