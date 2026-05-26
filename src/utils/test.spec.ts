import { POIRepository } from '../modules/pois/poi.repository';
import { query } from '../config/database';

jest.mock('../config/database');
jest.mock('crypto', () => ({ randomUUID: () => 'mock-uuid' }));

describe('POIRepository', () => {
  let repo: POIRepository;

  beforeEach(() => {
    repo = new POIRepository();
    jest.clearAllMocks();
  });

  it('should createPOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.createPOI({ event_id: 'e', latitude: 1, longitude: 2 });
    expect(result).toEqual({ id: 'mock-uuid' });
    expect(query).toHaveBeenCalled();
  });

  it('should getPOIsByEvent', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getPOIsByEvent('e');
    expect(result).toEqual([{ id: 'mock-uuid' }]);
  });

  it('should getPOIById', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getPOIById('p');
    expect(result).toEqual({ id: 'mock-uuid' });
  });

  it('should updatePOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid', name_en: 'n' }] });
    const result = await repo.updatePOI('mock-uuid', { name_en: 'n' });
    expect(result).toEqual({ id: 'mock-uuid', name_en: 'n' });
  });

  it('should return original POI if updateData is empty', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.updatePOI('mock-uuid', {});
    expect(result).toEqual({ id: 'mock-uuid' });
  });
});