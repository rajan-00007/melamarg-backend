import { EventsService } from '@modules/events/events.services';
import { eventsRepository } from '@modules/events/events.repository';

jest.mock('@modules/events/events.repository', () => ({
  eventsRepository: {
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    getEventById: jest.fn(),
    getAllEvents: jest.fn(),
  }
}));

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(() => {
    service = new EventsService();
    jest.clearAllMocks();
  });

  it('should generate slug and call createEvent', async () => {
    const mockCreated = { id: 'evt1', slug: 'test-event-1234' };
    (eventsRepository.createEvent as jest.Mock).mockResolvedValue(mockCreated);
    
    const result = await service.createEvent({ name: 'Test Event!' });
    
    expect(eventsRepository.createEvent).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Event!',
      slug: expect.stringMatching(/^test-event-\d+$/)
    }));
    expect(result).toBe(mockCreated);
  });

  it('should NOT generate slug if slug is already provided', async () => {
    (eventsRepository.createEvent as jest.Mock).mockResolvedValue({ id: 'evt1' });
    await service.createEvent({ name: 'Test', slug: 'manual-slug' });
    expect(eventsRepository.createEvent).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test',
      slug: 'manual-slug'
    }));
  });

  it('should NOT generate slug if name is missing', async () => {
    (eventsRepository.createEvent as jest.Mock).mockResolvedValue({ id: 'evt1' });
    await service.createEvent({ description: 'Only desc' });
    expect(eventsRepository.createEvent).toHaveBeenCalledWith({ description: 'Only desc' });
  });

  it('should updateEventBBox', async () => {
    (eventsRepository.updateEvent as jest.Mock).mockResolvedValue({ id: 'evt1' });
    await service.updateEventBBox('evt1', { north: 1, south: 2, east: 3, west: 4 });
    expect(eventsRepository.updateEvent).toHaveBeenCalledWith('evt1', { north: 1, south: 2, east: 3, west: 4 });
  });

  it('should updateEvent', async () => {
    (eventsRepository.updateEvent as jest.Mock).mockResolvedValue({ id: 'evt1' });
    await service.updateEvent('evt1', { name: 'New' });
    expect(eventsRepository.updateEvent).toHaveBeenCalledWith('evt1', { name: 'New' });
  });

  it('should getEventById', async () => {
    (eventsRepository.getEventById as jest.Mock).mockResolvedValue({ id: 'evt1' });
    const res = await service.getEventById('evt1');
    expect(res).toEqual({ id: 'evt1' });
    expect(eventsRepository.getEventById).toHaveBeenCalledWith('evt1');
  });

  it('should getAllEvents', async () => {
    (eventsRepository.getAllEvents as jest.Mock).mockResolvedValue([{ id: 'evt1' }]);
    const res = await service.getAllEvents();
    expect(res).toEqual([{ id: 'evt1' }]);
    expect(eventsRepository.getAllEvents).toHaveBeenCalled();
  });
});
