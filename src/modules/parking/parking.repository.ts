import pool, { query } from '../../config/database';
import { randomUUID } from 'crypto';

export interface ParkingLotRecord {
  id: string;
  event_id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  available_spots: number;
  price_per_hour: number;
  landmark?: string;
  is_active: boolean;
  zone_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ParkingReservationRecord {
  id: string;
  parking_lot_id: string;
  token: string;
  device_id?: string;
  status: 'reserved' | 'completed' | 'expired' | 'cancelled';
  expires_at: Date;
  slots_count: number;
  created_at: Date;
  updated_at: Date;
}

export class ParkingRepository {
  // Run a single CTE query to clean up all expired reservations and release spots
  async cleanupExpiredReservations(): Promise<number> {
    const sql = `
      WITH expired_res AS (
        UPDATE parking_reservations
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'reserved' AND expires_at < (NOW() AT TIME ZONE 'UTC')
        RETURNING parking_lot_id, COALESCE(slots_count, 1) as slots_count
      ),
      counts AS (
        SELECT parking_lot_id, SUM(slots_count) as qty
        FROM expired_res
        GROUP BY parking_lot_id
      )
      UPDATE parking_lots l
      SET available_spots = LEAST(l.total_spots, l.available_spots + c.qty),
          updated_at = NOW()
      FROM counts c
      WHERE l.id = c.parking_lot_id;
    `;
    const result = await query(sql);
    return result.rowCount ?? 0;
  }

  async createParkingLot(lotData: Partial<ParkingLotRecord>): Promise<ParkingLotRecord> {
    const id = randomUUID();
    const total_spots = lotData.total_spots || 0;
    const available_spots = lotData.available_spots !== undefined ? lotData.available_spots : total_spots;
    const price = lotData.price_per_hour || 0.00;
    const is_active = lotData.is_active !== undefined ? lotData.is_active : true;

    const result = await query(
      `INSERT INTO parking_lots (
        id, event_id, name, latitude, longitude, 
        total_spots, available_spots, price_per_hour, 
        landmark, is_active, zone_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *`,
      [
        id,
        lotData.event_id,
        lotData.name,
        lotData.latitude,
        lotData.longitude,
        total_spots,
        available_spots,
        price,
        lotData.landmark,
        is_active,
        lotData.zone_id || null
      ]
    );

    return result.rows[0];
  }

  async getParkingLotsByEvent(eventId: string): Promise<ParkingLotRecord[]> {
    // Perform cleanup before listing
    await this.cleanupExpiredReservations();

    const result = await query(
      `SELECT * FROM parking_lots 
       WHERE event_id = $1 
       ORDER BY created_at DESC`,
      [eventId]
    );
    return result.rows;
  }

  async getParkingLotById(id: string): Promise<ParkingLotRecord | null> {
    const result = await query(`SELECT * FROM parking_lots WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async updateParkingLot(id: string, updateData: Partial<ParkingLotRecord>): Promise<ParkingLotRecord | null> {
    if (updateData.total_spots !== undefined) {
      const currentLot = await this.getParkingLotById(id);
      if (currentLot) {
        const diff = Number(updateData.total_spots) - Number(currentLot.total_spots);
        updateData.available_spots = Math.max(0, Number(currentLot.available_spots) + diff);
      }
    }

    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      return this.getParkingLotById(id);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE parking_lots SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  async deleteParkingLot(id: string): Promise<boolean> {
    const result = await query(`DELETE FROM parking_lots WHERE id = $1 RETURNING id`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Create a reservation (with transactional logic to decrement spots)
  async createReservation(parkingLotId: string, deviceId: string, customTokenPrefix = 'PURI', slotsCount = 1): Promise<ParkingReservationRecord> {
    // 1. Perform cleanup first to free up spots
    await this.cleanupExpiredReservations();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Enforce global user active booking limit (max 4 slots overall)
      const activeResResult = await client.query(
        `SELECT COALESCE(SUM(slots_count), 0) as active_slots FROM parking_reservations
         WHERE device_id = $1 AND status = 'reserved' AND expires_at > (NOW() AT TIME ZONE 'UTC')`,
        [deviceId]
      );
      const activeSlots = Number(activeResResult.rows[0]?.active_slots || 0);
      if (activeSlots + slotsCount > 4) {
        throw new Error(`You have reached the maximum reservation limit of 4 slots. Current active booked slots: ${activeSlots}.`);
      }

      // 3. Fetch lot details and lock row for update
      const lotResult = await client.query(
        `SELECT * FROM parking_lots WHERE id = $1 FOR UPDATE`, 
        [parkingLotId]
      );
      const lot = lotResult.rows[0];
      if (!lot) {
        throw new Error('Parking lot not found');
      }

      if (lot.available_spots < slotsCount) {
        throw new Error(`Not enough spots left in this parking lot. Available: ${lot.available_spots}.`);
      }

      // 4. Decrement available spots
      await client.query(
        `UPDATE parking_lots 
         SET available_spots = available_spots - $2, updated_at = NOW() 
         WHERE id = $1`,
        [parkingLotId, slotsCount]
      );

      // 5. Generate unique Reservation Token: e.g. PURI-8842-X
      let token = '';
      let isUnique = false;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        attempts++;
        const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 digit number
        const randomChar = chars[Math.floor(Math.random() * chars.length)];
        
        // If we fail to find unique after multiple attempts, make it even longer/more unique
        if (attempts > 5) {
          const randomChar2 = chars[Math.floor(Math.random() * chars.length)];
          token = `${customTokenPrefix.toUpperCase()}-${randomDigits}-${randomChar}${randomChar2}`;
        } else {
          token = `${customTokenPrefix.toUpperCase()}-${randomDigits}-${randomChar}`;
        }

        const checkResult = await client.query(
          `SELECT id FROM parking_reservations WHERE token = $1`,
          [token]
        );
        if (checkResult.rows.length === 0) {
          isUnique = true;
        }
      }

      if (!isUnique) {
        // Fallback to timestamp + random letters to guarantee uniqueness in extreme case
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        token = `${customTokenPrefix.toUpperCase()}-${Date.now().toString().slice(-4)}-${suffix}`;
      }

      const resId = randomUUID();
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // Valid for 20 minutes

      // 6. Insert reservation record
      const resResult = await client.query(
        `INSERT INTO parking_reservations (
          id, parking_lot_id, token, device_id, expires_at, status, slots_count
        ) VALUES ($1, $2, $3, $4, $5, 'reserved', $6) 
        RETURNING *`,
        [resId, parkingLotId, token, deviceId, expiresAt, slotsCount]
      );

      await client.query('COMMIT');
      return resResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Cancel reservation manually (increments available spots)
  async cancelReservation(token: string): Promise<ParkingReservationRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Fetch reservation details and lock row for update
      const resResult = await client.query(
        `SELECT * FROM parking_reservations WHERE token = $1 FOR UPDATE`,
        [token]
      );
      const reservation = resResult.rows[0];
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status !== 'reserved') {
        throw new Error(`Reservation is already ${reservation.status}`);
      }

      // Check if it is already expired dynamically
      const isExpired = new Date(reservation.expires_at).getTime() < Date.now();
      const targetStatus = isExpired ? 'expired' : 'cancelled';

      // 2. Set status to cancelled / expired
      const updatedResResult = await client.query(
        `UPDATE parking_reservations 
         SET status = $1, updated_at = NOW() 
         WHERE token = $2 RETURNING *`,
        [targetStatus, token]
      );

      // 3. Increment available spots (only if it wasn't already expired and counted by background cleanup)
      const lotResult = await client.query(
        `SELECT * FROM parking_lots WHERE id = $1`,
        [reservation.parking_lot_id]
      );
      const lot = lotResult.rows[0];
      if (lot) {
        const slotsToRelease = Number(reservation.slots_count || 1);
        await client.query(
          `UPDATE parking_lots 
           SET available_spots = LEAST(total_spots, available_spots + $2), updated_at = NOW() 
           WHERE id = $1`,
          [reservation.parking_lot_id, slotsToRelease]
        );
      }

      await client.query('COMMIT');
      return updatedResResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getReservationByToken(token: string): Promise<any | null> {
    // 1. Perform cleanup first to ensure status is up to date
    await this.cleanupExpiredReservations();

    const result = await query(
      `SELECT r.*, l.name AS parking_lot_name, l.latitude, l.longitude, l.landmark
       FROM parking_reservations r
       LEFT JOIN parking_lots l ON r.parking_lot_id = l.id
       WHERE r.token = $1`,
      [token]
    );
    return result.rows[0] || null;
  }
}

export const parkingRepository = new ParkingRepository();
