import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/tickets — All tickets (Admin)
export const getAllTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        customer: { select: { companyName: true, address: true } },
        machine: { select: { machineName: true, serialNumber: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        serviceReports: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/tickets/my — Tickets assigned to current engineer
export const getMyTickets = async (req: any, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      res.json([]);
      return;
    }
    const tickets = await prisma.ticket.findMany({
      where: { assignedToId: employeeId },
      include: {
        customer: { select: { companyName: true, address: true } },
        machine: { select: { machineName: true, serialNumber: true } },
      },
      orderBy: { scheduledDate: 'asc' }
    });
    res.json(tickets);
  } catch (error) {
    console.error('Get my tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/tickets/:id — Single ticket detail
export const getTicketById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: id as string },
      include: {
        customer: { select: { companyName: true, address: true, phone: true } },
        machine: { select: { machineName: true, serialNumber: true, warrantyEndDate: true } },
        assignedTo: { select: { firstName: true, lastName: true, phone: true } },
        serviceReports: {
          include: { engineer: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }
    res.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/tickets — Create/Assign ticket (Admin)
export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerId, machineId, assignedToId,
      title, description, priority,
      scheduledDate, hospitalName, location
    } = req.body;

    if (!title || !description) {
      res.status(400).json({ message: 'Title and description are required' });
      return;
    }

    // customerId is optional — ticket can exist without a linked customer record
    const ticketData: any = {
      title,
      description,
      machineId: machineId || null,
      assignedToId: assignedToId || null,
      priority: priority || 'MEDIUM',
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      hospitalName: hospitalName || null,
      location: location || null,
    };

    if (customerId) {
      ticketData.customerId = customerId;
    } else {
      // Create a placeholder customer if none provided
      const placeholderUser = await (prisma as any).user.create({
        data: {
          email: `ticket_${Date.now()}@sonoray.internal`,
          passwordHash: 'no_login',
          role: 'CUSTOMER',
          isActive: false
        }
      });
      const placeholderCustomer = await (prisma as any).customer.create({
        data: {
          userId: placeholderUser.id,
          companyName: hospitalName || 'Walk-in Customer',
          contactName: 'N/A',
          phone: '0000000000',
          address: location || 'N/A',
        }
      });
      ticketData.customerId = placeholderCustomer.id;
    }

    const ticket = await prisma.ticket.create({
      data: ticketData,
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        customer: { select: { companyName: true } }
      }
    });
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error: ' + (error as any).message });
  }
};

// PATCH /api/tickets/:id/status — Update ticket status (Admin)
export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, assignedToId, scheduledDate, hospitalName, location, priority } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (hospitalName !== undefined) updateData.hospitalName = hospitalName || null;
    if (location !== undefined) updateData.location = location || null;
    if (priority) updateData.priority = priority;

    const ticket = await prisma.ticket.update({
      where: { id: id as string },
      data: updateData
    });
    res.json(ticket);
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/tickets/:id/complete — Employee marks ticket as finished with Drive URL
export const completeTicket = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { driveUrl, workDone, breakdownDetails, partsReplaced } = req.body;
    const employeeId = req.user.employeeId;

    if (!employeeId) {
      res.status(403).json({ message: 'No employee record linked' });
      return;
    }

    // Update ticket status to RESOLVED and save drive URL
    await prisma.ticket.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        driveUrl: driveUrl || null
      }
    });

    // Create a service report entry
    const report = await prisma.serviceReport.create({
      data: {
        ticketId: id,
        engineerId: employeeId,
        breakdownDetails: breakdownDetails || null,
        workDone: workDone || null,
        partsReplaced: partsReplaced || null,
        driveUrl: driveUrl || null,
        status: 'COMPLETED'
      }
    });

    res.json({ message: 'Ticket marked as completed', report });
  } catch (error) {
    console.error('Complete ticket error:', error);
    res.status(500).json({ message: 'Server error: ' + (error as any).message });
  }
};

// DELETE /api/tickets/:id — Delete ticket (Admin)
export const deleteTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    // Delete service reports first
    await prisma.serviceReport.deleteMany({ where: { ticketId: id } });
    await prisma.ticket.delete({ where: { id } });
    res.json({ message: 'Ticket deleted' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
