import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { BadRequest } from '../middleware/errorHandler.js';
import { sendAiFriendMessage, AiFriendMessage, confirmAiFriendAdultStatus, getAiFriendChatHistory, saveAiFriendExchange } from '../services/aiFriendService.js';
import { createAiFriendPaymentOrder, getAiFriendSubscriptionStatus, startAiFriendFreeTrial, verifyAiFriendPayment } from '../services/aiFriendSubscriptionService.js';

const router = Router();

// Per-account limits protect the shared free-tier Gemini project from a single
// account consuming the available quota. The built-in memory store is suitable
// for a single backend instance; use a shared Redis store before horizontal scaling.
const aiFriendMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user!.id,
  handler: (_req: Request, res: Response) => res.status(429).json({
    error: { code: 'AI_FRIEND_RATE_LIMIT', message: 'Please wait a moment before sending another AI Friend message.' },
  }),
});
const aiFriendDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 80,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user!.id,
  handler: (_req: Request, res: Response) => res.status(429).json({
    error: { code: 'AI_FRIEND_DAILY_LIMIT', message: 'You have reached today’s AI Friend message limit. Please try again tomorrow.' },
  }),
});

const paymentSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(256),
}).strict();

const planSchema = z.object({ plan_id: z.enum(['DAY_1', 'WEEK_1', 'MONTH_1']) }).strict();

const chatSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  personality: z.enum(['friend', 'listener', 'motivator', 'funny', 'mentor']).optional().default('friend'),
}).strict();

router.post('/adult-confirmation', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await confirmAiFriendAdultStatus(req.user!.id);
    res.status(200).json({ data, message: '18+ confirmation saved.' });
  } catch (error) { next(error); }
});

router.get('/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getAiFriendSubscriptionStatus(req.user!.id);
    res.status(200).json({ data: status });
  } catch (error) {
    next(error);
  }
});

router.get('/subscription/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAiFriendSubscriptionStatus(req.user!.id);
    res.status(200).json({ data });
  } catch (error) { next(error); }
});

router.post('/subscription/trial', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await startAiFriendFreeTrial(req.user!.id);
    res.status(201).json({ data, message: 'Your 24-hour AI Friend free trial has started.' });
  } catch (error) { next(error); }
});

router.post('/subscription/create-order', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) throw BadRequest('Choose a valid AI Friend paid plan.');
    const data = await createAiFriendPaymentOrder(req.user!.id, parsed.data.plan_id);
    res.status(201).json({ data });
  } catch (error) { next(error); }
});

router.post('/subscription/verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) throw BadRequest('Payment verification details are invalid.');
    const data = await verifyAiFriendPayment(req.user!.id, parsed.data);
    res.status(200).json({ data, message: 'AI Friend payment verified successfully.' });
  } catch (error) { next(error); }
});

router.get('/history/:personality', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = z.enum(['friend', 'listener', 'motivator', 'funny', 'mentor']).safeParse(req.params.personality);
    if (!parsed.success) throw BadRequest('Choose a valid AI Friend personality.');
    const messages = await getAiFriendChatHistory(req.user!.id, parsed.data, 100);
    res.status(200).json({ data: { personality: parsed.data, messages } });
  } catch (error) { next(error); }
});

router.post('/chat', authenticate, aiFriendMinuteLimiter, aiFriendDailyLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) throw BadRequest('Enter a message of up to 1,500 characters and choose a valid personality.');
    const savedHistory = await getAiFriendChatHistory(req.user!.id, parsed.data.personality, 8);
    const context: AiFriendMessage[] = savedHistory.map((item) => ({ role: item.role, text: item.text }));
    const reply = await sendAiFriendMessage(req.user!.id, context, parsed.data.message, parsed.data.personality);
    await saveAiFriendExchange(req.user!.id, parsed.data.personality, parsed.data.message, reply);
    res.status(200).json({ data: { reply } });
