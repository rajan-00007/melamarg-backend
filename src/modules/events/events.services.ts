import { eventsRepository, EventRecord } from './events.repository';

export class EventsService {
  async createEvent(eventData: Partial<EventRecord>): Promise<EventRecord> {
    // Generate slug from name
    if (eventData.name && !eventData.slug) {
      const baseSlug = eventData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const uniqueSuffix = Math.floor(Math.random() * 10000).toString();
      eventData.slug = `${baseSlug}-${uniqueSuffix}`;
    }

    return await eventsRepository.createEvent(eventData);
  }

  async updateEventBBox(id: string, bboxData: { north: number | null, south: number | null, east: number | null, west: number | null }): Promise<EventRecord | null> {
    return await eventsRepository.updateEvent(id, {
      north: bboxData.north,
      south: bboxData.south,
      east: bboxData.east,
      west: bboxData.west,
    });
  }

  async updateEvent(id: string, updateData: Partial<EventRecord>): Promise<EventRecord | null> {
    return await eventsRepository.updateEvent(id, updateData);
  }

  async getEventById(id: string): Promise<EventRecord | null> {
    return await eventsRepository.getEventById(id);
  }

  async getAllEvents(): Promise<EventRecord[]> {
    return await eventsRepository.getAllEvents();
  }
}

export const eventsService = new EventsService();
