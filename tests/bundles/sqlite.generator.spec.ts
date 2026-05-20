import { generateSqliteDb } from '@modules/bundles/sqlite.generator';
import { query } from '@config/database';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

jest.mock('@config/database');
jest.mock('better-sqlite3');
jest.mock('fs');
jest.mock('@utils/logger', () => ({ info: jest.fn() }));

describe('generateSqliteDb', () => {
  let mockDb: any;
  let mockRun: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRun = jest.fn();
    
    mockDb = {
      exec: jest.fn(),
      prepare: jest.fn().mockReturnValue({ run: mockRun }),
      transaction: jest.fn().mockImplementation((cb) => {
        return (items: any[]) => {
          cb(items);
        };
      }),
      close: jest.fn()
    };
    (Database as unknown as jest.Mock).mockReturnValue(mockDb);
  });

  it('should create dir, generate db and return path', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'p1', category_id: 'c1' }] }) // pois
      .mockResolvedValueOnce({ rows: [{ id: 'c1', name_en: 'cat' }] }); // categories

    const result = await generateSqliteDb('evt', 'out');

    expect(fs.mkdirSync).toHaveBeenCalledWith('out', { recursive: true });
    expect(mockDb.exec).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledTimes(2); // 1 poi, 1 category
    expect(mockDb.close).toHaveBeenCalled();
    expect(result).toBe(path.join('out', 'pois.db'));
  });

  it('should remove existing db if exists', async () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
      if (p === 'out') return true;
      if (p === path.join('out', 'pois.db')) return true;
      return false;
    });
    
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await generateSqliteDb('evt', 'out');

    expect(fs.unlinkSync).toHaveBeenCalledWith(path.join('out', 'pois.db'));
    expect(mockDb.close).toHaveBeenCalled();
  });
});
