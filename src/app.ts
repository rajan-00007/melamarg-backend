import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import logger from './utils/logger';

import { requestLogger } from './middleware/loggerMiddleware';
import authRoutes from './modules/auth/auth.routes';
import eventsRoutes from './modules/events/events.routes';
import poiRoutes from './modules/pois/poi.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import { eventRoutesRouter, generalRoutesRouter } from './modules/routes/routes.routes';
import { eventAdvisoriesRouter, generalAdvisoriesRouter } from './modules/advisories/advisories.routes';
import parkingRoutes from './modules/parking/parking.routes';
import zonesRoutes from './modules/zones/zones.routes';
import { eventHighlightsRouter, generalHighlightsRouter } from './modules/highlights/highlights.routes';
import meetupRoutes from './modules/meetup/meetup.routes';
import feedbackRoutes from './modules/feedback/feedback.routes';

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Dynamically allow any origin (required for credential support with wildcard-like behavior)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);
 
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/pois', poiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events/:eventId/routes', eventRoutesRouter);
app.use('/api/routes', generalRoutesRouter);
app.use('/api/events/:eventId/advisories', eventAdvisoriesRouter);
app.use('/api/advisories', generalAdvisoriesRouter);
app.use('/api/parking', parkingRoutes);
app.use('/api/events/:eventId/zones', zonesRoutes);
app.use('/api/events/:eventId/highlights', eventHighlightsRouter);
app.use('/api/highlights', generalHighlightsRouter);
app.use('/api/meetup', meetupRoutes);
app.use('/api/feedback', feedbackRoutes);

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
