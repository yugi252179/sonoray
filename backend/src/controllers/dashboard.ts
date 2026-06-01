import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalMachines = await prisma.machineInstallation.count();
    const activeWarranty = await prisma.machineInstallation.count({
      where: {
        warrantyEndDate: { gte: new Date() }
      }
    });
    const pendingBreakdowns = await prisma.ticket.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    });
    
    // Employee attendance today (aligned to UTC midnight timezone to match database records exactly)
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const presentToday = await prisma.attendance.count({
      where: { 
        date: today,
        status: 'PRESENT'
      }
    });

    // Stock stats
    const lowStock = await prisma.stock.findMany({
      where: {
        quantity: { lt: 5 }
      }
    });

    // Revenue (Sum of machine amounts) - Simple example
    const totalRevenue = await prisma.machineInstallation.aggregate({
      _sum: { amount: true }
    });

    res.json({
      totalMachines,
      activeWarranty,
      pendingBreakdowns,
      presentToday,
      lowStockCount: lowStock.length,
      totalRevenue: totalRevenue._sum.amount || 0
    });
  } catch (error) {
    console.error('Dashboard stats error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
