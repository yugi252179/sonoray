import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import https from 'https';

const prisma = new PrismaClient();

// Helper for reverse geocoding using Nominatim
const reverseGeocode = (lat: number, lon: number): Promise<string | null> => {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    const options = {
      headers: {
        'User-Agent': 'ERP-Tracking-App' // Nominatim requires a user agent
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.display_name || null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error('Geocoding error:', err);
      resolve(null);
    });
  });
};

// POST /api/tracking/update
export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, latitude, longitude, batteryLevel } = req.body;

    if (!employeeId || latitude === undefined || longitude === undefined) {
      res.status(400).json({ message: 'Missing required location fields' });
      return;
    }

    // Verify employee has an active punch-in (is on-duty)
    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        status: 'PRESENT',
        punchOutTime: null
      }
    });

    if (!activeAttendance) {
      res.status(200).json({ message: 'Tracking stopped: Employee is off duty' });
      return;
    }

    // Try to get address
    let address = await reverseGeocode(latitude, longitude);
    if (!address) {
      address = `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }

    const log = await prisma.gpsLog.create({
      data: {
        employeeId,
        latitude,
        longitude,
        address,
        batteryLevel
      }
    });

    // Fetch employee name and image for the socket update
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { firstName: true, lastName: true, profileImage: true }
    });

    // Notify admin via socket
    const io = req.app.get('socketio');
    if (io) {
      io.emit('employeeLocationUpdate', {
        employeeId,
        name: employee ? `${employee.firstName} ${employee.lastName}` : 'Employee',
        profileImage: employee?.profileImage || null,
        latitude,
        longitude,
        address,
        batteryLevel,
        timestamp: log.timestamp
      });
    }

    res.status(201).json({ message: 'Location updated', log });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/tracking/active
export const getActiveLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    today.setUTCHours(0, 0, 0, 0);

    const employees = await prisma.employee.findMany({
      where: {
        user: { isActive: true }
      },
      include: {
        user: { select: { email: true, role: true } },
        gpsLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        attendance: {
          where: {
            status: 'PRESENT',
            punchOutTime: null
          }
        }
      }
    });

    const activeLocations = employees.map(emp => {
      const lastLog = emp.gpsLogs.length > 0 ? emp.gpsLogs[0] : null;
      const isOnDuty = emp.attendance.length > 0;
      
      // Check if location is stale (older than 5 minutes)
      let isStale = false;
      if (lastLog) {
        const diffMinutes = (now.getTime() - new Date(lastLog.timestamp).getTime()) / (1000 * 60);
        if (diffMinutes > 5) isStale = true;
      }

      return {
        employeeId: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        profileImage: emp.profileImage || null,
        email: emp.user.email,
        role: emp.user.role,
        isOnDuty: isOnDuty,
        isStale: isStale,
        // Always return last known location if they are on duty
        latitude: lastLog ? lastLog.latitude : null,
        longitude: lastLog ? lastLog.longitude : null,
        address: lastLog ? lastLog.address : null,
        batteryLevel: lastLog ? lastLog.batteryLevel : null,
        timestamp: lastLog ? lastLog.timestamp : null
      };
    });

    res.json(activeLocations);
  } catch (error) {
    console.error('Get active locations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
