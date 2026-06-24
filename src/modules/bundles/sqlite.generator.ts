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
        icon_url TEXT,
        zone_id TEXT
      );

      CREATE TABLE IF NOT EXISTS parking_lots (
        id TEXT PRIMARY KEY,
        name TEXT,
        latitude REAL,
        longitude REAL,
        total_spots INTEGER,
        price_per_hour REAL,
        landmark TEXT,
        zone_id TEXT
      );

      CREATE TABLE IF NOT EXISTS zones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        boundary TEXT NOT NULL,
        allow_pedestrians INTEGER DEFAULT 1,
        allow_2wheelers INTEGER DEFAULT 1,
        allow_cars INTEGER DEFAULT 1,
        advisory TEXT
      );

      CREATE TABLE IF NOT EXISTS advisory_zones (
        id TEXT PRIMARY KEY,
        advisory_id TEXT NOT NULL,
        zone_id TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS event_highlights (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        time TEXT,
        image_url TEXT,
        highlight_date TEXT NOT NULL
      );
    `);

    // Fetch data from PostgreSQL
    const poisResult = await query(`SELECT * FROM pois WHERE event_id = $1`, [eventId]);
    const categoriesResult = await query(`SELECT * FROM poi_categories`);
    const parkingResult = await query(`SELECT * FROM parking_lots WHERE event_id = $1 AND is_active = true`, [eventId]);
    const zonesResult = await query(`SELECT * FROM zones WHERE event_id = $1`, [eventId]);
    const advisoryZonesResult = await query(
      `SELECT az.* FROM advisory_zones az 
       JOIN zones z ON az.zone_id = z.id 
       WHERE z.event_id = $1`,
      [eventId]
    );
    const highlightsResult = await query(
      `SELECT * FROM event_highlights WHERE event_id = $1`,
      [eventId]
    );

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
      INSERT INTO pois (id, category_id, name_en, name_hi, name_or, description, latitude, longitude, icon_url, zone_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          poi.icon_url,
          poi.zone_id || null
        );
      }
    });

    insertPoiMany(poisResult.rows);

    // Insert Parking Lots
    const insertParking = db.prepare(`
      INSERT INTO parking_lots (id, name, latitude, longitude, total_spots, price_per_hour, landmark, zone_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParkingMany = db.transaction((lots) => {
      for (const lot of lots) {
        insertParking.run(
          lot.id,
          lot.name,
          Number(lot.latitude),
          Number(lot.longitude),
          lot.total_spots,
          Number(lot.price_per_hour),
          lot.landmark,
          lot.zone_id || null
        );
      }
    });

    insertParkingMany(parkingResult.rows);

    // Insert Zones
    const insertZone = db.prepare(`
      INSERT INTO zones (id, name, boundary, allow_pedestrians, allow_2wheelers, allow_cars, advisory)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertZoneMany = db.transaction((zs) => {
      for (const z of zs) {
        insertZone.run(
          z.id,
          z.name,
          typeof z.boundary === 'string' ? z.boundary : JSON.stringify(z.boundary),
          z.allow_pedestrians ? 1 : 0,
          z.allow_2wheelers ? 1 : 0,
          z.allow_cars ? 1 : 0,
          z.advisory || null
        );
      }
    });

    insertZoneMany(zonesResult.rows);

    // Insert Advisory Zones
    const insertAdvisoryZone = db.prepare(`
      INSERT INTO advisory_zones (id, advisory_id, zone_id)
      VALUES (?, ?, ?)
    `);

    const insertAdvisoryZoneMany = db.transaction((azs) => {
      for (const az of azs) {
        insertAdvisoryZone.run(az.id, az.advisory_id, az.zone_id);
      }
    });

    insertAdvisoryZoneMany(advisoryZonesResult.rows);

    // Insert Event Highlights
    const insertHighlight = db.prepare(`
      INSERT INTO event_highlights (id, event_id, title, description, location, time, image_url, highlight_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertHighlightMany = db.transaction((highlights) => {
      for (const hl of highlights) {
        insertHighlight.run(
          hl.id,
          hl.event_id,
          hl.title,
          hl.description || null,
          hl.location || null,
          hl.time || null,
          hl.image_url || null,
          hl.highlight_date
        );
      }
    });

    insertHighlightMany(highlightsResult.rows);

    logger.info(`Generated pois.db at ${dbPath}`);
    return dbPath;
  } finally {
    db.close();
  }
};
