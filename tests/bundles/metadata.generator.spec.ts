import { generateMetadataJson } from '@modules/bundles/metadata.generator';
import { query } from '@config/database';
import fs from 'fs';
import path from 'path';

jest.mock('@config/database');
jest.mock('fs');

describe('generateMetadataJson', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if event not found', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [] });
    await expect(generateMetadataJson('evt1', 1, 'out')).rejects.toThrow('Event not found for metadata generation');
  });

  it('should write metadata and return path', async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ id: 'evt1', name: 'Evt', north: 1, south: 2, east: 3, west: 4 }]
    });
    const expectedPath = path.join('out', 'metadata.json');

    const result = await generateMetadataJson('evt1', 1, 'out');
    
    expect(result).toBe(expectedPath);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
