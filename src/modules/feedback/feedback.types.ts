export interface Feedback {
  id: string;
  event_id: string | null;
  rating: number;
  thoughts: string | null;
  created_at: Date;
}

export interface CreateFeedbackDto {
  event_id?: string;
  rating: number;
  thoughts?: string;
}
