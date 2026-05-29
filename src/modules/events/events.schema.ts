import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    description: z.string().optional(),
    logo_url: z.string().url('Invalid logo URL').optional().or(z.literal('')),
    banner_url: z.string().url('Invalid banner URL').optional().or(z.literal('')),
    metadata: z.record(z.any()).optional()
  })
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID')
  }),
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    description: z.string().optional(),
    logo_url: z.string().url('Invalid logo URL').optional().or(z.literal('')),
    banner_url: z.string().url('Invalid banner URL').optional().or(z.literal('')),
    north: z.number().nullable().optional(),
    south: z.number().nullable().optional(),
    east: z.number().nullable().optional(),
    west: z.number().nullable().optional(),
    metadata: z.record(z.any()).optional()
  }).refine((data) => {
    // If any of the bbox coordinates is provided (not null/undefined), all must be provided
    const hasNorth = data.north !== undefined && data.north !== null;
    const hasSouth = data.south !== undefined && data.south !== null;
    const hasEast = data.east !== undefined && data.east !== null;
    const hasWest = data.west !== undefined && data.west !== null;
    return (hasNorth && hasSouth && hasEast && hasWest) || (!hasNorth && !hasSouth && !hasEast && !hasWest);
  }, {
    message: "If updating bounding box, all coordinates (north, south, east, west) must be provided",
    path: ["bbox"]
  })
});

export const getEventByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID')
  })
});

export const publishEventSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID')
  })
});
