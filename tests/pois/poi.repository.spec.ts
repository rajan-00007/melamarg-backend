import { POIRepository } from '@modules/pois/poi.repository';
import { query } from '@config/database';

jest.mock('@config/database');
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

  it('should createPOI with is_active explicitly set to false', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid', is_active: false }] });
    const result = await repo.createPOI({ event_id: 'e', latitude: 1, longitude: 2, is_active: false });
    expect(result.is_active).toBe(false);
  });

  it('should getPOIById return null if not found', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [] });
    const result = await repo.getPOIById('p');
    expect(result).toBeNull();
  });

  it('should updatePOI handle defined and undefined values', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid', name_en: 'n' }] });
    const result = await repo.updatePOI('mock-uuid', { name_en: 'n', description: undefined });
    expect(result).toHaveProperty('name_en', 'n');
    const sqlCall = (query as jest.Mock).mock.calls.find(call => call[0].startsWith('UPDATE'));
    expect(sqlCall[0]).toContain('name_en = $1');
    expect(sqlCall[0]).not.toContain('description =');
  });

  it('should return null if updatePOI result is empty', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [] });
    const result = await repo.updatePOI('mock-uuid', { name_en: 'n' });
    expect(result).toBeNull();
  });

  it('should return false if deletePOI rowCount is 0', async () => {
    (query as jest.Mock).mockResolvedValue({ rowCount: 0 });
    const result = await repo.deletePOI('p');
    expect(result).toBe(false);
  });

  it('should handle null rowCount in deletePOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rowCount: null });
    const result = await repo.deletePOI('p');
    expect(result).toBe(false);
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

  it('should deletePOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
    const result = await repo.deletePOI('p');
    expect(result).toBe(true);
  });
});
