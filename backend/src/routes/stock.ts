import { Router } from 'express';
import { getStock, createStock, updateStock, deleteStock } from '../controllers/stock';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getStock);
router.post('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), createStock);
router.put('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateStock);
router.delete('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), deleteStock);

export default router;
