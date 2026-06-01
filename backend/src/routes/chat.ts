import { Router } from 'express';
import { getChatHistory } from '../controllers/chat';

const router = Router();

router.get('/:employeeId', getChatHistory);

export default router;
