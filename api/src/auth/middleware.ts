import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './tokens';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

/** Use on routes behind `verifyJwt` (Express 5 typings omit `userId` on `Request`). */
export function getUserId(req: Request): string {
  return (req as unknown as AuthenticatedRequest).userId;
}

/** Require `Authorization: Bearer <access JWT>`. Export for use across the API. */
export async function verifyJwt(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', status: 401 });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { userId } = await verifyAccessToken(token);
    (req as unknown as AuthenticatedRequest).userId = userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token', status: 401 });
  }
}
