import { query } from '../../config/database';
import { randomUUID } from 'crypto';

export interface VisitorSessionRecord {
  id: string;
  event_id: string;
  device_id: string;
  platform: string;
  last_active: Date;
  created_at: Date;
}

export class AnalyticsRepository {
  async upsertVisitorSession(eventId: string, deviceId: string, platform: string): Promise<VisitorSessionRecord> {
    const id = randomUUID();
    const result = await query(
      `INSERT INTO visitor_sessions (id, event_id, device_id, platform, last_active)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (event_id, device_id)
       DO UPDATE SET last_active = NOW(), platform = EXCLUDED.platform
       RETURNING *`,
      [id, eventId, deviceId, platform]
    );
    return result.rows[0];
  }

  async getVisitorStats(eventId: string): Promise<{ platform: string; count: number }[]> {
    const result = await query(
      `SELECT platform, COUNT(*) as count 
       FROM visitor_sessions 
       WHERE event_id = $1 
       GROUP BY platform`,
      [eventId]
    );
    return result.rows.map(r => ({
      platform: r.platform,
      count: parseInt(r.count, 10)
    }));
  }

  async getPoiDensityStats(eventId: string): Promise<any[]> {
    const sql = `
      SELECT 
        p.category_id,
        COALESCE(pc.name_en, 'Uncategorized') as category_name,
        pc.icon as category_icon,
        pc.color as category_color,
        p.zone_id,
        COALESCE(z.name, 'No Zone') as zone_name,
        COUNT(p.id) as count
      FROM pois p
      LEFT JOIN poi_categories pc ON p.category_id = pc.id
      LEFT JOIN zones z ON p.zone_id = z.id
      WHERE p.event_id = $1 AND p.is_active = true
      GROUP BY p.category_id, pc.name_en, pc.icon, pc.color, p.zone_id, z.name
      ORDER BY count DESC
    `;
    const result = await query(sql, [eventId]);
    return result.rows.map(r => ({
      ...r,
      count: parseInt(r.count, 10)
    }));
  }

  async getPoiDetailsForFiltering(eventId: string): Promise<any[]> {
    const sql = `
      SELECT 
        p.id,
        p.name_en,
        p.name_hi,
        p.latitude,
        p.longitude,
        p.category_id,
        p.zone_id,
        COALESCE(pc.name_en, 'Uncategorized') as category_name,
        COALESCE(z.name, 'No Zone') as zone_name
      FROM pois p
      LEFT JOIN poi_categories pc ON p.category_id = pc.id
      LEFT JOIN zones z ON p.zone_id = z.id
      WHERE p.event_id = $1 AND p.is_active = true
      ORDER BY p.name_en ASC
    `;
    const result = await query(sql, [eventId]);
    return result.rows;
  }

  async getMeetupStats(eventId: string): Promise<{
    totalGroups: number;
    totalMembers: number;
    activeMembers24h: number;
    groupsDetail: any[];
  }> {
    const groupsCountResult = await query(
      `SELECT COUNT(*) as count FROM meetup_groups WHERE event_id = $1`,
      [eventId]
    );
    
    const membersCountResult = await query(
      `SELECT COUNT(m.id) as count 
       FROM meetup_members m 
       JOIN meetup_groups g ON m.group_id = g.id 
       WHERE g.event_id = $1`,
      [eventId]
    );

    const activeCountResult = await query(
      `SELECT COUNT(m.id) as count 
       FROM meetup_members m 
       JOIN meetup_groups g ON m.group_id = g.id 
       WHERE g.event_id = $1 
         AND m.last_active_at > NOW() - INTERVAL '24 hours'`,
      [eventId]
    );

    const groupsDetailResult = await query(
      `SELECT 
        g.id,
        g.name,
        g.code,
        COALESCE(p.name_en, g.assembly_custom_name, 'No Assembly Point') as assembly_name,
        COUNT(m.id) as member_count
      FROM meetup_groups g
      LEFT JOIN meetup_members m ON g.id = m.group_id
      LEFT JOIN pois p ON g.assembly_point_id = p.id
      WHERE g.event_id = $1
      GROUP BY g.id, g.name, g.code, p.name_en, g.assembly_custom_name
      ORDER BY member_count DESC`,
      [eventId]
    );

    return {
      totalGroups: parseInt(groupsCountResult.rows[0]?.count || '0', 10),
      totalMembers: parseInt(membersCountResult.rows[0]?.count || '0', 10),
      activeMembers24h: parseInt(activeCountResult.rows[0]?.count || '0', 10),
      groupsDetail: groupsDetailResult.rows.map(r => ({
        ...r,
        member_count: parseInt(r.member_count, 10)
      }))
    };
  }

  async getParkingStats(eventId: string): Promise<{
    lots: any[];
    reservationStatusCounts: { status: string; count: number }[];
  }> {
    const lotsResult = await query(
      `SELECT id, name, total_spots, available_spots, price_per_hour, landmark
       FROM parking_lots
       WHERE event_id = $1
       ORDER BY name ASC`,
      [eventId]
    );

    const resResult = await query(
      `SELECT r.status, COUNT(r.id) as count
       FROM parking_reservations r
       JOIN parking_lots l ON r.parking_lot_id = l.id
       WHERE l.event_id = $1
       GROUP BY r.status`,
      [eventId]
    );

    return {
      lots: lotsResult.rows.map(r => ({
        ...r,
        total_spots: parseInt(r.total_spots, 10),
        available_spots: parseInt(r.available_spots, 10),
        price_per_hour: parseFloat(r.price_per_hour)
      })),
      reservationStatusCounts: resResult.rows.map(r => ({
        status: r.status,
        count: parseInt(r.count, 10)
      }))
    };
  }

  async getEventOverview(eventId: string): Promise<any> {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM zones WHERE event_id = $1) as zones_count,
        (SELECT COUNT(*) FROM route_nodes WHERE event_id = $1) as nodes_count,
        (SELECT COUNT(*) FROM route_edges WHERE event_id = $1) as edges_count,
        (SELECT COUNT(*) FROM notifications WHERE event_id = $1) as notifications_count,
        (SELECT COUNT(*) FROM bundles WHERE event_id = $1) as bundles_count,
        (SELECT COUNT(*) FROM event_highlights WHERE event_id = $1) as highlights_count,
        (SELECT COUNT(*) FROM feedback WHERE event_id = $1) as feedback_count,
        (SELECT COALESCE(AVG(rating), 0) FROM feedback WHERE event_id = $1) as feedback_avg_rating
    `;
    const result = await query(sql, [eventId]);
    const row = result.rows[0] || {};
    return {
      zonesCount: parseInt(row.zones_count || '0', 10),
      nodesCount: parseInt(row.nodes_count || '0', 10),
      edgesCount: parseInt(row.edges_count || '0', 10),
      notificationsCount: parseInt(row.notifications_count || '0', 10),
      bundlesCount: parseInt(row.bundles_count || '0', 10),
      highlightsCount: parseInt(row.highlights_count || '0', 10),
      feedbackCount: parseInt(row.feedback_count || '0', 10),
      feedbackAvgRating: parseFloat(row.feedback_avg_rating || '0')
    };
  }
}

export const analyticsRepository = new AnalyticsRepository();
