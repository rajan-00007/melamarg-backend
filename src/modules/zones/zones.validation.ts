import { z } from 'zod';

const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
}).or(z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
}));

export const createZoneSchema = z.object({
  params: z.object({
    eventId: z.string().uuid('Invalid Event ID')
  }),
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    boundary: z.array(coordinateSchema).min(3, 'At least 3 coordinate pairs are required for zone boundary'),
    allow_pedestrians: z.boolean().optional(),
    allow_2wheelers: z.boolean().optional(),
    allow_cars: z.boolean().optional(),
    advisory: z.string().optional().nullable()
  })
});

export const updateZoneSchema = z.object({
  params: z.object({
    eventId: z.string().uuid('Invalid Event ID'),
    id: z.string().uuid('Invalid Zone ID')
  }),
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
    boundary: z.array(coordinateSchema).min(3, 'At least 3 coordinate pairs are required for zone boundary').optional(),
    allow_pedestrians: z.boolean().optional(),
    allow_2wheelers: z.boolean().optional(),
    allow_cars: z.boolean().optional(),
    advisory: z.string().optional().nullable()
  })
});

export const getZonesSchema = z.object({
  params: z.object({
    eventId: z.string().uuid('Invalid Event ID')
  })
});

export const getZoneByIdSchema = z.object({
  params: z.object({
    eventId: z.string().uuid('Invalid Event ID'),
    id: z.string().uuid('Invalid Zone ID')
  })
});

export const findZoneSchema = z.object({
  params: z.object({
    eventId: z.string().uuid('Invalid Event ID')
  }),
  query: z.object({
    lat: z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val >= -90 && val <= 90, 'Invalid latitude'),
    lng: z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val >= -180 && val <= 180, 'Invalid longitude')
  })
});
