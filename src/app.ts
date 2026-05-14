import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger';

import { requestLogger } from './middleware/loggerMiddleware';
import authRoutes from './modules/auth/auth.routes';
import eventsRoutes from './modules/events/events.routes';
import poiRoutes from './modules/pois/poi.routes';
import notificationRoutes from './modules/notifications/notification.routes';

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/pois', poiRoutes);
app.use('/api/notifications', notificationRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to MelaMarg API',
    status: 'success'
  });
});

// Error handling middleware (optional but good practice)
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error(err.stack);
  res.status(500).send('Something went wrong!');
});

export default app;
