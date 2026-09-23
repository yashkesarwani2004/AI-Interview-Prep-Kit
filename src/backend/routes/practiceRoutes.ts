import { Router } from 'express';
import {
  getPracticeProgress,
  updatePracticeCard,
  getWeakSpotsReport,
} from '../controllers/practiceController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken as any);

router.get('/:kitId', getPracticeProgress as any);
router.post('/:kitId/rate', updatePracticeCard as any);
router.get('/:kitId/weak-spots', getWeakSpotsReport as any);

export default router;
