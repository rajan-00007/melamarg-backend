import { EventsController } from '@modules/events/events.controller';
import { eventsService } from '@modules/events/events.services';
import { validateEventForPublish } from '@modules/events/events.validation';
import { bundleService } from '@modules/bundles/bundle.service';
import { AuthRequest } from '@middleware/auth.middleware';
import { Response } from 'express';

jest.mock('crypto', () => ({ randomUUID: () => 'mock-uuid' }));
jest.mock('@modules/events/events.services');
jest.mock('@modules/events/events.validation');
jest.mock('@modules/bundles/bundle.service');
jest.mock('@utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

describe('EventsController', () => {
  let controller: EventsController;
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new EventsController();
    req = { body: {}, params: {}, user: { id: 'admin1', phone: '123', role: 'admin' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
    (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'evt1', created_by: 'admin1' });
  });

  describe('createEvent', () => {
    it('should return 400 if name is missing', async () => {
      await controller.createEvent(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name is required' });
    });

    it('should return 201 and data on success', async () => {
      req.body = { name: 'Evt', start_date: '2023-01-01', end_date: '2023-01-02' };
      (eventsService.createEvent as jest.Mock).mockResolvedValue({ id: 'evt1' });
      await controller.createEvent(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'evt1' } });
    });

    it('should return 500 on error', async () => {
      req.body = { name: 'Evt' };
      (eventsService.createEvent as jest.Mock).mockRejectedValue(new Error('error'));
      await controller.createEvent(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create event' });
    });
  });

  describe('updateEvent', () => {
    it('should return 404 if event not found', async () => {
      req.params = { id: 'evt1' };
      (eventsService.getEventById as jest.Mock).mockResolvedValue(null);
      await controller.updateEvent(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Event not found' });
    });

    it('should return 403 if user not authorized', async () => {
      req.params = { id: 'evt1' };
      (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'evt1', created_by: 'other' });
      await controller.updateEvent(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'You are not authorized to modify this event' });
    });

    it('should update bbox and other data', async () => {
      req.params = { id: 'evt1' };
      req.body = { north: 1, south: 2, east: 3, west: 4, name: 'New' };
      (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'evt1', created_by: 'admin1' });
      (eventsService.updateEventBBox as jest.Mock).mockResolvedValue({ id: 'evt1' });
      (eventsService.updateEvent as jest.Mock).mockResolvedValue({ id: 'evt1' });
      
      await controller.updateEvent(req as AuthRequest, res as Response);
      
      expect(eventsService.updateEventBBox).toHaveBeenCalledWith('evt1', { north: 1, south: 2, east: 3, west: 4 });
      expect(eventsService.updateEvent).toHaveBeenCalledWith('evt1', { name: 'New' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should update bbox only', async () => {
      req.params = { id: 'evt1' };
      req.body = { north: 1, south: 2, east: 3, west: 4 };
      (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'evt1', created_by: 'admin1' });
      (eventsService.updateEventBBox as jest.Mock).mockResolvedValue({ id: 'evt1' });
      
      await controller.updateEvent(req as AuthRequest, res as Response);
      
      expect(eventsService.updateEventBBox).toHaveBeenCalledWith('evt1', { north: 1, south: 2, east: 3, west: 4 });
      expect(eventsService.updateEvent).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should update data without bbox', async () => {
      req.params = { id: 'evt1' };
      req.body = { name: 'New' };
      (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'evt1', created_by: 'admin1' });
      (eventsService.updateEvent as jest.Mock).mockResolvedValue({ id: 'evt1', name: 'New' });
      
      await controller.updateEvent(req as AuthRequest, res as Response);
      
      expect(eventsService.updateEvent).toHaveBeenCalledWith('evt1', { name: 'New' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if update fails to return event', async () => {
      req.params = { id: 'evt1' };
      req.body = { name: 'New' };
      (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'evt1', created_by: 'admin1' });
      (eventsService.updateEvent as jest.Mock).mockResolvedValue(null);
      
      await controller.updateEvent(req as AuthRequest, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req.params = { id: 'evt1' };
      (eventsService.getEventById as jest.Mock).mockRejectedValue(new Error('err'));
      await controller.updateEvent(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllEvents', () => {
    it('should return all events', async () => {
      (eventsService.getAllEvents as jest.Mock).mockResolvedValue([{ id: 'evt1' }]);
      await controller.getAllEvents(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'evt1' }] });
    });

    it('should return 500 on error', async () => {
      (eventsService.getAllEvents as jest.Mock).mockRejectedValue(new Error('err'));
      await controller.getAllEvents(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getEventById', () => {
    it('should return event', async () => {
      req.params = { id: 'evt1' };
      (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'evt1' });
      await controller.getEventById(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if event not found', async () => {
      req.params = { id: 'evt1' };
      (eventsService.getEventById as jest.Mock).mockResolvedValue(null);
      await controller.getEventById(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req.params = { id: 'evt1' };
      (eventsService.getEventById as jest.Mock).mockRejectedValue(new Error('err'));
      await controller.getEventById(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('publishEvent', () => {
    it('should return 401 if unauthorized', async () => {
      req.user = undefined;
      await controller.publishEvent(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 if user not authorized to publish', async () => {
      req.params = { id: 'evt1' };
      (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'evt1', created_by: 'other' });
      await controller.publishEvent(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if validation fails', async () => {
      req.params = { id: 'evt1' };
      (validateEventForPublish as jest.Mock).mockResolvedValue('Validation error');
      await controller.publishEvent(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Validation error' });
    });

    it('should return 200 on successful publish', async () => {
      req.params = { id: 'evt1' };
      (validateEventForPublish as jest.Mock).mockResolvedValue(null);
      (bundleService.generateBundle as jest.Mock).mockResolvedValue({ bundle: 'ok' });
      
      await controller.publishEvent(req as AuthRequest, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Event published successfully', data: { bundle: 'ok' } });
    });

    it('should return 500 on publish error', async () => {
      req.params = { id: 'evt1' };
      (validateEventForPublish as jest.Mock).mockResolvedValue(null);
      (bundleService.generateBundle as jest.Mock).mockRejectedValue(new Error('err'));
      
      await controller.publishEvent(req as AuthRequest, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'err' });
    });

    it('should return fallback error message if error.message is missing', async () => {
      req.params = { id: 'evt1' };
      (validateEventForPublish as jest.Mock).mockResolvedValue(null);
      (bundleService.generateBundle as jest.Mock).mockRejectedValue({});
      
      await controller.publishEvent(req as AuthRequest, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to publish event' });
    });
  });
});
