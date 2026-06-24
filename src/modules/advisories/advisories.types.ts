export interface TrafficAdvisory {
  id: string;
  event_id: string;
  title: string;
  message: string;
  start_node_id: string | null;
  end_node_id: string | null;
  advisory_type: 'zone' | 'road';
  status_tag: 'stable' | 'warning' | 'congested' | 'critical' | 'general';
  is_active: boolean;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdvisoryEdge {
  id: string;
  advisory_id: string;
  edge_id: string;
  status: 'blocked' | 'recommended';
}

export interface AdvisoryEdgePayload {
  edgeId: string;
  status: 'blocked' | 'recommended';
}

export interface CreateAdvisoryDto {
  eventId: string;
  title: string;
  message: string;
  startNodeId?: string | null;
  endNodeId?: string | null;
  edges: AdvisoryEdgePayload[];
  zoneIds?: string[];
  advisory_type?: 'zone' | 'road';
  status_tag?: 'stable' | 'warning' | 'congested' | 'critical' | 'general';
  createdBy?: string;
}

export interface TrafficAdvisoryResponse extends TrafficAdvisory {
  edges: {
    edge_id: string;
    status: 'blocked' | 'recommended';
  }[];
  zoneIds?: string[];
}
