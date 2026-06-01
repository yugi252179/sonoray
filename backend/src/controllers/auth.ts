import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email: usernameOrEmail, password } = req.body;

    let user = await prisma.user.findUnique({ where: { email: usernameOrEmail } });
    
    // Fallback to prefix matching if standard username is supplied without @ character
    if (!user && usernameOrEmail && !usernameOrEmail.includes('@')) {
      user = await prisma.user.findFirst({
        where: {
          email: {
            startsWith: `${usernameOrEmail.trim()}@`
          }
        }
      });
    }

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Account is deactivated' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        employeeId: employee?.id || null
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        employeeId: employee?.id || null,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Check if super admin already exists
    const existingAdmins = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' }
    });

    if (existingAdmins > 0) {
      res.status(400).json({ message: 'Super admin already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const superAdmin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'SUPER_ADMIN'
      }
    });

    res.status(201).json({ message: 'Super admin created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get current logged in user
export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        employee: {
          include: {
            user: {
              select: {
                email: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get me error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
