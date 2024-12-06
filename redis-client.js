import redis from 'redis';

const client = redis.createClient({
    host: 'localhost',
    port: 6379
});
client.connect();
client.on('error', (err) => {
    console.log('Redis 连接错误:', err);
});
client.on('connect', () => {
    console.log('Redis 连接成功');
});

export default client;