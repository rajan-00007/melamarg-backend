import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    description: z.string().optional(),
    logo_url: z.string().url('Invalid logo URL').optional().or(z.literal('')),
    banner_url: z.string().url('Invalid banner URL').optional().or(z.literal(''))
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
    north: z.number().optional(),
    south: z.number().optional(),
    east: z.number().optional(),
    west: z.number().optional()
  }).refine((data) => {
    // If any of the bbox coordinates is provided, all must be provided
    const hasNorth = data.north !== undefined;
    const hasSouth = data.south !== undefined;
    const hasEast = data.east !== undefined;
    const hasWest = data.west !== undefined;
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
