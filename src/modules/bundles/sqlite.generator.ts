import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { query } from '../../config/database';
import logger from '../../utils/logger';

export const generateSqliteDb = async (eventId: string, outputDir: string): Promise<string> => {
  const dbPath = path.join(outputDir, 'pois.db');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Remove existing DB if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = new Database(dbPath);

  try {
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS poi_categories (
        id TEXT PRIMARY KEY,
        name_en TEXT,
        name_hi TEXT,
        name_or TEXT,
        icon TEXT,
        color TEXT
      );

      CREATE TABLE IF NOT EXISTS pois (
        id TEXT PRIMARY KEY,
        category_id TEXT,
        name_en TEXT,
        name_hi TEXT,
        name_or TEXT,
        description TEXT,
        latitude REAL,
        longitude REAL,
        icon_url TEXT
      );
    `);

    // Fetch data from PostgreSQL
    const poisResult = await query(`SELECT * FROM pois WHERE event_id = $1`, [eventId]);
    const categoriesResult = await query(`SELECT * FROM poi_categories`);

    // Insert categories
    const insertCategory = db.prepare(`
      INSERT INTO poi_categories (id, name_en, name_hi, name_or, icon, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertCategoryMany = db.transaction((cats) => {
      for (const cat of cats) {
        insertCategory.run(cat.id, cat.name_en, cat.name_hi, cat.name_or, cat.icon, cat.color);
      }
    });

    insertCategoryMany(categoriesResult.rows);

    // Insert POIs
    const insertPoi = db.prepare(`
      INSERT INTO pois (id, category_id, name_en, name_hi, name_or, description, latitude, longitude, icon_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPoiMany = db.transaction((pois) => {
      for (const poi of pois) {
        insertPoi.run(
          poi.id, 
          poi.category_id, 
          poi.name_en, 
          poi.name_hi, 
          poi.name_or, 
          poi.description, 
          poi.latitude, 
          poi.longitude,
          poi.icon_url
        );
      }
    });

    insertPoiMany(poisResult.rows);

    logger.info(`Generated pois.db at ${dbPath}`);
    return dbPath;
  } finally {
    db.close();
  }
};
