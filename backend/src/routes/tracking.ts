import { Router } from 'express';
import { updateLocation, getActiveLocations } from '../controllers/tracking';

const router = Router();

router.post('/update', updateLocation);
router.get('/active', getActiveLocations);

export default router;
