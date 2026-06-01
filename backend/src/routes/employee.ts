import { Router } from 'express';
import { createEmployee, getEmployees, updateEmployee, deleteEmployee, updateEmployeeRole, getEmployeeById, updateMyProfile } from '../controllers/employee';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Profile updates for the currently logged in user
router.put('/me/profile', authenticate, updateMyProfile);

// Only Super Admin and Admin can create/view all employees
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), createEmployee);
router.get('/', authenticate, getEmployees);
router.get('/:id', authenticate, getEmployeeById);
router.patch('/:id/role', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), updateEmployeeRole);
router.put('/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), updateEmployee);
router.delete('/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), deleteEmployee);

export default router;
