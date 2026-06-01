import { Router } from 'express';
import { getAllHospitals, createHospital } from '../controllers/hospital';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAllHospitals);
router.post('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HR', 'SALES_MANAGER']), createHospital);

export default router;
