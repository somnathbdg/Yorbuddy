import { Router } from 'express';
import { createReport, getReports, updateReportStatus } from '../services/reportService.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/reports
 * Submit a safety report.
 */
router.post('/', authenticate, createReport);

/**
 * GET /api/reports
 * Get all reports (admin only).
 */
router.get('/', authenticate, requireRole('admin'), getReports);

/**
 * PATCH /api/reports/:id
 * Update report status (admin only).
 */
router.patch('/:id', authenticate, requireRole('admin'), updateReportStatus);

export default router;
