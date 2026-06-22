export interface CreateRouteNodeDto {
  id?: string;
  name?: string | null;
  latitude: number;
  longitude: number;
  node_type?: string;
  poi_id?: string | null;
  is_entrance?: boolean;
  is_parking?: boolean;
}

export interface CreateRouteEdgeDto {
  startNodeId: string;
  endNodeId: string;
  path_name?: string | null;
}

export interface CreateRouteGraphDto {
  eventId: string;
  nodes: CreateRouteNodeDto[];
  edges?: CreateRouteEdgeDto[];
}

