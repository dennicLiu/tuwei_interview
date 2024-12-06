import { updateScore, getRankingsByPage, getPlayerCurrentRank, getPlayerNearbyRank } from './rankings.js';

(async () => {
    await updateScore('player1', 100000);
    await updateScore('player2', 120000);
    await updateScore('player3', 110000);
    await updateScore('player4', 110000);

})();

// 示例：查询排行榜第一页数据
(async () => {
    const page1Rankings = await getRankingsByPage(1);
    console.log('第一页排行榜数据:', page1Rankings);
})();

// 示例：查询指定玩家当前排名
(async () => {
    const player2Rank = await getPlayerCurrentRank('player2');
    console.log('玩家2的当前排名:', player2Rank);
})();

// 示例：查询指定玩家附近排名（以玩家2为例）
(async () => {
    const player2NearbyRank = await getPlayerNearbyRank('player2');
    console.log('玩家2附近排名数据:', player2NearbyRank);
})();