import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';

dotenv.config();

// Define general and strict authentication rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 500, // limit each IP to 500 requests per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again in 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // strictly limit login attempts to 30 requests per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes to prevent brute-force attacks.' }
});

import authRouter from './routes/auth';
import employeeRouter from './routes/employee';
import trackingRouter from './routes/tracking';
import chatRouter from './routes/chat';
import stockRouter from './routes/stock';
import attendanceRouter from './routes/attendance';
import departmentRouter from './routes/department';
import leaveRouter from './routes/leave';
import dashboardRouter from './routes/dashboard';
import machineRouter from './routes/machine';
import hospitalRouter from './routes/hospital';
import serviceRouter from './routes/service';
import socialRouter from './routes/social';
import ticketRouter from './routes/ticket';
import uploadRouter from './routes/upload';
import notificationRouter from './routes/notification';
import path from 'path';

const app = express();
const port = process.env.PORT || 5000;
const prisma = new PrismaClient();

// Enable trusting proxies (essential for Cloudflare tunnels / reverse proxies)
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Extremely permissive CORS for dynamic Cloudflare tunnels so CORS never fails
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Apply strict brute-force protection to authentication routes
app.use('/api/auth', authLimiter, authRouter);

// Apply general API protection rate limits to all other API requests
app.use('/api', apiLimiter);

app.use('/api/employees', employeeRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/chat', chatRouter);
app.use('/api/stock', stockRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/leaves', leaveRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/machines', machineRouter);
app.use('/api/hospitals', hospitalRouter);
app.use('/api/service', serviceRouter);
app.use('/api/social', socialRouter);
app.use('/api/tickets', ticketRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/notifications', notificationRouter);

app.get('/', (req, res) => {
  res.send('Sonoray ERP Backend is running! Use /health for status.');
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Register socket to a private room
  socket.on('register', (data) => {
    if (data.employeeId) {
      socket.join(`user_${data.employeeId}`);
      console.log(`Socket ${socket.id} joined room user_${data.employeeId}`);
    }
  });

  socket.on('updateLocation', (data) => {
    socket.broadcast.emit('employeeLocationUpdate', data);
  });

  socket.on('requestLocationRefresh', (data) => {
    const { employeeId } = data;
    if (employeeId) {
      console.log(`Admin requested location refresh for employee: ${employeeId}`);
      io.to(`user_${employeeId}`).emit('forceLocationUpdate');
    }
  });

  socket.on('privateMessage', async (data) => {
    const { senderId, receiverId, content } = data;
    try {
      // Save to database
      const msg = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          content
        }
      });
      // Emit to receiver
      console.log(`Sending message from ${senderId} to user_${receiverId}`);
      io.to(`user_${receiverId}`).emit('newMessage', msg);
      // Emit back to sender so they know it sent successfully
      socket.emit('messageSent', msg);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Global Error Handler - returns full stack traces to the client for easy debugging
app.use((err: any, req: any, res: any, next: any) => {
  console.error('💥 Global Unhandled Error:', err);
  res.status(500).json({
    message: 'Internal Server Error (Global Handler)',
    error: err.message || err,
    stack: err.stack || null
  });
});

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
