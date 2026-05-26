import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { query } from '../../config/database';
import { generateSqliteDb } from './sqlite.generator';
import { generateMetadataJson } from './metadata.generator';
import { packageMelapack } from './melapack.generator';
import { uploadLocalFile } from '../../providers/minioProvider';
import logger from '../../utils/logger';

export class BundleService {
  async generateBundle(eventId: string, adminId: string): Promise<any> {
    const outputDir = path.join(process.cwd(), 'storage', 'bundles', eventId);
    
    // Fetch Event to get version and name
    const eventResult = await query(`SELECT * FROM events WHERE id = $1`, [eventId]);
    const event = eventResult.rows[0];

    if (!event) {
        throw new Error('Event not found');
    }

    const newVersion = (event.bundle_version || 0) + 1;

    try {
      // 1. Generate SQLite DB
      const dbPath = await generateSqliteDb(eventId, outputDir);
      
      // 2. Generate Metadata
      const metadataPath = await generateMetadataJson(eventId, newVersion, outputDir);
      
      // 3. Package Melapack
      const { bundlePath, size } = await packageMelapack(event.name, dbPath, metadataPath, outputDir);

      // Clean up temp files
      fs.unlinkSync(dbPath);
      fs.unlinkSync(metadataPath);

      // 4. Upload to MinIO
      const { objectName, minioUrl } = await uploadLocalFile(bundlePath, 'application/zip', `bundles/${eventId}`);

      // Clean up the local zip file since it's now on MinIO
      fs.unlinkSync(bundlePath);

      // 5. Save to bundles table
      const bundleId = randomUUID();

      await query(
        `INSERT INTO bundles (
          id, event_id, version, bundle_url, bundle_size, 
          generation_status, generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [bundleId, eventId, newVersion, minioUrl, size, 'completed', adminId]
      );

      // 5. Update events table
      await query(
        `UPDATE events 
         SET status = 'published', 
             bundle_version = $1, 
             current_bundle_id = $2, 
             published_at = NOW(), 
             updated_at = NOW() 
         WHERE id = $3`,
        [newVersion, bundleId, eventId]
      );

      return {
        id: bundleId,
        version: newVersion,
        url: minioUrl
      };
    } catch (error: any) {
      logger.error('Error generating bundle:', error);
      throw new Error(`Bundle generation failed: ${error.message}`);
    }
  }
}

export const bundleService = new BundleService();
