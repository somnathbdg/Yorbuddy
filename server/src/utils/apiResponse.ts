import { Response } from 'express';

/**
 * Standardized success response wrapper.
 */
export function successResponse<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: Record<string, unknown>
): void {
  const response: Record<string, unknown> = { data };
  if (meta) {
    response.meta = meta;
  }
  res.status(statusCode).json(response);
}

/**
 * Paginated response helper.
 */
export function paginatedResponse<T>(
  res: Response,
  data: T[],
  page: number,
  perPage: number,
  total: number
): void {
  const totalPages = Math.ceil(total / perPage);
  successResponse(res, data, 200, {
    page,
    per_page: perPage,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  });
}

/**
 * Parse pagination params from query string.
 */
export function parsePagination(query: {
  page?: string;
  per_page?: string;
}): { page: number; perPage: number; offset: number } {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page || '20', 10) || 20));
  const offset = (page - 1) * perPage;
  return { page, perPage, offset };
}
