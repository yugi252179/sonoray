import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HR', 'SERVICE_MANAGER']), getDashboardStats);

export default router;
