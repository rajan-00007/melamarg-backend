import { packageMelapack } from '@modules/bundles/melapack.generator';
import fs from 'fs';
import archiver from 'archiver';
import path from 'path';
import { EventEmitter } from 'events';

jest.mock('fs');
jest.mock('archiver');
jest.mock('@utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

describe('packageMelapack', () => {
  it('should package reporting success', async () => {
    const mockOutput = new EventEmitter();
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockOutput);
    
    const mockArchive = new EventEmitter() as any;
    mockArchive.pointer = jest.fn().mockReturnValue(100);
    mockArchive.pipe = jest.fn();
    mockArchive.file = jest.fn();
    mockArchive.finalize = jest.fn().mockImplementation(() => {
      mockOutput.emit('close'); // Simulate close event on finalize
    });
    
    (archiver as unknown as jest.Mock).mockReturnValue(mockArchive);

    const resultPromise = packageMelapack('My Event', 'dbPath', 'metaPath', 'out');
    
    const result = await resultPromise;
    expect(result).toHaveProperty('size', 100);
    expect(mockArchive.pipe).toHaveBeenCalledWith(mockOutput);
    expect(mockArchive.file).toHaveBeenCalledTimes(2);
  });

  it('should handle archive errors', async () => {
    const mockOutput = new EventEmitter();
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockOutput);
    
    const mockArchive = new EventEmitter() as any;
    mockArchive.pipe = jest.fn();
    mockArchive.file = jest.fn();
    mockArchive.finalize = jest.fn().mockImplementation(() => {
      mockArchive.emit('error', new Error('Archive error'));
    });
    
    (archiver as unknown as jest.Mock).mockReturnValue(mockArchive);

    await expect(packageMelapack('My Event', 'dbPath', 'metaPath', 'out')).rejects.toThrow('Archive error');
  });

  it('should log when data is drained', async () => {
    const mockOutput = new EventEmitter();
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockOutput);
    
    const mockArchive = new EventEmitter() as any;
    mockArchive.pointer = jest.fn().mockReturnValue(100);
    mockArchive.pipe = jest.fn();
    mockArchive.file = jest.fn();
    mockArchive.finalize = jest.fn().mockImplementation(() => {
      mockOutput.emit('end');
      mockOutput.emit('close');
    });
    
    (archiver as unknown as jest.Mock).mockReturnValue(mockArchive);

    await packageMelapack('My Event', 'dbPath', 'metaPath', 'out');
    // Just ensuring it doesn't crash and the event is triggered
  });

  it('should handle ENOENT warning', async () => {
    const mockOutput = new EventEmitter();
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockOutput);
    
    const mockArchive = new EventEmitter() as any;
    mockArchive.pointer = jest.fn().mockReturnValue(100);
    mockArchive.pipe = jest.fn();
    mockArchive.file = jest.fn();
    mockArchive.finalize = jest.fn().mockImplementation(() => {
      const warnErr: any = new Error('ENOENT');
      warnErr.code = 'ENOENT';
      mockArchive.emit('warning', warnErr);
      mockOutput.emit('close');
    });
    
    (archiver as unknown as jest.Mock).mockReturnValue(mockArchive);

    await packageMelapack('My Event', 'dbPath', 'metaPath', 'out');
  });

  it('should reject on non-ENOENT warning', async () => {
    const mockOutput = new EventEmitter();
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockOutput);
    
    const mockArchive = new EventEmitter() as any;
    mockArchive.pipe = jest.fn();
    mockArchive.file = jest.fn();
    mockArchive.finalize = jest.fn().mockImplementation(() => {
      const warnErr: any = new Error('OTHER');
      warnErr.code = 'OTHER';
      mockArchive.emit('warning', warnErr);
    });
    
    (archiver as unknown as jest.Mock).mockReturnValue(mockArchive);

    await expect(packageMelapack('My Event', 'dbPath', 'metaPath', 'out')).rejects.toThrow('OTHER');
  });
});
