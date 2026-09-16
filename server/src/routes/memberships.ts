import { Router } from 'express';
import {
  createMembershipOrder,
  verifyMembershipPayment,
  getMembershipStatus,
} from '../services/membershipService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/create-order', authenticate, createMembershipOrder);
router.post('/verify', authenticate, verifyMembershipPayment);
router.get('/me', authenticate, getMembershipStatus);

export default router;
