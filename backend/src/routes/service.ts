import { Router } from 'express';
import { createServiceReport, getTicketReports } from '../controllers/serviceReport';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/report', authenticate, createServiceReport);
router.get('/ticket/:ticketId', authenticate, getTicketReports);

export default router;
