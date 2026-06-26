import pool from '../../config/database';
import redis from '../../config/redis';
import { randomUUID } from 'crypto';
import { meetupRepository } from './meetup.repository';
import { MeetupGroup, MeetupMember, CreateGroupDto, JoinGroupDto, UpdateAssemblyDto } from './meetup.types';

export class MeetupService {
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createGroup(dto: CreateGroupDto): Promise<{ group: MeetupGroup; member: MeetupMember }> {
    if (!dto.eventId || !dto.name || !dto.pin || !dto.memberName) {
      throw new Error('Event ID, group name, PIN, and member name are required');
    }

    // Generate unique 6-character uppercase code
    let code = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      code = this.generateRandomCode();
      const exists = await meetupRepository.isCodeExists(code);
      if (!exists) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate a unique group code. Please try again.');
    }

    const groupId = randomUUID();
    const memberId = dto.memberId || randomUUID();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const group = await meetupRepository.createGroup(
        client,
        groupId,
        dto.eventId,
        dto.name,
        code,
        dto.pin
      );

      const member = await meetupRepository.createMember(
        client,
        memberId,
        groupId,
        dto.memberName,
        true // is_organizer = true
      );

      await client.query('COMMIT');
      return { group, member };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async joinGroup(dto: JoinGroupDto): Promise<{ group: MeetupGroup; member: MeetupMember }> {
    if (!dto.code || !dto.pin || !dto.memberName) {
      throw new Error('Group code, PIN, and your name are required');
    }

    const group = await meetupRepository.getGroupByCode(dto.code);
    if (!group) {
      throw new Error('Group not found with the provided code');
    }

    if (group.pin !== dto.pin) {
      throw new Error('Incorrect group PIN');
    }

    const memberId = dto.memberId || randomUUID();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const member = await meetupRepository.createMember(
        client,
        memberId,
        group.id,
        dto.memberName,
        false // is_organizer = false
      );

      await client.query('COMMIT');
      return { group, member };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getGroupDetails(groupId: string, memberId: string): Promise<{ group: MeetupGroup; members: MeetupMember[] }> {
    const group = await meetupRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const dbMembers = await meetupRepository.getGroupMembers(groupId);
    const isMember = dbMembers.some((m) => m.id === memberId);
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this group');
    }

    // Fetch active locations from Redis and merge them
    const key = `meetup:group:${groupId}:locations`;
    const redisLocations = await redis.hgetall(key);

    const mergedMembers = dbMembers.map((m) => {
      const activeLocRaw = redisLocations[m.id];
      if (activeLocRaw) {
        try {
          const activeLoc = JSON.parse(activeLocRaw);
          return {
            ...m,
            latitude: Number(activeLoc.latitude),
            longitude: Number(activeLoc.longitude),
            last_active_at: activeLoc.lastActiveAt
          };
        } catch (e) {
          return m;
        }
      }
      return m;
    });

    return { group, members: mergedMembers };
  }

  async updateLocation(
    groupId: string,
    memberId: string,
    latitude: number,
    longitude: number
  ): Promise<{ member: MeetupMember; members: MeetupMember[] }> {
    const key = `meetup:group:${groupId}:locations`;
    const now = new Date();

    // 1. Write coordinates and active timestamp to Redis Hash (Zero PostgreSQL writes)
    await redis.hset(
      key,
      memberId,
      JSON.stringify({
        latitude,
        longitude,
        lastActiveAt: now
      })
    );

    // Set TTL on the Redis hash to 24 hours so inactive group data automatically expires
    await redis.expire(key, 86400);

    // 2. Fetch all registered members of the group from PostgreSQL (static metadata)
    const dbMembers = await meetupRepository.getGroupMembers(groupId);
    const targetMember = dbMembers.find((m) => m.id === memberId);
    if (!targetMember) {
      throw new Error('Member not found in the specified group');
    }

    // 3. Fetch all active coordinates from Redis for this group
    const redisLocations = await redis.hgetall(key);

    // 4. Merge static DB details with active coordinates from Redis
    const mergedMembers = dbMembers.map((m) => {
      const activeLocRaw = redisLocations[m.id];
      if (activeLocRaw) {
        try {
          const activeLoc = JSON.parse(activeLocRaw);
          return {
            ...m,
            latitude: Number(activeLoc.latitude),
            longitude: Number(activeLoc.longitude),
            last_active_at: activeLoc.lastActiveAt
          };
        } catch (e) {
          return m;
        }
      }
      return m;
    });

    const updatedMember = mergedMembers.find((m) => m.id === memberId)!;

    return { member: updatedMember, members: mergedMembers };
  }

  async setAssemblyPoint(groupId: string, dto: UpdateAssemblyDto): Promise<MeetupGroup> {
    const group = await meetupRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const members = await meetupRepository.getGroupMembers(groupId);
    const isMember = members.some((m) => m.id === dto.memberId);
    if (!isMember) {
      throw new Error('Access denied: Only members can set the assembly point');
    }

    const updatedGroup = await meetupRepository.updateAssemblyPoint(groupId, dto);
    if (!updatedGroup) {
      throw new Error('Failed to update assembly point');
    }

    return updatedGroup;
  }

  async leaveGroup(groupId: string, memberId: string): Promise<{ success: boolean; groupDeleted: boolean }> {
    const group = await meetupRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const members = await meetupRepository.getGroupMembers(groupId);
    const leavingMember = members.find((m) => m.id === memberId);
    if (!leavingMember) {
      throw new Error('Member not found in this group');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let groupDeleted = false;

      // If the leaving member is the organizer, or the last member, delete the entire group
      if (leavingMember.is_organizer || members.length <= 1) {
        await meetupRepository.deleteGroup(client, groupId);
        groupDeleted = true;

        // Clean up all locations for this group from Redis
        const key = `meetup:group:${groupId}:locations`;
        await redis.del(key);
      } else {
        await meetupRepository.deleteMember(client, groupId, memberId);

        // Clean up this specific member's location from Redis
        const key = `meetup:group:${groupId}:locations`;
        await redis.hdel(key, memberId);
      }

      await client.query('COMMIT');
      return { success: true, groupDeleted };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const meetupService = new MeetupService();
