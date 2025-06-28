const WebSocket = require('ws');

const API_KEY = '798a6a1790ac83bb8aa942016300892e1bfe1d381302694f2008ecd051eac8ae';
const BASE_URL = `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`;

const socket = new WebSocket(BASE_URL);

socket.on('open', () => {
  console.log('✅ WebSocket connected');
  const subs = ['5~CCCAGG~BTC~USD', '5~CCCAGG~ETH~USD', '5~CCCAGG~SOL~USD'];
  socket.send(JSON.stringify({ action: 'SubAdd', subs }));
  console.log('📨 Subscribed to:', subs);
});

socket.on('message', (data) => {
  try {
    const parsed = JSON.parse(data);
    console.log('📩 Message received:', parsed);
  } catch (err) {
    console.error('❌ Failed to parse message:', err);
  }
});

socket.on('error', (err) => {
  console.error('❌ WebSocket error:', err);
});

socket.on('close', (code, reason) => {
  console.warn(`⚠️ WebSocket closed. Code: ${code}, Reason: ${reason}`);
});
