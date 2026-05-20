import { EventsRepository } from '@modules/events/events.repository';
import { query } from '@config/database';

jest.mock('@config/database');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('EventsRepository', () => {
  let repo: EventsRepository;

  beforeEach(() => {
    repo = new EventsRepository();
    jest.clearAllMocks();
  });

  it('should createEvent', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid', name: 'Test' }] });
    const result = await repo.createEvent({ name: 'Test' });
    expect(result).toHaveProperty('id', 'mock-uuid');
    expect(query).toHaveBeenCalled();
  });

  it('should updateEvent', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid', name: 'New Name' }] });
    const result = await repo.updateEvent('mock-uuid', { name: 'New Name' });
    expect(result).toHaveProperty('name', 'New Name');
    expect(query).toHaveBeenCalled();
  });

  it('should handle both defined and undefined values in updateEvent', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid', name: 'New Name' }] });
    const result = await repo.updateEvent('mock-uuid', { name: 'New Name', description: undefined });
    expect(result).toHaveProperty('name', 'New Name');
    // Verify that only name was added to the update clause
    const sqlCall = (query as jest.Mock).mock.calls.find(call => call[0].startsWith('UPDATE'));
    expect(sqlCall[0]).toContain('name = $1');
    expect(sqlCall[0]).not.toContain('description =');
  });

  it('should updateEvent and return original if no updateData', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.updateEvent('mock-uuid', {});
    expect(result).toHaveProperty('id', 'mock-uuid');
  });

  it('should return null if updateEvent not found', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [] });
    const result = await repo.updateEvent('mock-uuid', { name: 'New' });
    expect(result).toBeNull();
  });

  it('should getEventById', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getEventById('mock-uuid');
    expect(result).toEqual({ id: 'mock-uuid' });
  });

  it('should getEventById return null', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [] });
    const result = await repo.getEventById('mock-uuid');
    expect(result).toBeNull();
  });

  it('should getAllEvents', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getAllEvents();
    expect(result).toEqual([{ id: 'mock-uuid' }]);
  });
});
