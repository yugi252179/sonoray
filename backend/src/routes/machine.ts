import { Router } from 'express';
import { getAllMachines, createMachine, updateMachine, deleteMachine } from '../controllers/machine';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAllMachines);
router.post('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER', 'EMPLOYEE']), createMachine);
router.put('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'SERVICE_MANAGER', 'SALES_MANAGER', 'EMPLOYEE']), updateMachine);
router.delete('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), deleteMachine);

export default router;
