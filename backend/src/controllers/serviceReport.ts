import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createServiceReport = async (req: any, res: Response): Promise<void> => {
  try {
    const { 
      ticketId, breakdownDetails, workDone, 
      partsReplaced, customerSignature, photoUrl, status,
      latitude, longitude
    } = req.body;
    const engineerId = req.user.employeeId;

    if (!engineerId) {
      res.status(403).json({ message: 'Only engineers can file reports' });
      return;
    }

    const report = await prisma.serviceReport.create({
      data: {
        ticketId,
        engineerId,
        breakdownDetails,
        workDone,
        partsReplaced,
        customerSignature,
        photoUrl,
        status,
        latitude,
        longitude
      }
    });

    // If status is COMPLETED, update the ticket status
    if (status === 'COMPLETED') {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'RESOLVED' }
      });
    }

    res.status(201).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTicketReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const reports = await prisma.serviceReport.findMany({
      where: { ticketId: ticketId as string },
      include: { engineer: true },
      orderBy: { visitDate: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
