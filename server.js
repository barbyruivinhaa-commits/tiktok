import express from 'express';
import cors from 'cors';
import { WebcastPushConnection } from 'tiktok-live-connector';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔥 conexão atual (uma por vez)
let currentConnection = null;
let currentUsername = null;

// 🔥 eventos capturados
let events = [];

// =======================
// STATUS
// =======================
app.get('/status', (req, res) => {
    res.send({ status: "online" });
});

// =======================
// ROOT
// =======================
app.get('/', (req, res) => {
    res.send("Servidor rodando");
});

// =======================
// EVENTOS
// =======================
app.get('/events', (req, res) => {
    res.send(events);
});

// =======================
// CONECTAR LIVE
// =======================
app.post('/connect', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send({ erro: "Username é obrigatório" });
    }

    try {
        // 🔥 se já existe conexão → desconecta
        if (currentConnection) {
            console.log(`🔌 Desconectando: ${currentUsername}`);
            currentConnection.disconnect();
            currentConnection = null;
        }

        // 🔥 limpa eventos antigos
        events = [];

        const connection = new WebcastPushConnection(username, {
            disableEulerFallbacks: true
        });

        await connection.connect();

        console.log(`✅ Conectado: ${username}`);

        currentConnection = connection;
        currentUsername = username;

        // 🎁 EVENTO GIFT
        connection.on('gift', (data) => {
            const evento = {
                username,
                user: data.nickname,
                gift: data.giftName,
                time: new Date().toISOString()
            };

            console.log(`🎁 ${username} - ${data.nickname} enviou ${data.giftName}`);

            events.push(evento);

            if (events.length > 100) {
                events.shift();
            }
        });

        res.send({ msg: "Conectado com sucesso" });

    } catch (err) {
        console.error("❌ ERRO AO CONECTAR:", err.message);

        res.status(500).send({
            erro: "Não foi possível conectar",
            detalhe: err.message
        });
    }
});

// =======================
// DESCONECTAR
// =======================
app.post('/disconnect', (req, res) => {
    if (currentConnection) {
        currentConnection.disconnect();
        console.log(`🔌 Desconectado: ${currentUsername}`);
        currentConnection = null;
        currentUsername = null;
        events = [];
        return res.send({ msg: "Desconectado" });
    }

    res.send({ msg: "Nenhuma conexão ativa" });
});

// =======================
// START
// =======================
app.listen(PORT, () => {
    console.log(`🚀 Rodando na porta ${PORT}`);
});