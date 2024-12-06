
import client from './redis-client.js';

import { getTimeDiffToEndOfToday } from './utils.js';

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
export async function updateScore(playerId, score) {
    const SCORE_MIN = 0;
    const SCORE_MAX = 1000000;
    console.log(`Updating score for player ${playerId} with score ${score}`);
    // 校验分数是否在合理范围内
    if (score < SCORE_MIN || score > SCORE_MAX) {
        console.error(`Invalid score value: ${score}. Score should be between ${SCORE_MIN} and ${SCORE_MAX}.`);
        return;
    }
    const prevRank = await getPlayerCurrentRank(playerId);
    const timestamp = BigInt(getTimeDiffToEndOfToday());
    const shiftedScore = BigInt(score) << BigInt(MAX_TIMESTAMP_SHIFT);
    const finalCombinedValue = shiftedScore | timestamp;
    console.log(`Player ID: ${playerId}, Score: ${score}, Timestamp: ${timestamp}`);
    try {
        console.log(`Combined value: ${Number(finalCombinedValue)}`);
        await client.ZADD(RANKINGS_KEY, { score: finalCombinedValue, value: playerId }, { CH: true });
    } catch (error) {
        console.error('Error occurred while updating score:', error);
        console.error(`Player ID: ${playerId}, Score: ${score}, Timestamp: ${timestamp}`);
        throw new Error(`Failed to update score for player ${playerId}. See console for details.`);
    }
    const currentRank = await getPlayerCurrentRank(playerId);
    console.log(`Player ${playerId} has current rank ${currentRank}`)
    return { prevRank, currentRank };
}

export async function updateScoreAndNotifyRankChanges(playerId, score) {
    const { prevRank, currentRank } = await updateScore(playerId, score);
    return await handleRankChanges(playerId, prevRank, currentRank);
}

//  变化前排名 变化后排名 确定影响范围  
async function handleRankChanges(playerId, prevRank, currentRank) {
    const allPlayersWithRankChanges = [];
    if (prevRank === null && currentRank !== null) {
        const playerIdsAffected = await client.ZRANGEBYSCORE(RANKINGS_KEY, currentRank, '+inf', 'WITHSCORES');
        const playersAffected = [];
        for (let i = 0; i < playerIdsAffected.length; i += 2) {
            playersAffected.push(playerIdsAffected[i]);
        }
        allPlayersWithRankChanges.push(...playersAffected);
    } else if (prevRank !== null && currentRank === null) {
        const playerIdsAffected = await client.ZRANGEBYSCORE(RANKINGS_KEY, '-inf', prevRank, 'WITHSCORES');
        const playersAffected = [];
        for (let i = 0; i < playerIdsAffected.length; i += 2) {
            playersAffected.push(playerIdsAffected[i]);
        }
        allPlayersWithRankChanges.push(...playersAffected);
    } else if (prevRank !== currentRank) {
        const startRank = Math.min(prevRank, currentRank);
        const endRank = Math.max(prevRank, currentRank);
        const playerIdsAffected = await client.ZRANGEBYSCORE(RANKINGS_KEY, startRank, endRank, 'WITHSCORES');
        const playersAffected = [];
        for (let i = 0; i < playerIdsAffected.length; i += 2) {
            playersAffected.push(playerIdsAffected[i]);
        }
        allPlayersWithRankChanges.push(...playersAffected);
    }
    allPlayersWithRankChanges.push(playerId);
    return allPlayersWithRankChanges;
}


// 查询排行榜分页数据，每页最多100条
export async function getRankingsByPage(page = 1) {
    const startIndex = (page - 1) * 100;
    const endIndex = startIndex + 99;
    console.log(`Fetching rankings from ${startIndex} to ${endIndex}`)
    return await client.ZRANGE_WITHSCORES(RANKINGS_KEY, startIndex, endIndex);
}

// 查询指定玩家当前排名
export async function getPlayerCurrentRank(playerId) {
    const rank = await client.ZREVRANK(RANKINGS_KEY, playerId);
    return rank !== null ? rank + 1 : null;
}

// 查询指定玩家附近排名（上下10名）
export async function getPlayerNearbyRank(playerId) {
    const currentRank = await getPlayerCurrentRank(playerId);
    if (currentRank === null) {
        return null;
    }
    const startRank = Math.max(currentRank - 10, 0);
    const endRank = Math.min(currentRank + 10, await client.ZCARD(RANKINGS_KEY));
    return await client.ZRANGE_WITHSCORES(RANKINGS_KEY, startRank, endRank);
}
