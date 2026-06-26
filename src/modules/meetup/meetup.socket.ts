import { Server, Socket } from 'socket.io';
import { meetupService } from './meetup.service';
import logger from '../../utils/logger';

export function initMeetupSocket(io: Server) {
  logger.info('[Socket] Initializing Family Meetup Socket.io handler');

  const meetupNamespace = io.of('/meetup');

  meetupNamespace.on('connection', (socket: Socket) => {
    logger.info(`[Socket] Client connected to meetup namespace: ${socket.id}`);

    // Join a specific group room
    socket.on('join_group_room', (data: { groupId: string; memberId: string }) => {
      const { groupId, memberId } = data;
      if (!groupId || !memberId) {
        logger.warn(`[Socket] Missing groupId or memberId in join_group_room from: ${socket.id}`);
        return;
      }

      const roomName = `group_room_${groupId}`;
      socket.join(roomName);
      
      // Store metadata on socket session
      socket.data.groupId = groupId;
      socket.data.memberId = memberId;

      logger.info(`[Socket] Member ${memberId} joined room ${roomName} on socket ${socket.id}`);
      
      // Notify other members in the room
      socket.to(roomName).emit('member_status_changed', {
        memberId,
        status: 'online'
      });
    });

    // Handle real-time location publishing
    socket.on('publish_location', async (data: {
      groupId: string;
      memberId: string;
      latitude: number;
      longitude: number;
    }) => {
      const { groupId, memberId, latitude, longitude } = data;
      
      if (!groupId || !memberId || latitude === undefined || longitude === undefined) {
        logger.warn(`[Socket] Invalid location publish payload from: ${socket.id}`);
        return;
      }

      try {
        // 1. Update coordinates in PostgreSQL database (single-row overwrite)
        const result = await meetupService.updateLocation(groupId, memberId, latitude, longitude);
        
        // 2. Broadcast the updated coordinates to all other members in the group room
        const roomName = `group_room_${groupId}`;
        meetupNamespace.to(roomName).emit('location_updated', {
          memberId,
          latitude: Number(latitude),
          longitude: Number(longitude),
          lastActiveAt: result.member.last_active_at
        });

        logger.debug(`[Socket] Location updated & broadcasted for member ${memberId} in room ${roomName}`);
      } catch (err: any) {
        logger.error(`[Socket] Failed to update location for member ${memberId}:`, err);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Handle pulse request (asking another member to share location immediately)
    socket.on('pulse_request', (data: {
      groupId: string;
      targetMemberId: string;
      senderName: string;
    }) => {
      const { groupId, targetMemberId, senderName } = data;
      if (!groupId || !targetMemberId) return;

      const roomName = `group_room_${groupId}`;
      
      // Broadcast pulse event to the room. 
      // The target client matching targetMemberId will intercept this and trigger an instant location update.
      meetupNamespace.to(roomName).emit('pulse_received', {
        targetMemberId,
        senderName
      });
      
      logger.info(`[Socket] Pulse request sent from ${senderName} to ${targetMemberId} in room ${roomName}`);
    });

    // Handle assembly point changes (broadcast so others reload details)
    socket.on('assembly_changed', (data: { groupId: string }) => {
      const { groupId } = data;
      if (!groupId) return;
      
      const roomName = `group_room_${groupId}`;
      meetupNamespace.to(roomName).emit('assembly_updated');
      logger.info(`[Socket] Assembly changed broadcasted for group room: ${roomName}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const { groupId, memberId } = socket.data;
      logger.info(`[Socket] Client disconnected from meetup: ${socket.id}`);
      
      if (groupId && memberId) {
        const roomName = `group_room_${groupId}`;
        // Notify other members in the room that this member went offline
        meetupNamespace.to(roomName).emit('member_status_changed', {
          memberId,
          status: 'offline'
        });
      }
    });
  });
}
