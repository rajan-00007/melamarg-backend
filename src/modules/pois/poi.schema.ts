import { z } from 'zod';

export const getPOIsByEventSchema = z.object({
  query: z.object({
    eventId: z.string().uuid('Invalid event ID')
  })
});

export const createPOISchema = z.object({
  body: z.object({
    event_id: z.string().uuid('Invalid event ID'),
    lat: z.number({ required_error: 'Latitude is required', invalid_type_error: 'Latitude must be a number' }),
    lng: z.number({ required_error: 'Longitude is required', invalid_type_error: 'Longitude must be a number' }),
    category_id: z.string().optional(),
    name: z.string().optional(),
    name_en: z.string().optional(),
    name_hi: z.string().optional(),
    name_or: z.string().optional(),
    description: z.string().optional(),
    icon_url: z.string().url('Invalid icon URL').optional().or(z.literal(''))
  })
});

export const updatePOISchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid POI ID')
  }),
  body: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
    category_id: z.string().optional(),
    name: z.string().optional(),
    name_en: z.string().optional(),
    name_hi: z.string().optional(),
    name_or: z.string().optional(),
    description: z.string().optional(),
    icon_url: z.string().url('Invalid icon URL').optional().or(z.literal(''))
  })
});

export const deletePOISchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid POI ID')
  })
});
