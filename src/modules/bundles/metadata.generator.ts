import fs from 'fs';
import path from 'path';
import { query } from '../../config/database';

export const generateMetadataJson = async (eventId: string, version: number, outputDir: string): Promise<string> => {
  const eventResult = await query(`SELECT * FROM events WHERE id = $1`, [eventId]);
  const event = eventResult.rows[0];

  if (!event) {
    throw new Error('Event not found for metadata generation');
  }

  const parsedMeta = typeof event.metadata === 'string' ? JSON.parse(event.metadata) : (event.metadata || {});

  const metadata = {
    eventId: event.id,
    eventName: event.name,
    bundleVersion: version,
    generatedAt: new Date().toISOString(),
    metadata: parsedMeta,
    bbox: {
      north: event.north,
      south: event.south,
      east: event.east,
      west: event.west
    }
  };

  const metadataPath = path.join(outputDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
 
  return metadataPath;
};
