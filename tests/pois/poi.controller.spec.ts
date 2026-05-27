import { POIController } from '@modules/pois/poi.controller';
import { poiService } from '@modules/pois/poi.service';
import { Request, Response } from 'express';
import { AuthRequest } from '@middleware/auth.middleware';
import { eventsService } from '@modules/events/events.services';

jest.mock('@modules/pois/poi.service');
jest.mock('@modules/events/events.services');
jest.mock('@utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

describe('POIController', () => {
  let controller: POIController;
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new POIController();
    req = { body: {}, params: {}, query: {}, user: { id: 'admin1', phone: '123', role: 'admin' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
    (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'e', created_by: 'admin1' });
  });

  describe('createPOI', () => {
    it('should return 400 if event_id is missing', async () => {
      await controller.createPOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if lat or lng is missing', async () => {
      req.body = { event_id: 'e' };
      await controller.createPOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 201 on success', async () => {
      req.body = { event_id: 'e', lat: 1, lng: 2, name: 'n' };
      (poiService.createPOI as jest.Mock).mockResolvedValue({ id: 'p' });
      await controller.createPOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 500 on error', async () => {
      req.body = { event_id: 'e', lat: 1, lng: 2 };
      (poiService.createPOI as jest.Mock).mockRejectedValue(new Error('err'));
      await controller.createPOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPOIsByEvent', () => {
    it('should return 400 if eventId is missing', async () => {
      await controller.getPOIsByEvent(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 and POIs', async () => {
      req.query = { eventId: 'e' };
      (poiService.getPOIsByEvent as jest.Mock).mockResolvedValue([{ id: 'p' }]);
      await controller.getPOIsByEvent(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.query = { eventId: 'e' };
      (poiService.getPOIsByEvent as jest.Mock).mockRejectedValue(new Error('err'));
      await controller.getPOIsByEvent(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updatePOI', () => {
    it('should return 404 if POI not found', async () => {
      req.params = { id: 'p' };
      (poiService.getPOIById as jest.Mock).mockResolvedValue(null);
      await controller.updatePOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if unauthorized', async () => {
      req.params = { id: 'p' };
      (poiService.getPOIById as jest.Mock).mockResolvedValue({ id: 'p', created_by: 'other', event_id: 'e' });
      (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'e', created_by: 'other' });
      await controller.updatePOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should update POI and return 200', async () => {
      req.params = { id: 'p' };
      req.body = { lat: 1, lng: 2, name_en: 't' };
      (poiService.getPOIById as jest.Mock).mockResolvedValue({ id: 'p', created_by: 'admin1' });
      (poiService.updatePOI as jest.Mock).mockResolvedValue({ id: 'p' });
      await controller.updatePOI(req as AuthRequest, res as Response);
      expect(poiService.updatePOI).toHaveBeenCalledWith('p', { latitude: 1, longitude: 2, name_en: 't' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should update only lat', async () => {
      req.params = { id: 'p' };
      req.body = { lat: 3 };
      (poiService.getPOIById as jest.Mock).mockResolvedValue({ id: 'p', created_by: 'admin1' });
      (poiService.updatePOI as jest.Mock).mockResolvedValue({ id: 'p' });
      await controller.updatePOI(req as AuthRequest, res as Response);
      expect(poiService.updatePOI).toHaveBeenCalledWith('p', { latitude: 3 });
    });

    it('should update only lng', async () => {
      req.params = { id: 'p' };
      req.body = { lng: 4 };
      (poiService.getPOIById as jest.Mock).mockResolvedValue({ id: 'p', created_by: 'admin1' });
      (poiService.updatePOI as jest.Mock).mockResolvedValue({ id: 'p' });
      await controller.updatePOI(req as AuthRequest, res as Response);
      expect(poiService.updatePOI).toHaveBeenCalledWith('p', { longitude: 4 });
    });

    it('should return 500 on error', async () => {
      req.params = { id: 'p' };
      (poiService.getPOIById as jest.Mock).mockRejectedValue(new Error('err'));
      await controller.updatePOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deletePOI', () => {
    it('should return 404 if POI not found', async () => {
      req.params = { id: 'p' };
      (poiService.getPOIById as jest.Mock).mockResolvedValue(null);
      await controller.deletePOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if unauthorized', async () => {
      req.params = { id: 'p' };
      (poiService.getPOIById as jest.Mock).mockResolvedValue({ id: 'p', created_by: 'other', event_id: 'e' });
      (eventsService.getEventById as jest.Mock).mockResolvedValue({ id: 'e', created_by: 'other' });
      await controller.deletePOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if delete fails', async () => {
      req.params = { id: 'p' };
      (poiService.getPOIById as jest.Mock).mockResolvedValue({ id: 'p', created_by: 'admin1' });
      (poiService.deletePOI as jest.Mock).mockResolvedValue(false);
      await controller.deletePOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should delete POI and return 200', async () => {
      req.params = { id: 'p' };
      (poiService.getPOIById as jest.Mock).mockResolvedValue({ id: 'p', created_by: 'admin1' });
      (poiService.deletePOI as jest.Mock).mockResolvedValue(true);
      await controller.deletePOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.params = { id: 'p' };
      (poiService.getPOIById as jest.Mock).mockRejectedValue(new Error('err'));
      await controller.deletePOI(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
