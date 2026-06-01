import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllMachines = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const machines = await prisma.machineInstallation.findMany({
      where: search ? {
        OR: [
          { serialNumber: { contains: search as string } },
          { machineName: { contains: search as string } },
          { customer: { companyName: { contains: search as string } } }
        ]
      } : {},
      include: { customer: true }
    });
    res.json(machines);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const parseDate = (val: any): Date | null => {
  if (val === undefined || val === null || val === '' || val === 'null') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const parseRequiredDate = (val: any): Date => {
  if (!val) return new Date();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

const parseFloatOrNull = (val: any): number | null => {
  if (val === undefined || val === null || val === '') return null;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
};

export const createMachine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      serialNumber, machineName, installationDate, 
      customerId, manualCustomer, amount, 
      warrantyStartDate, warrantyEndDate, 
      amcStartDate, amcEndDate,
      contractType,
      probe1Model, probe1Serial,
      probe2Model, probe2Serial,
      probe3Model, probe3Serial,
      probe4Model, probe4Serial,
      probe5Model, probe5Serial,
      otherDevice,
      latitude, longitude, address, imageUrl
    } = req.body;

    let finalCustomerId = customerId;

    // Handle manual customer creation if requested
    if (!customerId && manualCustomer) {
      const { companyName, contactName, phone, address, email } = manualCustomer;
      
      // Create a placeholder user for the manual customer
      const newUser = await prisma.user.create({
        data: {
          email: email || `cust_${Date.now()}@sonoray.com`,
          passwordHash: 'manual_entry_no_login',
          role: 'CUSTOMER',
          isActive: false
        }
      });

      const newCustomer = await prisma.customer.create({
        data: {
          userId: newUser.id,
          companyName,
          contactName: contactName || 'Primary Contact',
          phone: phone || '0000000000',
          address: address || 'N/A',
          email
        }
      });
      finalCustomerId = newCustomer.id;
    }

    const machine = await prisma.machineInstallation.create({
      data: {
        serialNumber,
        machineName,
        installationDate: parseRequiredDate(installationDate),
        customerId: finalCustomerId,
        amount: amount ? parseFloat(amount) : 0,
        warrantyStartDate: parseDate(warrantyStartDate),
        warrantyEndDate: parseDate(warrantyEndDate),
        amcStartDate: parseDate(amcStartDate),
        amcEndDate: parseDate(amcEndDate),
        contractType: contractType || 'WARRANTY',
        status: 'ACTIVE',
        probe1Model, probe1Serial,
        probe2Model, probe2Serial,
        probe3Model, probe3Serial,
        probe4Model, probe4Serial,
        probe5Model, probe5Serial,
        otherDevice,
        latitude: parseFloatOrNull(latitude),
        longitude: parseFloatOrNull(longitude),
        address: address || null,
        imageUrl: imageUrl || null
      }
    });
    res.status(201).json(machine);
  } catch (error) {
    console.error('Create machine error:', error);
    res.status(500).json({ message: 'Server error: ' + (error as any).message });
  }
};

export const updateMachine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Whitelist only valid fields of MachineInstallation model to prevent Prisma errors
    const allowedFields = [
      'serialNumber', 'machineName', 'installationDate', 'customerId', 'amount',
      'warrantyStartDate', 'warrantyEndDate', 'amcStartDate', 'amcEndDate',
      'contractType', 'status', 'probe1Model', 'probe1Serial', 'probe2Model', 'probe2Serial',
      'probe3Model', 'probe3Serial', 'probe4Model', 'probe4Serial', 'probe5Model', 'probe5Serial',
      'otherDevice', 'latitude', 'longitude', 'address', 'imageUrl'
    ];

    const updateData: any = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    // Parse specific fields robustly
    if (updateData.installationDate !== undefined) {
      updateData.installationDate = parseRequiredDate(updateData.installationDate);
    }
    if (updateData.amount !== undefined) {
      updateData.amount = parseFloatOrNull(updateData.amount);
    }
    if (updateData.latitude !== undefined) {
      updateData.latitude = parseFloatOrNull(updateData.latitude);
    }
    if (updateData.longitude !== undefined) {
      updateData.longitude = parseFloatOrNull(updateData.longitude);
    }
    if (updateData.warrantyStartDate !== undefined) {
      updateData.warrantyStartDate = parseDate(updateData.warrantyStartDate);
    }
    if (updateData.warrantyEndDate !== undefined) {
      updateData.warrantyEndDate = parseDate(updateData.warrantyEndDate);
    }
    if (updateData.amcStartDate !== undefined) {
      updateData.amcStartDate = parseDate(updateData.amcStartDate);
    }
    if (updateData.amcEndDate !== undefined) {
      updateData.amcEndDate = parseDate(updateData.amcEndDate);
    }
    if (updateData.address !== undefined) {
      updateData.address = updateData.address || null;
    }
    if (updateData.imageUrl !== undefined) {
      updateData.imageUrl = updateData.imageUrl || null;
    }

    const machine = await prisma.machineInstallation.update({
      where: { id: id as string },
      data: updateData
    });
    res.json(machine);
  } catch (error) {
    console.error('Update machine error:', error);
    res.status(500).json({ message: 'Server error: ' + (error as any).message });
  }
};

export const deleteMachine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.machineInstallation.delete({ where: { id: id as string } });
    res.json({ message: 'Machine deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
