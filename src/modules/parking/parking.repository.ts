import { query } from '../../config/database';
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
        WHERE status = 'reserved' AND expires_at < NOW()
        RETURNING parking_lot_id
      ),
      counts AS (
        SELECT parking_lot_id, COUNT(*) as qty
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
        landmark, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
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
        is_active
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
  async createReservation(parkingLotId: string, deviceId: string, customTokenPrefix = 'PURI'): Promise<ParkingReservationRecord> {
    // 1. Perform cleanup first to free up spots
    await this.cleanupExpiredReservations();

    const client = await query('BEGIN'); // Start transaction manually to ensure spot decrement safety
    try {
      // 2. Fetch lot details and lock row for update
      const lotResult = await query(
        `SELECT * FROM parking_lots WHERE id = $1 FOR UPDATE`, 
        [parkingLotId]
      );
      const lot = lotResult.rows[0];
      if (!lot) {
        throw new Error('Parking lot not found');
      }

      if (lot.available_spots <= 0) {
        throw new Error('No spots left in this parking lot');
      }

      // 3. Decrement available spots
      await query(
        `UPDATE parking_lots 
         SET available_spots = available_spots - 1, updated_at = NOW() 
         WHERE id = $1`,
        [parkingLotId]
      );

      // 4. Generate Reservation Token: e.g. PURI-8842-X
      const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 digit number
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomChar = chars[Math.floor(Math.random() * chars.length)];
      const token = `${customTokenPrefix.toUpperCase()}-${randomDigits}-${randomChar}`;

      const resId = randomUUID();
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // Valid for 20 minutes

      // 5. Insert reservation record
      const resResult = await query(
        `INSERT INTO parking_reservations (
          id, parking_lot_id, token, device_id, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, 'reserved') 
        RETURNING *`,
        [resId, parkingLotId, token, deviceId, expiresAt]
      );

      await query('COMMIT');
      return resResult.rows[0];
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  }

  // Cancel reservation manually (increments available spots)
  async cancelReservation(token: string): Promise<ParkingReservationRecord> {
    await query('BEGIN');
    try {
      // 1. Fetch reservation details and lock row for update
      const resResult = await query(
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
      const updatedResResult = await query(
        `UPDATE parking_reservations 
         SET status = $1, updated_at = NOW() 
         WHERE token = $2 RETURNING *`,
        [targetStatus, token]
      );

      // 3. Increment available spots (only if it wasn't already expired and counted by background cleanup)
      const lotResult = await query(
        `SELECT * FROM parking_lots WHERE id = $1`,
        [reservation.parking_lot_id]
      );
      const lot = lotResult.rows[0];
      if (lot) {
        await query(
          `UPDATE parking_lots 
           SET available_spots = LEAST(total_spots, available_spots + 1), updated_at = NOW() 
           WHERE id = $1`,
          [reservation.parking_lot_id]
        );
      }

      await query('COMMIT');
      return updatedResResult.rows[0];
    } catch (err) {
      await query('ROLLBACK');
      throw err;
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
