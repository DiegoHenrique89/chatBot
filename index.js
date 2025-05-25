require('dotenv').config();
const express = require('express');
const axios = require('axios');
const tmi = require('tmi.js');

const app = express();
const PORT = 3000;

let accessToken = '';
let botInterval;

// Mensagens por jogo
const mensagens = {
  'eFootball': [
    'Esse chute foi de primeira!',
    'Esse cara manja dos dribles!',
    'Joga muito, lembra os tempos do PES!',
    'Esse passe foi cirúrgico!',
    'Jogo pegado, hein?'
  ],
  'Call of Duty: Warzone': [
    'Headshot insano!',
    'Esse gulag foi tenso!',
    'Cadê o loadout? 😅',
    'Revivendo o squad, nice!',
    'Esse drop foi arriscado!'
  ]
};

const usuariosFalsos = ['joao123', 'gamer_pro', 'noobzera', 'sniperXD', 'drible_top'];

// Inicializa conexão com chat
function iniciarBotJogo(gameName) {
  const canal = process.env.TWITCH_USERNAME.toLowerCase();

  const client = new tmi.Client({
    identity: {
      username: process.env.TWITCH_USERNAME,
      password: `oauth:${accessToken}`
    },
    channels: [canal]
  });

  client.connect()
    .then(() => {
      console.log('🤖 Bot conectado ao chat!');
      if (botInterval) clearInterval(botInterval);

      botInterval = setInterval(() => {
        const usuario = usuariosFalsos[Math.floor(Math.random() * usuariosFalsos.length)];
        const mensagensDoJogo = mensagens[gameName] || ['Live top!'];
        const texto = mensagensDoJogo[Math.floor(Math.random() * mensagensDoJogo.length)];
        client.say(canal, `[${usuario}]: ${texto}`);
        console.log(`🗨️  ${usuario}: ${texto}`);
      }, 15000); // a cada 15 segundos
    })
    .catch(console.error);
}

// Consulta o jogo atual do canal
async function verificarJogo() {
  try {
    const response = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${process.env.TWITCH_USERNAME}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.data.data.length > 0) {
      const stream = response.data.data[0];
      console.log(`🎮 Jogo detectado: ${stream.game_name}`);
      iniciarBotJogo(stream.game_name);
    } else {
      console.log('🚫 Canal offline');
    }
  } catch (err) {
    console.error('Erro ao verificar jogo:', err.response?.data || err.message);
  }
}

// Autenticação via OAuth
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Código ausente.');

  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TWITCH_REDIRECT_URI
      }
    });

    accessToken = response.data.access_token;
    console.log('✅ Access token obtido!');
    verificarJogo(); // iniciar após autenticação

    res.send('Autenticado com sucesso! Pode fechar esta aba.');
  } catch (err) {
    console.error('Erro no callback:', err.response?.data || err.message);
    res.status(500).send('Erro ao obter token.');
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando em http://localhost:${PORT}`);
});
