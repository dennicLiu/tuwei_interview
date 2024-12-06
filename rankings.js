const client = require('./redis-client');

// 将每个成员（即参与排行的对象）作为有序集合的成员，将其分数（即排行的分数）作为有序集合的分数。
// 使用ZADD命令将成员和分数添加到有序集合中。
// 使用ZINCRBY命令可以对有序集合中的成员的分数进行增加或减少。
// 使用ZREVRANK命令可以获取有序集合中成员的排名（从高到低，排名从0开始）。
// 使用ZRANGE命令可以获取有序集合中指定排名范围内的成员。
// 使用ZSCORE命令可以获取有序集合中成员的分数。
// 使用ZREMRANGE命令可以删除有序集合中指定排名范围内的成员。
// 使用ZREMRANGEBYSCORE命令可以删除有序集合中指定分数范围内的成员

// 排行榜有序集合的键名
const RANKINGS_KEY = 'game_rankings';
const MAX_TIMESTAMP_SHIFT = 16;
async function updateScore(playerId, score, timestamp) {
    const SCORE_MIN = 0; 
    const SCORE_MAX = 10000;
    if (score < SCORE_MIN || score > SCORE_MAX) {
        console.error(`Invalid score value: ${score}. Score should be between ${SCORE_MIN} and ${SCORE_MAX}.`);
        return;
    }
    console.log(`Updating score for player ${playerId} to ${score}`);
    // 将分数左移一定位数，腾出空间给后面要合并的时间戳部分
    const shiftedScore = score << MAX_TIMESTAMP_SHIFT;
    // 将时间戳融入分值计算，左移后与分数部分合并
    const finalCombinedValue = shiftedScore | timestamp;

    try {
        console.log(`Combined value: ${finalCombinedValue}`);
        await client.ZINCRBY(RANKINGS_KEY, finalCombinedValue.toString(), playerId);
    } catch (error) {
        console.error('Error occurred while updating score:', error);
        console.error(`Player ID: ${playerId}, Score: ${score}, Timestamp: ${timestamp}`);
        throw new Error(`Failed to update score for player ${playerId}. See console for details.`);
    }
}


// 查询排行榜分页数据，每页最多100条
async function getRankingsByPage(page = 1) {
    const startIndex = (page - 1) * 100;
    const endIndex = startIndex + 99;
    const rankings = await client.ZRANGE(RANKINGS_KEY, startIndex, endIndex, {BY: 'SCORE'});
    const result = [];
    for (let i = 0; i < rankings.length; i += 2) {
        const playerId = rankings[i];
        const scoreTime = rankings[i + 1].split(':');
        const score = scoreTime[0];
        result.push({ playerId, score });
    }
    return result;
}

// 查询指定玩家当前排名
async function getPlayerCurrentRank(playerId) {
    const rank = await client.ZSCORE(RANKINGS_KEY, playerId);
    return rank!== null? rank + 1 : null;
}

// 查询指定玩家附近排名（上下10名）
async function getPlayerNearbyRank(playerId) {
    const currentRank = await getPlayerCurrentRank(playerId);
    if (currentRank === null) {
        return null;
    }
    const startRank = Math.max(currentRank - 10, 0);
    const endRank = Math.min(currentRank + 10, await client.ZCARD(RANKINGS_KEY));
    const nearbyRankings = await client.ZRANGE(RANKINGS_KEY, startRank, endRank, {BY: 'SCORE'});
    const result = [];
    for (let i = 0; i < nearbyRankings.length; i += 2) {
        const nearbyPlayerId = nearbyRankings[i];
        const scoreTime = nearbyRankings[i + 1].split(':');
        const score = scoreTime[0];
        result.push({ playerId: nearbyPlayerId, score });
    }
    return result;
}

module.exports = {
    updateScore,
    getRankingsByPage,
    getPlayerCurrentRank,
    getPlayerNearbyRank
};