import { Router } from 'express';
import { getDepartments, createDepartment, deleteDepartment } from '../controllers/department';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getDepartments);
router.post('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HR']), createDepartment);
router.delete('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HR']), deleteDepartment);

export default router;
