import { POIService } from '@modules/pois/poi.service';
import { poiRepository } from '@modules/pois/poi.repository';

jest.mock('@modules/pois/poi.repository');

describe('POIService', () => {
  let service: POIService;

  beforeEach(() => {
    service = new POIService();
    jest.clearAllMocks();
  });

  describe('createPOI', () => {
    it('should throw error if event_id is missing', async () => {
      await expect(service.createPOI({ latitude: 1, longitude: 2 })).rejects.toThrow('Event ID is required');
    });

    it('should throw error if latitude is missing', async () => {
      await expect(service.createPOI({ event_id: 'e', longitude: 2 })).rejects.toThrow('Latitude and Longitude are required');
    });

    it('should throw error if longitude is missing', async () => {
      await expect(service.createPOI({ event_id: 'e', latitude: 1 })).rejects.toThrow('Latitude and Longitude are required');
    });

    it('should call repository to create POI', async () => {
      (poiRepository.createPOI as jest.Mock).mockResolvedValue({ id: 'p' });
      const result = await service.createPOI({ event_id: 'e', latitude: 1, longitude: 2 });
      expect(result).toEqual({ id: 'p' });
    });
  });

  it('should getPOIsByEvent', async () => {
    (poiRepository.getPOIsByEvent as jest.Mock).mockResolvedValue([{ id: 'p' }]);
    const result = await service.getPOIsByEvent('e');
    expect(result).toEqual([{ id: 'p' }]);
  });

  it('should getPOIById', async () => {
    (poiRepository.getPOIById as jest.Mock).mockResolvedValue({ id: 'p' });
    const result = await service.getPOIById('p');
    expect(result).toEqual({ id: 'p' });
  });

  it('should updatePOI', async () => {
    (poiRepository.updatePOI as jest.Mock).mockResolvedValue({ id: 'p' });
    const result = await service.updatePOI('p', { name_en: 'test' });
    expect(result).toEqual({ id: 'p' });
  });

  it('should deletePOI', async () => {
    (poiRepository.deletePOI as jest.Mock).mockResolvedValue(true);
    const result = await service.deletePOI('p');
    expect(result).toBe(true);
  });
});
