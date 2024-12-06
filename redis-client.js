const redis = require('redis');
try {
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
    module.exports = client;
} catch (error) {
    console.error('创建 Redis 客户端时出现错误:', error);
}