import { POIRepository } from '@modules/pois/poi.repository';
import { query } from '@config/database';

jest.mock('@config/database');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('POIRepository', () => {
  let repo: POIRepository;

  beforeEach(() => {
    repo = new POIRepository();
    jest.clearAllMocks();
  });

  it('should createPOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.createPOI({ event_id: 'e', latitude: 1, longitude: 2 });
    expect(result).toEqual({ id: 'mock-uuid' });
    expect(query).toHaveBeenCalled();
  });

  it('should getPOIsByEvent', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getPOIsByEvent('e');
    expect(result).toEqual([{ id: 'mock-uuid' }]);
  });


  it('should getPOIById', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getPOIById('p');
    expect(result).toEqual({ id: 'mock-uuid' });
  });

  it('should updatePOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid', name_en: 'n' }] });
    const result = await repo.updatePOI('mock-uuid', { name_en: 'n' });
    expect(result).toEqual({ id: 'mock-uuid', name_en: 'n' });
  });

  it('should return original POI if updateData is empty', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.updatePOI('mock-uuid', {});
    expect(result).toEqual({ id: 'mock-uuid' });
  });

  sdj 



  aj 


  import { POIRepository } from '@modules/pois/poi.repository';
import { query } from '@config/database';

jest.mock('@config/database');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('POIRepository', () => {
  let repo: POIRepository;

  beforeEach(() => {
    repo = new POIRepository();
    jest.clearAllMocks();
  });

  it('should createPOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.createPOI({ event_id: 'e', latitude: 1, longitude: 2 });
    expect(result).toEqual({ id: 'mock-uuid' });
    expect(query).toHaveBeenCalled();
  });

  it('should getPOIsByEvent', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getPOIsByEvent('e');
    expect(result).toEqual([{ id: 'mock-uuid' }]);
  });


  it('should getPOIById', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getPOIById('p');
    expect(result).toEqual({ id: 'mock-uuid' });
  });

  it('should updatePOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid', name_en: 'n' }] });
    const result = await repo.updatePOI('mock-uuid', { name_en: 'n' });
    expect(result).toEqual({ id: 'mock-uuid', name_en: 'n' });
  });

  it('should return original POI if updateData is empty', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.updatePOI('mock-uuid', {});
    expect(result).toEqual({ id: 'mock-uuid' });
  });


  dj  


  dsj 



  sdh  



  import { POIRepository } from '@modules/pois/poi.repository';
import { query } from '@config/database';

jest.mock('@config/database');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('POIRepository', () => {
  let repo: POIRepository;

  beforeEach(() => {
    repo = new POIRepository();
    jest.clearAllMocks();
  });

  it('should createPOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.createPOI({ event_id: 'e', latitude: 1, longitude: 2 });
    expect(result).toEqual({ id: 'mock-uuid' });
    expect(query).toHaveBeenCalled();
  });

  it('should getPOIsByEvent', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getPOIsByEvent('e');
    expect(result).toEqual([{ id: 'mock-uuid' }]);
  });


  it('should getPOIById', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getPOIById('p');
    expect(result).toEqual({ id: 'mock-uuid' });
  });

  it('should updatePOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid', name_en: 'n' }] });
    const result = await repo.updatePOI('mock-uuid', { name_en: 'n' });
    expect(result).toEqual({ id: 'mock-uuid', name_en: 'n' });
  });

  it('should return original POI if updateData is empty', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.updatePOI('mock-uuid', {});
    expect(result).toEqual({ id: 'mock-uuid' });
  });

  import { POIRepository } from '@modules/pois/poi.repository';
import { query } from '@config/database';

jest.mock('@config/database');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('POIRepository', () => {
  let repo: POIRepository;

  beforeEach(() => {
    repo = new POIRepository();
    jest.clearAllMocks();
  });

  it('should createPOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.createPOI({ event_id: 'e', latitude: 1, longitude: 2 });
    expect(result).toEqual({ id: 'mock-uuid' });
    expect(query).toHaveBeenCalled();
  });

  it('should getPOIsByEvent', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getPOIsByEvent('e');
    expect(result).toEqual([{ id: 'mock-uuid' }]);
  });


  it('should getPOIById', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.getPOIById('p');
    expect(result).toEqual({ id: 'mock-uuid' });
  });

  it('should updatePOI', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid', name_en: 'n' }] });
    const result = await repo.updatePOI('mock-uuid', { name_en: 'n' });
    expect(result).toEqual({ id: 'mock-uuid', name_en: 'n' });
  });

  it('should return original POI if updateData is empty', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
    const result = await repo.updatePOI('mock-uuid', {});
    expect(result).toEqual({ id: 'mock-uuid' });
  });

  sdj 



  sj  




  # Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Remove development dependencies to keep production node_modules lean
RUN npm prune --production

# Stage 2: Production Runtime
# Using plain alpine instead of node:alpine saves ~80-100MB 
# because it doesn't include npm, yarn, and other build tools.
FROM alpine:3.19

WORKDIR /app

# Install ONLY the nodejs runtime (no npm/yarn)
RUN apk add --no-cache nodejs

# Copy pruned node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
# Copy compiled output from builder
COPY --from=builder /app/dist ./dist
COPY package.json ./
# Copy .env file if it exists (generated during CI/CD build)
COPY .env* ./


# Create the node user (plain alpine doesn't have it)
RUN addgroup -S node && adduser -S node -G node
USER node

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["/usr/bin/node", "dist/server.js"]