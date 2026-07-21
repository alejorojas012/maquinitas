const url = 'https://upright-aardvark-104852.upstash.io';
const token = 'gQAAAAAAAZmUAAIgcDIyMjcxYjE2NzE0Mzk0MzFlYjJiNmNjYzFmYmVlMjYxZg';
const hash = '$2b$10$sNnjg1UceSDM3/BSlJheguWBUV21vhEXA6F4VveALXDhRpLMNwR2m';

const user = JSON.stringify({
  name: 'Alejo',
  email: 'alejo.rojas012@gmail.com',
  password: hash,
  status: 'approved',
  isAdmin: true,
  createdAt: new Date().toISOString()
});

fetch(url + '/set/user:alejo.rojas012@gmail.com', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ value: user })
}).then(r => r.json()).then(console.log)