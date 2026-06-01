import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/chat/:employeeId
export const getChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const otherEmployeeId = req.params.employeeId as string;
    const currentEmployeeId = req.query.currentEmployeeId as string;

    if (!currentEmployeeId) {
      res.status(400).json({ message: 'Missing currentEmployeeId in query' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentEmployeeId as any, receiverId: otherEmployeeId as any },
          { senderId: otherEmployeeId as any, receiverId: currentEmployeeId as any },
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
