import fs from 'fs';
import path from 'path';
import archiver = require('archiver');
import logger from '../../utils/logger';

export const packageMelapack = async (eventName: string, dbPath: string, metadataPath: string, outputDir: string): Promise<{ bundlePath: string, size: number }> => {
  const sanitizedEventName = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const bundleFileName = `${sanitizedEventName}-v1.melapack`;
  const bundlePath = path.join(outputDir, bundleFileName);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(bundlePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    output.on('close', () => {
      logger.info(`Bundle created successfully: ${archive.pointer()} total bytes`);
      resolve({ bundlePath, size: archive.pointer() });
    });

    output.on('end', () => {
      logger.info('Data has been drained');
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        logger.warn('Archiver warning:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Append files
    archive.file(dbPath, { name: 'pois.db' });
    archive.file(metadataPath, { name: 'metadata.json' });

    archive.finalize();
  });
};
