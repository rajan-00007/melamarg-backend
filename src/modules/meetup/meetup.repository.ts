import { query } from '../../config/database';
import { PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { MeetupGroup, MeetupMember, UpdateAssemblyDto } from './meetup.types';

export class MeetupRepository {
  async getGroupById(groupId: string): Promise<MeetupGroup | null> {
    const result = await query(
      `SELECT * FROM meetup_groups WHERE id = $1`,
      [groupId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async getGroupByCode(code: string): Promise<MeetupGroup | null> {
    const result = await query(
      `SELECT * FROM meetup_groups WHERE UPPER(code) = UPPER($1)`,
      [code]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async isCodeExists(code: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM meetup_groups WHERE UPPER(code) = UPPER($1) LIMIT 1`,
      [code]
    );
    return result.rows.length > 0;
  }

  async createGroup(
    client: PoolClient,
    groupId: string,
    eventId: string,
    name: string,
    code: string,
    pin: string
  ): Promise<MeetupGroup> {
    const result = await client.query(
      `INSERT INTO meetup_groups (id, event_id, name, code, pin) 
       VALUES ($1, $2, $3, UPPER($4), $5) RETURNING *`,
      [groupId, eventId, name, code, pin]
    );
    return result.rows[0];
  }

  async createMember(
    client: PoolClient,
    memberId: string,
    groupId: string,
    name: string,
    isOrganizer: boolean
  ): Promise<MeetupMember> {
    const result = await client.query(
      `INSERT INTO meetup_members (id, group_id, name, is_organizer) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [memberId, groupId, name, isOrganizer]
    );
    return result.rows[0];
  }

  async getGroupMembers(groupId: string): Promise<MeetupMember[]> {
    const result = await query(
      `SELECT * FROM meetup_members WHERE group_id = $1 ORDER BY created_at ASC`,
      [groupId]
    );
    return result.rows;
  }

  async getMemberById(memberId: string): Promise<MeetupMember | null> {
    const result = await query(
      `SELECT * FROM meetup_members WHERE id = $1`,
      [memberId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async updateMemberLocation(
    groupId: string,
    memberId: string,
    latitude: number,
    longitude: number
  ): Promise<MeetupMember | null> {
    const result = await query(
      `UPDATE meetup_members 
       SET latitude = $1, longitude = $2, last_active_at = NOW(), updated_at = NOW() 
       WHERE id = $3 AND group_id = $4 RETURNING *`,
      [latitude, longitude, memberId, groupId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async updateAssemblyPoint(
    groupId: string,
    dto: UpdateAssemblyDto
  ): Promise<MeetupGroup | null> {
    const result = await query(
      `UPDATE meetup_groups 
       SET assembly_point_id = $1, 
           assembly_custom_lat = $2, 
           assembly_custom_lng = $3, 
           assembly_custom_name = $4,
           updated_at = NOW() 
       WHERE id = $5 RETURNING *`,
      [
        dto.assemblyPointId || null,
        dto.customLat !== undefined ? dto.customLat : null,
        dto.customLng !== undefined ? dto.customLng : null,
        dto.customName || null,
        groupId
      ]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async deleteMember(
    client: PoolClient,
    groupId: string,
    memberId: string
  ): Promise<boolean> {
    const result = await client.query(
      `DELETE FROM meetup_members WHERE id = $1 AND group_id = $2`,
      [memberId, groupId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteGroup(client: PoolClient, groupId: string): Promise<boolean> {
    const result = await client.query(
      `DELETE FROM meetup_groups WHERE id = $1`,
      [groupId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const meetupRepository = new MeetupRepository();
