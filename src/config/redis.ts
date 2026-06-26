import Redis from 'ioredis';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

logger.info(`[Redis] Connecting to Redis at ${redisHost}:${redisPort}`);

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  retryStrategy: (times) => {
    // Max retry delay is 2 seconds
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  logger.info('[Redis] Connected to Redis successfully');
});

redis.on('error', (err) => {
  logger.error('[Redis] Connection error:', err);
});

export default redis;
