import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { BadRequest } from '../middleware/errorHandler.js';
import { getAiFriendVerification, sendAiFriendMessage, AiFriendMessage } from '../services/aiFriendService.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string().min(1).max(2000),
  }).strict()).max(12).optional().default([]),
}).strict();

router.get('/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getAiFriendVerification(req.user!.id);
    res.status(200).json({ data: status });
  } catch (error) {
    next(error);
  }
});

router.post('/chat', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) throw BadRequest('Enter a message of up to 2,000 characters.');
    const reply = await sendAiFriendMessage(
      req.user!.id,
      parsed.data.history as AiFriendMessage[],
      parsed.data.message
    );
    res.status(200).json({ data: { reply } });
  } catch (error) {
    next(error);
  }
});

export default router;
