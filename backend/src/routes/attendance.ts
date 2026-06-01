import { Router } from 'express';
import { punchIn, punchOut, getAttendance, getMyAttendance, updateAttendanceStatus, markBulkHoliday, getAttendanceStats } from '../controllers/attendance';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/punch-in', authenticate, punchIn);
router.post('/punch-out', authenticate, punchOut);
router.post('/status-update', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HR']), updateAttendanceStatus);
router.post('/bulk-holiday', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HR']), markBulkHoliday);
router.get('/stats', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HR']), getAttendanceStats);
router.get('/my-history', authenticate, getMyAttendance);
router.get('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HR']), getAttendance);

export default router;
