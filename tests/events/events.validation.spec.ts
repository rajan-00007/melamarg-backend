import { validateEventForPublish } from '@modules/events/events.validation';
import { query } from '@config/database';

jest.mock('@config/database');

describe('validateEventForPublish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return Event not found if no event', async () => {
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    const result = await validateEventForPublish('evt1');
    expect(result).toBe('Event not found');
  });

  it('should return Bounding box is required if missing bbox', async () => {
    (query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'evt1' }] });
    const result = await validateEventForPublish('evt1');
    expect(result).toBe('Bounding box is required for publishing. Please define the map area first.');
  });

  it('should return At least 1 POI must be added if no POIs', async () => {
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'evt1', north: 1, south: 2, east: 3, west: 4 }] })
      .mockResolvedValueOnce({ rows: [] });
    const result = await validateEventForPublish('evt1');
    expect(result).toBe('At least 1 POI must be added before publishing.');
  });

  it('should return Missing required POI categories if categories missing', async () => {
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'evt1', north: 1, south: 2, east: 3, west: 4 }] }) // event
      .mockResolvedValueOnce({ rows: [{ id: 'poi1' }] }) // pois
      .mockResolvedValueOnce({ rows: [{ name_en: 'toilet' }, { name_en: 'police' }] }); // categories missing medical, water

    const result = await validateEventForPublish('evt1');
    expect(result).toBe('Missing required POI categories: medical, water. Please add them before publishing.');
  });

  it('should handle null category names in validation', async () => {
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'evt1', north: 1, south: 2, east: 3, west: 4 }] }) // event
      .mockResolvedValueOnce({ rows: [{ id: 'poi1' }] }) // pois
      .mockResolvedValueOnce({ rows: [{ name_en: 'toilet' }, { name_en: null }] }); // null name_en

    const result = await validateEventForPublish('evt1');
    expect(result).toContain('Missing required POI categories');
  });

  it('should return null if valid', async () => {
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'evt1', north: 1, south: 2, east: 3, west: 4 }] }) // event
      .mockResolvedValueOnce({ rows: [{ id: 'poi1' }] }) // pois
      .mockResolvedValueOnce({ rows: [{ name_en: 'toilet' }, { name_en: 'police' }, { name_en: 'medical' }, { name_en: 'water' }] }); // categories

    const result = await validateEventForPublish('evt1');
    expect(result).toBeNull();
  });
});
