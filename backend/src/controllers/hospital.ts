import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllHospitals = async (req: Request, res: Response): Promise<void> => {
  try {
    const hospitals = await prisma.customer.findMany({
      include: { _count: { select: { machines: true } } }
    });
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createHospital = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName, contactName, phone, email, address, region } = req.body;
    
    // Create a user for the hospital too (optional but requested in prompt)
    const newUser = await prisma.user.create({
      data: {
        email: email || `${companyName.replace(/\s/g, '').toLowerCase()}@ultaserve.com`,
        passwordHash: 'placeholder_hash', // In reality, use bcrypt and send welcome email
        role: 'CUSTOMER'
      }
    });

    const hospital = await prisma.customer.create({
      data: {
        userId: newUser.id,
        companyName,
        contactName,
        phone,
        email,
        address,
        region
      }
    });
    res.status(201).json(hospital);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
