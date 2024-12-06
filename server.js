import * as WebSocket from 'ws';
import { updateScoreAndNotifyRankChanges, getRankingsByPage, getPlayerNearbyRank, getPlayerCurrentRank } from './rankings.js';
const wss = new WebSocket.WebSocketServer({ port: 8080 });

const clients = [];
const clientNameMap = {};
let clientCount = 0;

export const playerSocketMap = new Map();
const clientHeartbeatTimers = new Map();

const HEARTBEAT_INTERVAL = 10000; 

wss.on('connection', (ws) => {
    clients.push(ws);
    const assignedName = `user${clientCount++}`;
    clientNameMap[ws] = assignedName;
    console.log('新客户端连接，分配用户名:', assignedName);
    playerSocketMap.set(assignedName, ws);
    startHeartbeat(ws, assignedName);
    ws.on('message', async(message) => {
        const data = JSON.parse(message);
        console.log('收到客户端消息:', data);
        resetHeartbeat(ws);
        switch (data.type) {
            case 'join_game':
                const role = assignRole();
                const response = { type: 'join_game_success', role, playerId: assignedName };
                ws.send(JSON.stringify(response));
                break;
            case 'update_score':
                const rankChangeList = await updateScoreAndNotifyRankChanges(data.playerId, data.score);
                console.log('更新分数后的排名变化列表:', rankChangeList)
                notifyRankChangeList(rankChangeList);
                broadcastScoreUpdate(data.playerId, data.score);
                break;
            case 'query_rank_list':
                const rankList = await getRankingsByPage();       
                notifyRankList(data.playerId,rankList)
                break;
            case 'query_nearby_rank':
                const nearbyRankList = await getPlayerNearbyRank(data.playerId);
                console.log('查询附近排名:', nearbyRankList);
                notifyNearByRankList(data.playerId,nearbyRankList)
                break;    
            case 'query_current_rank':
                const currentRank = await getPlayerCurrentRank(data.playerId);
                notifyCurrentRank(data.playerId,currentRank)
                console.log('查询当前排名:', currentRank);
                break;    
            default:
                console.log('未知消息类型');
        }
    });

    ws.on('close', () => {
        const index = clients.indexOf(ws);
        if (index !== -1) {
            clients.splice(index, 1);
            delete clientNameMap[ws];
            clearHeartbeat(ws);
        }
        console.log('客户端断开连接');
    });

    ws.on('error', (err) => {
        console.log('客户端网络异常:', err);
        const index = clients.indexOf(ws);
        if (index!== -1) {
            clients.splice(index, 1);
            delete clientNameMap[ws];
            clearHeartbeat(ws);
        }
    });
});

function broadcast(message) {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastScoreUpdate(playerId, score) {
    const message = JSON.stringify({
        type: 'score_update',
        playerId,
        score
    });
    broadcast(message);
}

function assignRole() {
    const randomNum = Math.random();
    if (randomNum < 0.2) {
        return 'warrior';
    } else if (randomNum < 0.4) {
        return 'mage';
    } else if (randomNum < 0.6) {
        return 'assassin';
    } else if (randomNum < 0.8) {
        return 'summoner';
    } else {
        return 'archer';
    }
}

// 批量通知
function notifyRankChangeList(playersWithRankChanges) {
    for (const changedPlayerId of playersWithRankChanges) {
        notifyRankChange(changedPlayerId);
    }
}

function notifyRankChange(playerId) {
    const ws = playerSocketMap.get(playerId);
    if (ws) {
        const message = `玩家 ${playerId}，你的排名发生了变化，请查看最新排行榜。`;
        ws.send(JSON.stringify({ type: 'rank_change_notification', content: message }));
    }
}


function notifyRankList(playerId, rankList) {
    const ws = playerSocketMap.get(playerId);
    if (ws) {
        const message = JSON.stringify(rankList);
        ws.send(JSON.stringify({ type: 'rank_list', rankData: message }));
    }
}

function notifyNearByRankList(playerId, rankList) {
    const ws = playerSocketMap.get(playerId);
    if (ws) {
        const message = JSON.stringify(rankList);
        ws.send(JSON.stringify({ type: 'nearby_rank_list', rankData: message }));
    }
}

function notifyCurrentRank(playerId, rank) {
    const ws = playerSocketMap.get(playerId);
    if (ws) {
        ws.send(JSON.stringify({ type: 'current_rank', rank: rank }));
    }
}

function startHeartbeat(ws, clientName) {
    const heartbeatTimer = setInterval(() => {
        console.log(`发送心跳包给客户端 ${clientName}`, ws.readyState)
        if (ws.readyState === WebSocket.OPEN) {
            const heartbeatMessage = JSON.stringify({ type: 'heartbeat' });
            ws.send(heartbeatMessage);
            console.log(`向客户端 ${clientName} 发送心跳包`);
        } else {
            clearHeartbeat(ws);
        }
    }, HEARTBEAT_INTERVAL);
    clientHeartbeatTimers.set(ws, heartbeatTimer);
}

function resetHeartbeat(ws) {
    const timer = clientHeartbeatTimers.get(ws);
    if (timer) {
        clearTimeout(timer);
        startHeartbeat(ws, clientNameMap[ws]);
    }
}

function clearHeartbeat(ws) {
    const timer = clientHeartbeatTimers.get(ws);
    if (timer) {
        clearInterval(timer);
        clientHeartbeatTimers.delete(ws);
    }
}