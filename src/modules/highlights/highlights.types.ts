export interface EventHighlight {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  location: string | null;
  time: string | null;
  image_url: string | null;
  highlight_date: string; // ISO date string YYYY-MM-DD
  created_at: Date;
  updated_at: Date;
}

export interface CreateHighlightDto {
  eventId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  time?: string | null;
  imageUrl?: string | null;
  highlightDate: string; // YYYY-MM-DD
}

export interface UpdateHighlightDto {
  title?: string;
  description?: string | null;
  location?: string | null;
  time?: string | null;
  imageUrl?: string | null;
  highlightDate?: string;
}
