import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * 为每个请求生成一个唯一的ID
 * @param req 请求对象
 * @param res 响应对象
 * @param next 下一个中间件
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  res.setHeader('X-Request-Id', requestId);
  next();
};
