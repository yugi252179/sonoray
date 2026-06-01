import { Request, Response } from 'express';
import { PrismaClient, LeaveStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const requestLeave = async (req: any, res: Response): Promise<void> => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const employeeId = req.user.employeeId;

    if (!employeeId) {
      res.status(400).json({ message: 'Not an employee' });
      return;
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason
      }
    });

    res.status(201).json(leave);
  } catch (error) {
    console.error('Request leave error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLeaveRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, employeeId } = req.query;
    const where: any = {};
    if (status) where.status = status as LeaveStatus;
    if (employeeId) where.employeeId = employeeId as string;

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: { firstName: true, lastName: true, department: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLeaveStatus = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.userId;

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as LeaveStatus,
        approvedBy: adminId
      }
    });

    // If approved, optionally mark attendance as LEAVE for those days
    if (status === 'APPROVED') {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days: Date[] = [];
      let curr = new Date(start);
      while (curr <= end) {
        days.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }

      const operations = days.map(date => {
        date.setHours(0, 0, 0, 0);
        return prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: leave.employeeId,
              date
            }
          },
          update: {
            status: 'LEAVE',
            remarks: `Approved Leave: ${leave.reason || 'No reason'}`,
            approvedBy: adminId
          },
          create: {
            employeeId: leave.employeeId,
            date,
            status: 'LEAVE',
            remarks: `Approved Leave: ${leave.reason || 'No reason'}`,
            approvedBy: adminId,
            month: date.getMonth() + 1,
            year: date.getFullYear()
          }
        });
      });

      await prisma.$transaction(operations);
    }

    res.json(leave);
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
