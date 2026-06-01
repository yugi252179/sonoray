import { Router } from 'express';
import { getPosts, createPost } from '../controllers/social';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getPosts);
router.post('/', authenticate, createPost);

export default router;
