import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      code: err.statusCode
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      status: 'error',
      message: 'Database operation failed',
      code: 400
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: err.message,
      code: 400
    });
  }

  // Handle rate limit errors
  if (err.name === 'RateLimitError') {
    return res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later',
      code: 429,
      retryAfter: (err as any).retryAfter
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    code: 500
  });
};
