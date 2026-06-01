import { Request, Response } from 'express';
import { PrismaClient, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const punchIn = async (req: any, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.employeeId;

    if (!employeeId) {
      res.status(400).json({ message: 'User is not an employee' });
      return;
    }

    const { date: providedDate } = req.body;
    const now = new Date();
    
    let today: Date;
    if (providedDate && typeof providedDate === 'string' && providedDate.includes('-')) {
      const parts = providedDate.split('T')[0].split('-').map(Number);
      today = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    } else {
      today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    }
    today.setUTCHours(0, 0, 0, 0);

    // Check if already punched in today
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today
        }
      }
    });

    if (existing && existing.status === 'PRESENT' && existing.punchInTime) {
      res.status(400).json({ message: 'Already punched in today' });
      return;
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: today
        }
      },
      update: {
        status: 'PRESENT',
        punchInTime: new Date(),
        month: today.getUTCMonth() + 1,
        year: today.getUTCFullYear()
      },
      create: {
        employeeId,
        date: today,
        status: 'PRESENT',
        punchInTime: new Date(),
        month: today.getUTCMonth() + 1,
        year: today.getUTCFullYear()
      }
    });

    // Notify admin via socket that the employee punched in
    const io = (req as any).app.get('socketio');
    if (io) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { firstName: true, lastName: true, user: { select: { email: true, role: true } } }
      });
      if (employee) {
        io.emit('employeeLocationUpdate', {
          employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.user.email,
          role: employee.user.role,
          isOnDuty: true,
          isStale: false,
          latitude: null,
          longitude: null,
          address: 'Punched In (On Duty)',
          timestamp: new Date().toISOString()
        });
      }
    }

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Punch in error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const punchOut = async (req: any, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.employeeId;

    if (!employeeId) {
      res.status(400).json({ message: 'User is not an employee' });
      return;
    }

    // Find the most recent punch-in that doesn't have a punch-out yet
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        status: 'PRESENT',
        punchOutTime: null
      },
      orderBy: {
        date: 'desc'
      }
    });

    if (!attendance) {
      res.status(400).json({ message: 'No active punch-in found' });
      return;
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        punchOutTime: new Date()
      }
    });

    // Notify admin via socket that the employee punched out
    const io = (req as any).app.get('socketio');
    if (io) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { firstName: true, lastName: true, user: { select: { email: true, role: true } } }
      });
      if (employee) {
        io.emit('employeeLocationUpdate', {
          employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.user.email,
          role: employee.user.role,
          isOnDuty: false,
          isStale: false,
          address: 'Punched Out (Off Duty)',
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Punch out error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, month, year, departmentId } = req.query;
    
    const where: any = {};
    if (employeeId) where.employeeId = employeeId as string;
    if (month) where.month = parseInt(month as string);
    if (year) where.year = parseInt(year as string);
    if (departmentId) {
      where.employee = { departmentId: departmentId as string };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: { firstName: true, lastName: true, department: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    res.json(records);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyAttendance = async (req: any, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.employeeId;
    const { year } = req.query;

    if (!employeeId) {
      res.status(400).json({ message: 'Not an employee' });
      return;
    }

    const where: any = { employeeId };
    if (year) where.year = parseInt(year as string);

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    res.json(records);
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAttendanceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, date, status, remarks, punchInTime, punchOutTime } = req.body;
    const adminId = (req as any).user.userId;

    if (!employeeId || !date || !status) {
      res.status(400).json({ message: 'Missing fields' });
      return;
    }

    // Parse YYYY-MM-DD as local date to avoid timezone shifting
    console.log('Marking attendance for:', { employeeId, date, status });
    let attendanceDate: Date;
    
    if (typeof date === 'string' && date.includes('-')) {
      const parts = date.split('T')[0].split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        attendanceDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      } else {
        attendanceDate = new Date(date);
      }
    } else {
      attendanceDate = new Date(date);
    }
    
    // Ensure it's exactly UTC midnight
    if (!isNaN(attendanceDate.getTime())) {
      attendanceDate.setUTCHours(0, 0, 0, 0);
    }

    if (isNaN(attendanceDate.getTime())) {
      console.error('Invalid date provided:', date);
      res.status(400).json({ message: 'Invalid date format' });
      return;
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate
        }
      },
      update: {
        status: status as AttendanceStatus,
        remarks,
        approvedBy: adminId,
        ...(punchInTime ? { punchInTime: new Date(punchInTime) } : {}),
        ...(punchOutTime ? { punchOutTime: new Date(punchOutTime) } : {}),
      },
      create: {
        employeeId,
        date: attendanceDate,
        status: status as AttendanceStatus,
        remarks,
        approvedBy: adminId,
        month: attendanceDate.getUTCMonth() + 1,
        year: attendanceDate.getUTCFullYear(),
        ...(punchInTime ? { punchInTime: new Date(punchInTime) } : {}),
        ...(punchOutTime ? { punchOutTime: new Date(punchOutTime) } : {}),
      }
    });

    res.json(attendance);
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markBulkHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, remarks } = req.body;
    const adminId = (req as any).user.userId;

    if (!date) {
      res.status(400).json({ message: 'Date is required' });
      return;
    }

    // Parse YYYY-MM-DD as local date to avoid timezone shifting
    let holidayDate: Date;
    if (typeof date === 'string' && date.includes('-')) {
      const parts = date.split('T')[0].split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        holidayDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      } else {
        holidayDate = new Date(date);
      }
    } else {
      holidayDate = new Date(date);
    }
    
    // Ensure it's exactly UTC midnight
    if (!isNaN(holidayDate.getTime())) {
      holidayDate.setUTCHours(0, 0, 0, 0);
    }

    if (isNaN(holidayDate.getTime())) {
      res.status(400).json({ message: 'Invalid date format' });
      return;
    }

    const employees = await prisma.employee.findMany({
      where: { user: { isActive: true } }
    });

    const operations = employees.map(emp => 
      prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: holidayDate
          }
        },
        update: {
          status: 'HOLIDAY',
          remarks: remarks || 'Public Holiday',
          approvedBy: adminId
        },
        create: {
          employeeId: emp.id,
          date: holidayDate,
          status: 'HOLIDAY',
          remarks: remarks || 'Public Holiday',
          approvedBy: adminId,
          month: holidayDate.getUTCMonth() + 1,
          year: holidayDate.getUTCFullYear()
        }
      })
    );

    await prisma.$transaction(operations);

    res.json({ message: `Holiday marked for ${employees.length} employees` });
  } catch (error) {
    console.error('Bulk holiday error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAttendanceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const [totalEmployees, presentToday, absentToday, onLeaveToday] = await Promise.all([
      prisma.employee.count({ where: { user: { isActive: true } } }),
      prisma.attendance.count({ where: { date: today, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { date: today, status: 'ABSENT' } }),
      prisma.attendance.count({ where: { date: today, status: 'LEAVE' } }),
    ]);

    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const totalRecords = await prisma.attendance.count({
      where: {
        date: { gte: start, lte: end },
        status: 'PRESENT'
      }
    });
    
    const daysPassed = today.getDate();
    const avgAttendance = totalEmployees > 0 && daysPassed > 0 
      ? (totalRecords / (totalEmployees * daysPassed)) * 100 
      : 0;

    res.json({
      totalEmployees,
      presentToday,
      absentToday,
      onLeaveToday,
      avgAttendance: avgAttendance.toFixed(1)
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

