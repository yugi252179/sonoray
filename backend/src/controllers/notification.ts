import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get recent notifications for authenticated user
export const getNotifications = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 notifications to prevent payload bloat
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error while fetching notifications' });
  }
};

// Mark a single notification as read
export const markAsRead = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify notification exists
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    // Verify notification belongs to the authenticated user
    if (notification.userId !== userId) {
      res.status(403).json({ message: 'Unauthorized action' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error while updating notification' });
  }
};

// Mark all of a user's notifications as read
export const markAllAsRead = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ message: 'All notifications successfully marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error while updating notifications' });
  }
};
