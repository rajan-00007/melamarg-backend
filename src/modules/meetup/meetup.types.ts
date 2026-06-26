export interface MeetupGroup {
  id: string;
  event_id: string;
  name: string;
  code: string;
  pin: string;
  assembly_point_id?: string | null;
  assembly_custom_lat?: number | null;
  assembly_custom_lng?: number | null;
  assembly_custom_name?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface MeetupMember {
  id: string;
  group_id: string;
  name: string;
  is_organizer: boolean;
  latitude?: number | null;
  longitude?: number | null;
  last_active_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateGroupDto {
  eventId: string;
  name: string;
  pin: string;
  memberName: string;
  memberId?: string; // Optional client-side generated UUID
}

export interface JoinGroupDto {
  code: string;
  pin: string;
  memberName: string;
  memberId?: string; // Optional client-side generated UUID
}

export interface UpdateAssemblyDto {
  memberId: string;
  assemblyPointId?: string | null;
  customLat?: number | null;
  customLng?: number | null;
  customName?: string | null;
}
