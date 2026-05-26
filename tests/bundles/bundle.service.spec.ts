import { BundleService } from '@modules/bundles/bundle.service';
import { query } from '@config/database';
import { generateSqliteDb } from '@modules/bundles/sqlite.generator';
import { generateMetadataJson } from '@modules/bundles/metadata.generator';
import { packageMelapack } from '@modules/bundles/melapack.generator';
import { uploadLocalFile } from '@providers/minioProvider';
import fs from 'fs';

jest.mock('@config/database');
jest.mock('@modules/bundles/sqlite.generator');
jest.mock('@modules/bundles/metadata.generator');
jest.mock('@modules/bundles/melapack.generator');
jest.mock('@providers/minioProvider');
jest.mock('fs');
jest.mock('crypto', () => ({ randomUUID: () => 'mock-uuid' }));
jest.mock('@utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

describe('BundleService', () => {
  let service: BundleService;

  beforeEach(() => {
    service = new BundleService();
    jest.clearAllMocks();
  });

  describe('generateBundle', () => {
    it('should throw error if event not found', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });
      await expect(service.generateBundle('eventId', 'adminId')).rejects.toThrow('Event not found');
    });

    it('should successfully generate bundle and update db', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'eventId', name: 'Event Name', bundle_version: 1 }] }) // fetch event
        .mockResolvedValueOnce({}) // insert bundle
        .mockResolvedValueOnce({}); // update event

      (generateSqliteDb as jest.Mock).mockResolvedValue('path/to/db');
      (generateMetadataJson as jest.Mock).mockResolvedValue('path/to/meta');
      (packageMelapack as jest.Mock).mockResolvedValue({ bundlePath: 'path/to/bundle', size: 100 });
      (uploadLocalFile as jest.Mock).mockResolvedValue({ objectName: 'obj', minioUrl: 'url' });
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.generateBundle('eventId', 'adminId');

      expect(result).toHaveProperty('id', 'mock-uuid');
      expect(result).toHaveProperty('version', 2);
      expect(result).toHaveProperty('url', 'url');
      expect(fs.unlinkSync).toHaveBeenCalledTimes(3);
    });

    it('should handle missing bundle_version and start from 1', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'eventId', name: 'Event Name', bundle_version: null }] }) // fetch event
        .mockResolvedValueOnce({}) // insert bundle
        .mockResolvedValueOnce({}); // update event

      (generateSqliteDb as jest.Mock).mockResolvedValue('path/to/db');
      (generateMetadataJson as jest.Mock).mockResolvedValue('path/to/meta');
      (packageMelapack as jest.Mock).mockResolvedValue({ bundlePath: 'path/to/bundle', size: 100 });
      (uploadLocalFile as jest.Mock).mockResolvedValue({ objectName: 'obj', minioUrl: 'url' });
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.generateBundle('eventId', 'adminId');

      expect(result).toHaveProperty('version', 1);
    });

    it('should catch error inside try block and throw formatted error', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'eventId', name: 'Event Name', bundle_version: 1 }] }); // fetch event
      
      (generateSqliteDb as jest.Mock).mockRejectedValue(new Error('Generation failed'));
      
      await expect(service.generateBundle('eventId', 'adminId')).rejects.toThrow('Bundle generation failed: Generation failed');
    });
  });
});
