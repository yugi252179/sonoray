import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    employeeId?: string | null;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, decoded: any) => {
    if (err) {
      res.status(403).json({ message: 'Failed to authenticate token' });
      return;
    }
    
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      employeeId: decoded.employeeId
    };
    next();
  });
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      console.log(`Unauthorized role: user role is ${req.user?.role}, required one of: ${roles.join(', ')}`);
      res.status(403).json({ message: 'Unauthorized role' });
      return;
    }
    next();
  };
};
