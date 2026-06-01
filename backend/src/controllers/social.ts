import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.socialPost.findMany({
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            designation: true,
            department: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

export const createPost = async (req: Request, res: Response) => {
  const { content, mediaUrl, mediaType } = req.body;
  const userId = (req as any).user.id;

  try {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const post = await prisma.socialPost.create({
      data: {
        content,
        mediaUrl,
        mediaType: mediaType || 'NONE',
        authorId: employee.id
      },
      include: {
        author: true
      }
    });

    // Broadcast to all connected users via socket.io
    const io = req.app.get('socketio');
    io.emit('newSocialPost', post);

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
};
