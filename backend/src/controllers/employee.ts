import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ONLY ADMIN CAN create employees
export const createEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role, firstName, lastName, phone, departmentId, reportingToId, designation } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.isActive) {
        res.status(400).json({ message: 'User already exists' });
        return;
      } else {
        // Old inactive user exists - clean it up so we can recreate
        const oldEmployee = await prisma.employee.findUnique({ where: { userId: existingUser.id } });
        if (oldEmployee) {
          await prisma.gpsLog.deleteMany({ where: { employeeId: oldEmployee.id } });
          await prisma.attendance.deleteMany({ where: { employeeId: oldEmployee.id } });
          await prisma.message.deleteMany({ where: { OR: [{ senderId: oldEmployee.id }, { receiverId: oldEmployee.id }] } });
          await prisma.employee.delete({ where: { id: oldEmployee.id } });
        }
        await prisma.user.delete({ where: { id: existingUser.id } });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newEmployee = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: role || 'FIELD_EMPLOYEE'
        }
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          phone,
          departmentId,
          reportingToId,
          designation
        }
      });

      return { user, employee };
    });

    res.status(201).json({ message: 'Employee created successfully', data: newEmployee });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        user: {
          isActive: true
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        department: true,
        gpsLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, departmentId, designation } = req.body;

    const employee = await prisma.employee.update({
      where: { id: id as string },
      data: { firstName, lastName, phone, departmentId, designation }
    });

    res.json({ message: 'Employee updated', employee });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const employee = await prisma.employee.findUnique({ where: { id: id as string } });
    if (!employee) {
      res.status(404).json({ message: 'Employee not found' });
      return;
    }

    // Perform hard delete within a transaction to handle relations
    await prisma.$transaction(async (tx) => {
      // 1. Delete standalone records
      await tx.gpsLog.deleteMany({ where: { employeeId: employee.id } });
      await tx.attendance.deleteMany({ where: { employeeId: employee.id } });
      await tx.leaveRequest.deleteMany({ where: { employeeId: employee.id } });
      await tx.socialPost.deleteMany({ where: { authorId: employee.id } });
      await tx.message.deleteMany({ 
        where: { 
          OR: [{ senderId: employee.id }, { receiverId: employee.id }] 
        } 
      });
      
      // 2. Handle linked records (Nullify assignments or delete reports)
      // Service reports depend on the engineer
      await tx.serviceReport.deleteMany({ where: { engineerId: employee.id } });
      
      // Update tickets to unassign this employee
      await tx.ticket.updateMany({
        where: { assignedToId: employee.id },
        data: { assignedToId: null }
      });
      
      // 3. Delete employee record
      await tx.employee.delete({ where: { id: employee.id } });
      
      // 4. Delete user record
      await tx.user.delete({ where: { id: employee.userId } });
    });

    // Notify all clients (especially the Admin map) to remove this employee marker
    const io = req.app.get('socketio');
    if (io) {
      io.emit('employeeDeleted', { employeeId: employee.id });
    }

    res.json({ message: 'Employee deleted permanently' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateEmployeeRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // userId
    const { role } = req.body;

    await prisma.user.update({
      where: { id: id as string },
      data: { role }
    });

    res.json({ message: `Role updated to ${role}` });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEmployeeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id: id as string },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        department: true,
        attendance: {
          orderBy: { date: 'desc' },
          take: 10
        },
        gpsLogs: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    });

    if (!employee) {
      res.status(404).json({ message: 'Employee not found' });
      return;
    }

    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    if (!authReq.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const { userId } = authReq.user;
    const { firstName, lastName, phone, password, profileImage } = req.body;

    const dataToUpdate: any = {};
    if (firstName !== undefined) dataToUpdate.firstName = firstName;
    if (lastName !== undefined) dataToUpdate.lastName = lastName;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (profileImage !== undefined) dataToUpdate.profileImage = profileImage;

    // Check if employee record exists for this user
    const employeeExists = await prisma.employee.findUnique({ where: { userId } });

    if (employeeExists) {
      await prisma.employee.update({
        where: { userId },
        data: dataToUpdate
      });
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });
    }

    // Fetch the updated user and linked employee data
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        employee: true
      }
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Update my profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
