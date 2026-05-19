import { query } from '../../config/database';

export const validateEventForPublish = async (eventId: string): Promise<string | null> => {
  // 1. Fetch event
  const eventResult = await query(`SELECT * FROM events WHERE id = $1`, [eventId]);
  if (eventResult.rows.length === 0) {
    return 'Event not found';
  }

  const event = eventResult.rows[0];

  // 2. Validate bounding box exists
  if (!event.north || !event.south || !event.east || !event.west) {
    return 'Bounding box is required for publishing. Please define the map area first.';
  }

  // 3. Validate POIs exist
  const poisResult = await query(`SELECT * FROM pois WHERE event_id = $1`, [eventId]);
  if (poisResult.rows.length === 0) {
    return 'At least 1 POI must be added before publishing.';
  }

  // 4. Validate required categories exist (toilet, police, medical, water)
  // We'll check by name_en mapped to common categories
  const categoryResult = await query(`
    SELECT DISTINCT pc.name_en 
    FROM pois p 
    JOIN poi_categories pc ON p.category_id = pc.id 
    WHERE p.event_id = $1
  `, [eventId]);

  const existingCategories = categoryResult.rows.map(r => r.name_en?.toLowerCase() || '');
  
  const requiredCategories = ['toilet', 'police', 'medical', 'water'];
  const missingCategories = requiredCategories.filter(rc => !existingCategories.some(ec => ec.includes(rc)));

  if (missingCategories.length > 0) {
    return `Missing required POI categories: ${missingCategories.join(', ')}. Please add them before publishing.`;
  }

  return null; // Valid
};
