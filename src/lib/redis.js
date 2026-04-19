import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

export default connection;
