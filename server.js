const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const clients = [];
const clientNameMap = {};
let clientCount = 0;

wss.on('connection', (ws) => {
    clients.push(ws);
    const assignedName = `user${clientCount++}`;
    clientNameMap[ws] = assignedName;
    console.log('新客户端连接，分配用户名:', assignedName);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log('收到客户端消息:', data);
        switch (data.type) {
            case 'join_game':
                const role = assignRole();
                const response = { type: 'join_game_success', role };
                ws.send(JSON.stringify(response));
                break;
            case 'update_score':
                updateScore(data.playerId, data.score);
                broadcastScoreUpdate(data.playerId, data.score);
                break;
            default:
                console.log('未知消息类型');
        }
    });

    ws.on('close', () => {
        const index = clients.indexOf(ws);
        if (index!== -1) {
            clients.splice(index, 1);
            delete clientNameMap[ws];
        }
        console.log('客户端断开连接');
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
        return'mage'; 
    } else if (randomNum < 0.6) {
        return 'assassin';
    } else if (randomNum < 0.8) {
        return'summoner'; 
    } else {
        return 'archer'; 
    }
}
function updateScore(playerId, score) {
    console.log(`更新玩家 ${playerId} 的分数为 ${score}`);
}

function sendToClient(clientName, message) {
    for (const client in clientNameMap) {
        if (clientNameMap[client] === clientName && client.readyState === WebSocket.OPEN) {
            client.send(message);
            break;
        }
    }
}

module.exports = {
    broadcast,
    broadcastScoreUpdate,
    sendToClient
};