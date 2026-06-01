import { Router } from 'express';
import { requestLeave, getLeaveRequests, updateLeaveStatus } from '../controllers/leave';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/request', authenticate, requestLeave);
router.get('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HR']), getLeaveRequests);
router.patch('/:id/status', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HR']), updateLeaveStatus);

export default router;
