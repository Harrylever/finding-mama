'use strict';
// ---------- start.ng connect ----------
const START_NG = 'https://start.ng';
let frame;
function connectFrame() {
  frame ??= new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.onload = () => resolve(el);
    el.onerror = reject;
    document.body.append(el);
  });
  return frame;
}
async function askStartNg(message, replyType, timeoutMs = 5000) {
  let el;
  try { el = await connectFrame(); } catch { return null; }
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const done = (reply) => { clearTimeout(timer); removeEventListener('message', onMessage); resolve(reply); };
    const timer = setTimeout(() => done(null), timeoutMs);
    function onMessage(e) {
      if (e.origin !== START_NG || e.source !== el.contentWindow) return;
      if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
    }
    addEventListener('message', onMessage);
    el.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}

const DEFAULT_STYLE = { body: 'female', primaryColor: '#e8590c', secondaryColor: '#2b2f4a', skinColor: '#8d5524',
  hairColor: '#17120f', hair: 'braids', hat: 'none', accessory: 'none' };
let user = null;
let player = { name: 'Little One', style: DEFAULT_STYLE };

const $ = (id) => document.getElementById(id);
const signInUrl = () => `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;

async function refreshPlayer() {
  const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user');
  user = reply?.user ?? null;
  const p = reply?.user ?? reply?.guest;
  if (p) player = { name: p.name || 'Little One', style: { ...DEFAULT_STYLE, ...(p.style || {}) } };
  if (p?.face) $('player-face').src = p.face;
  $('player-name').textContent = p ? p.name : 'Guest';
  $('player-account').textContent = user?.account ? `@${user.account}` : 'Not signed in';
  $('player-sign-in').hidden = !!user;
  $('player-card').hidden = !p;
  $('title-who').textContent = user ? `${player.name} is lost in the big city...` : 'You are playing as a guest. Sign in to save your score.';
}
$('player-sign-in').onclick = () => { location.href = signInUrl(); };
addEventListener('focus', refreshPlayer);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshPlayer(); });

async function loadBoard(target) {
  const el = $(target);
  const reply = await askStartNg({ type: 'startng:leaderboard', limit: 5 }, 'startng:leaderboardData');
  const entries = reply?.ok ? reply.entries : null;
  if (!entries || !entries.length) { el.innerHTML = ''; return; }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  el.className = 'board';
  el.innerHTML = '<h3>Best journeys</h3><ol></ol>';
  for (const e of entries) {
    const li = document.createElement('li');
    if (user && e.player_id === user.id) li.className = 'me';
    li.textContent = `${e.name} — ★ ${e.stats?.keepsakes ?? e.score} in ${fmt(e.stats?.time ?? 0)}`;
    el.querySelector('ol').append(li);
  }
}

// ---------- character drawing ----------
function drawChar(c, x, y, style, s = 1, moving = false, t = 0, facing = 1, opts = {}) {
  const st = { ...DEFAULT_STYLE, ...style };
  const bob = moving ? Math.sin(t * 14) * 2 : 0;
  const leg = moving ? Math.sin(t * 14) * 4 : 0;
  c.save();
  c.translate(x, y);
  c.scale(s * facing, s);
  c.fillStyle = 'rgba(0,0,0,.25)';
  c.beginPath(); c.ellipse(0, 0, 14, 5, 0, 0, 7); c.fill();
  // legs / skirt
  c.fillStyle = st.skinColor;
  c.fillRect(-7, -14 + bob * .3, 5, 14 + leg); c.fillRect(2, -14 + bob * .3, 5, 14 - leg);
  c.fillStyle = st.secondaryColor;
  if (st.body === 'female') { c.beginPath(); c.moveTo(-12, -9 + bob); c.lineTo(12, -9 + bob); c.lineTo(8, -24 + bob); c.lineTo(-8, -24 + bob); c.fill(); }
  else { c.fillRect(-8, -22 + bob, 16, 12); }
  // torso
  c.fillStyle = st.primaryColor;
  c.beginPath(); c.roundRect(-9, -40 + bob, 18, 20, 5); c.fill();
  // backpack
  if (st.accessory === 'backpack') { c.fillStyle = st.secondaryColor; c.fillRect(-14, -38 + bob, 7, 14); }
  // head
  const hy = -50 + bob;
  c.fillStyle = st.hairColor;
  const hair = st.hair;
  if (hair === 'afro') { c.beginPath(); c.arc(0, hy - 3, 15, 0, 7); c.fill(); }
  if (hair === 'braids') { c.fillRect(-12, hy, 4, 18); c.fillRect(8, hy, 4, 18); }
  if (hair === 'ponytail') { c.fillRect(-14, hy - 2, 5, 14); }
  if (hair === 'dreads') { for (let i = -12; i <= 8; i += 5) c.fillRect(i, hy, 4, 16); }
  if (hair === 'bun') { c.beginPath(); c.arc(0, hy - 14, 6, 0, 7); c.fill(); }
  c.fillStyle = st.skinColor;
  c.beginPath(); c.arc(0, hy, 11, 0, 7); c.fill();
  if (hair !== 'bald' && hair !== 'afro') { c.fillStyle = st.hairColor; c.beginPath(); c.arc(0, hy - 2, 11, Math.PI, 0); c.fill(); }
  if (hair === 'afro') { c.fillStyle = st.hairColor; c.beginPath(); c.arc(0, hy - 4, 11, Math.PI * 1.05, Math.PI * 1.95); c.fill(); }
  // face
  c.fillStyle = '#1b1722';
  c.fillRect(2, hy - 2, 3, 3); c.fillRect(-5, hy - 2, 3, 3);
  c.fillRect(-2, hy + 4, 5, 1.5);
  if (st.accessory === 'glasses') { c.strokeStyle = '#1b1722'; c.lineWidth = 1.5; c.strokeRect(-7, hy - 4, 7, 6); c.strokeRect(1, hy - 4, 7, 6); }
  if (st.accessory === 'earrings') { c.fillStyle = '#f2b84b'; c.fillRect(-12, hy + 3, 3, 3); c.fillRect(9, hy + 3, 3, 3); }
  if (st.accessory === 'beard') { c.fillStyle = st.hairColor; c.fillRect(-7, hy + 4, 14, 7); }
  if (st.accessory === 'scarf') { c.fillStyle = st.secondaryColor; c.fillRect(-10, hy + 10, 20, 5); }
  // hats
  if (opts.headtie) {
    c.fillStyle = '#ffd43b'; c.beginPath(); c.arc(0, hy - 3, 12, Math.PI, 0); c.fill();
    c.beginPath(); c.moveTo(8, hy - 10); c.lineTo(18, hy - 18); c.lineTo(14, hy - 6); c.fill();
  }
  if (st.hat === 'cap') { c.fillStyle = st.secondaryColor; c.beginPath(); c.arc(0, hy - 3, 12, Math.PI, 0); c.fill(); c.fillRect(2, hy - 5, 14, 3); }
  if (st.hat === 'beanie') { c.fillStyle = st.secondaryColor; c.beginPath(); c.arc(0, hy - 3, 12, Math.PI, 0); c.fill(); c.fillRect(-12, hy - 5, 24, 4); }
  if (st.hat === 'tophat') { c.fillStyle = '#1b1722'; c.fillRect(-15, hy - 10, 30, 3); c.fillRect(-9, hy - 28, 18, 19); }
  if (st.hat === 'crown') { c.fillStyle = '#f2b84b'; c.beginPath(); c.moveTo(-10, hy - 9); c.lineTo(-10, hy - 20); c.lineTo(-5, hy - 14); c.lineTo(0, hy - 22); c.lineTo(5, hy - 14); c.lineTo(10, hy - 20); c.lineTo(10, hy - 9); c.fill(); }
  c.restore();
}

// ---------- scenes ----------
const W = 960, H = 540;
const NPC_STYLES = {
  ngozi: { body: 'female', primaryColor: '#2f9e44', secondaryColor: '#e67700', skinColor: '#6b3e1f', hair: 'bun', hairColor: '#111', accessory: 'earrings' },
  tunde: { body: 'male', primaryColor: '#1971c2', secondaryColor: '#5c3d1e', skinColor: '#8d5524', hair: 'bald', hat: 'cap', accessory: 'none' },
  mama: { body: 'female', primaryColor: '#f08c00', secondaryColor: '#c2255c', skinColor: '#7a4522', hair: 'bun', hairColor: '#111', accessory: 'earrings' },
};

const SCENES = [
  {
    name: 'Ojota Market', bg: '#d9a35b', speck: '#c58b43', start: [70, 440],
    obstacles: [
      { x: 180, y: 90, w: 170, h: 80, k: 'stall', c: '#e03131' }, { x: 520, y: 80, w: 170, h: 80, k: 'stall', c: '#2f9e44' },
      { x: 740, y: 300, w: 170, h: 80, k: 'stall', c: '#1c7ed6' }, { x: 170, y: 320, w: 150, h: 70, k: 'stall', c: '#f08c00' },
      { x: 460, y: 440, w: 60, h: 40, k: 'crate' },
    ],
    npcs: [{ id: 'ngozi', name: 'Auntie Ngozi', x: 430, y: 290, style: NPC_STYLES.ngozi }],
    items: [
      { id: 'coin', x: 640, y: 450, type: 'coin', label: 'a shiny coin' },
      { id: 's0a', x: 110, y: 130, type: 'star' }, { id: 's0b', x: 860, y: 110, type: 'star' }, { id: 's0c', x: 560, y: 250, type: 'star' },
    ],
    exit: { x: 930, y: 190, w: 30, h: 150, need: 'lantern', msg: 'The road east is dark. I should get a lantern first.' },
    talk(f) {
      if (!f.coin) return { lines: ['Ah, little one! Lost? Do not cry, the market is big but I see everything.',
        'A woman in a yellow headtie bought pepper here this morning. She went east, towards the river!',
        'But night comes fast on that road. Bring me a coin and I will trade you my lantern. I dropped one near the crates, I think.'] };
      if (!f.lantern) { f.lantern = true; return { lines: ['A coin! You are a clever girl.', 'Here, take my lantern. It will light the dark places.', 'Now go east. Find your mama!'], got: 'Got the lantern!' }; }
      return { lines: ['Go east, little one. The river is waiting.'] };
    },
  },
  {
    name: 'The River', bg: '#8fc46a', speck: '#79b055', start: [50, 270],
    obstacles: [
      { x: 390, y: -10, w: 160, h: 250, k: 'water' }, { x: 390, y: 320, w: 160, h: 240, k: 'water' },
      { x: 390, y: 240, w: 160, h: 80, k: 'ferry', off: 'ferry' },
      { x: 180, y: 380, w: 40, h: 40, k: 'rock' }, { x: 700, y: 250, w: 40, h: 40, k: 'rock' },
    ],
    npcs: [{ id: 'tunde', name: 'Baba Tunde', x: 350, y: 285, style: NPC_STYLES.tunde }],
    items: [
      { id: 'paddle', x: 170, y: 110, type: 'paddle', label: 'a wooden paddle' },
      { id: 's1a', x: 130, y: 470, type: 'star' }, { id: 's1b', x: 710, y: 110, type: 'star' }, { id: 's1c', x: 820, y: 450, type: 'star' },
      { id: 'cloth', x: 600, y: 285, type: 'cloth', label: 'a scrap of yellow cloth', needsFlag: 'ferry' },
    ],
    exit: { x: 930, y: 190, w: 30, h: 150, need: 'ferry', msg: 'I cannot cross the river by myself.' },
    talk(f) {
      if (!f.paddle) return { lines: ['Eh! Little girl, what is a child doing at the river alone?',
        'Yes, a woman in a yellow headtie passed here. She was so sad... She crossed in my boat.',
        'But my paddle floated off into the reeds, and I cannot row without it. Find it, and I will take you across.'] };
      if (!f.ferry) { f.ferry = true; return { lines: ['My paddle! God bless you, child.', 'Climb in. Hold on tight.', '*splash* There! The way across is clear. Go and find your mama.'], got: 'The ferry is ready!' }; }
      return { lines: ['The boat is ready. Go on, go on!'] };
    },
  },
  {
    name: 'The Whispering Forest', bg: '#2b4a2e', speck: '#223d25', start: [50, 270], dark: true,
    obstacles: [
      { x: 160, y: 60, w: 36, h: 40, k: 'tree' }, { x: 300, y: 170, w: 36, h: 40, k: 'tree' }, { x: 220, y: 400, w: 36, h: 40, k: 'tree' },
      { x: 420, y: 330, w: 36, h: 40, k: 'tree' }, { x: 560, y: 60, w: 36, h: 40, k: 'tree' }, { x: 640, y: 250, w: 36, h: 40, k: 'tree' },
      { x: 760, y: 420, w: 36, h: 40, k: 'tree' }, { x: 820, y: 110, w: 36, h: 40, k: 'tree' }, { x: 480, y: 470, w: 36, h: 40, k: 'tree' },
    ],
    npcs: [{ id: 'owl', name: 'Old Owl', x: 500, y: 160, owl: true }],
    items: [
      { id: 'f1', x: 120, y: 160, type: 'firefly' }, { id: 'f2', x: 360, y: 90, type: 'firefly' }, { id: 'f3', x: 330, y: 460, type: 'firefly' },
      { id: 'f4', x: 700, y: 360, type: 'firefly' }, { id: 'f5', x: 880, y: 240, type: 'firefly' }, { id: 'f6', x: 590, y: 400, type: 'firefly' },
    ],
    exit: { x: 930, y: 190, w: 30, h: 150, need: 'fireflies', msg: 'The path east is too dark. Hoo... the owl said something about fireflies.' },
    talk(f) {
      if (!f.owlTalked) { f.owlTalked = true; return { lines: ['Hoo hoo! A little one with a lantern. Brave.', 'The yellow headtie? Yes. She walked this path, crying for her daughter.',
        'The forest hides the way home. Gather three fireflies and they will light it for you. Hoo!'] }; }
      return { lines: [f.fireflies ? 'The path glows! Hurry, little one. Home is near.' : 'Three fireflies, little one. Hoo hoo.'] };
    },
  },
  {
    name: 'Home', bg: '#9bd16e', speck: '#86bc5a', start: [50, 270],
    obstacles: [
      { x: 700, y: 120, w: 220, h: 220, k: 'house' },
      { x: 300, y: 300, w: 40, h: 40, k: 'rock' }, { x: 160, y: 120, w: 36, h: 40, k: 'tree' }, { x: 520, y: 450, w: 36, h: 40, k: 'tree' },
    ],
    npcs: [{ id: 'mama', name: 'Mama', x: 820, y: 400, style: NPC_STYLES.mama, headtie: true, ending: true }],
    items: [{ id: 's3a', x: 300, y: 90, type: 'star' }, { id: 's3b', x: 420, y: 470, type: 'star' }],
    talk() { return { lines: [] }; },
  },
];

// ---------- state ----------
const canvas = $('game'), ctx = canvas.getContext('2d');
let S = null; // run state
let scene = null, keys = {}, target = null, dialog = null, last = 0, t = 0, inGame = false;

const SPECKS = SCENES.map((sc, i) => Array.from({ length: 90 }, (_, j) => [(j * 137.5 + i * 53) % W, (j * 71.3 + i * 29) % H, 2 + (j % 3)]));

function newRun() {
  S = { si: 0, x: 0, y: 0, flags: {}, got: new Set(), keepsakes: 0, fireflies: 0, start: performance.now(), facing: 1, moving: false, done: false };
  enterScene(0);
}
function enterScene(i) {
  S.si = i; scene = SCENES[i]; [S.x, S.y] = scene.start; target = null;
  $('hud-scene').textContent = scene.name;
  scene.npcs.forEach((n) => { n.cool = false; });
}
function solid() { return scene.obstacles.filter((o) => !(o.off && S.flags[o.off])); }
function hit(x, y) {
  const r = 9;
  if (x < r || x > W - r || y < 40 || y > H - 6) return true;
  for (const o of solid()) if (x + r > o.x && x - r < o.x + o.w && y + 2 > o.y && y - 10 < o.y + o.h) return true;
  for (const n of scene.npcs) if (!n.ending && Math.hypot(x - n.x, y - n.y) < 20) return true;
  return false;
}

// ---------- dialog ----------
function say(name, lines, done) {
  if (!lines.length) { done?.(); return; }
  dialog = { name, lines: [...lines], done };
  $('dialog').hidden = false;
  showLine();
}
function showLine() {
  $('dialog-name').textContent = dialog.name;
  $('dialog-text').textContent = dialog.lines[0];
}
function advance() {
  if (!dialog) return;
  dialog.lines.shift();
  if (dialog.lines.length) { showLine(); return; }
  const d = dialog; dialog = null; $('dialog').hidden = true; d.done?.();
}
$('dialog').addEventListener('pointerdown', (e) => { e.stopPropagation(); advance(); });

function toast(text) { toast.t = text; toast.until = performance.now() + 2200; }

// ---------- interactions ----------
function talkTo(n) {
  n.cool = true; target = null;
  if (n.ending) { say('Mama', ['*gasp* ' + player.name + '?! My baby!', 'I looked everywhere for you! I was so scared...', 'Come here. I am never letting go of your hand again.'], finish); return; }
  const r = scene.talk(S.flags);
  if (S.flags.paddle && scene.name === 'The River') { /* flag kept */ }
  say(n.owl ? 'Old Owl' : n.name, r.lines, () => { if (r.got) toast(r.got); });
}
function pickup(it) {
  if (S.got.has(it.id)) return;
  if (it.needsFlag && !S.flags[it.needsFlag]) return;
  S.got.add(it.id);
  if (it.type === 'star') { S.keepsakes++; toast('Keepsake found! ★'); }
  else if (it.type === 'firefly') { S.keepsakes++; S.fireflies++; toast(`Firefly caught (${S.fireflies}/3)`); if (S.fireflies >= 3) S.flags.fireflies = true; }
  else if (it.type === 'cloth') { S.keepsakes++; toast('Mama\'s headtie cloth! She is close.'); }
  else { S.flags[it.id] = true; toast(`You found ${it.label}`); }
  $('hud-stars').textContent = `★ ${S.keepsakes}`;
}

// ---------- update ----------
function update(dt) {
  t += dt;
  if (!inGame || S.done) return;
  const secs = Math.floor((performance.now() - S.start) / 1000);
  $('hud-time').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  if (dialog) { S.moving = false; return; }
  let dx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  let dy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
  if (dx || dy) target = null;
  else if (target) {
    const vx = target.x - S.x, vy = target.y - S.y, d = Math.hypot(vx, vy);
    if (d < 5) target = null; else { dx = vx / d; dy = vy / d; }
  }
  S.moving = !!(dx || dy);
  if (S.moving) {
    const m = Math.hypot(dx, dy) || 1, sp = 190 * dt;
    const nx = S.x + dx / m * sp, ny = S.y + dy / m * sp;
    let moved = false;
    if (!hit(nx, S.y)) { S.x = nx; moved = true; }
    if (!hit(S.x, ny)) { S.y = ny; moved = true; }
    if (!moved) target = null;
    if (dx) S.facing = dx > 0 ? 1 : -1;
  }
  for (const it of scene.items) if (!S.got.has(it.id) && Math.hypot(S.x - it.x, S.y - it.y) < 26) pickup(it);
  for (const n of scene.npcs) {
    const d = Math.hypot(S.x - n.x, S.y - n.y);
    if (d > 80) n.cool = false;
    else if (d < 42 && !n.cool) { talkTo(n); return; }
  }
  const ex = scene.exit;
  if (ex && S.x > ex.x - 6 && S.y > ex.y && S.y < ex.y + ex.h) {
    if (S.flags[ex.need]) enterScene(S.si + 1);
    else if (!ex.warned || performance.now() > ex.warned) { ex.warned = performance.now() + 4000; say('', [ex.msg]); S.x = ex.x - 14; target = null; }
  }
}

// ---------- drawing ----------
function drawObstacle(o) {
  const c = ctx;
  if (o.k === 'stall') {
    c.fillStyle = '#6f4e2a'; c.fillRect(o.x, o.y + 28, o.w, o.h - 28);
    for (let i = 0; i < o.w; i += 20) { c.fillStyle = (i / 20) % 2 ? '#fff7e6' : o.c; c.fillRect(o.x + i, o.y, 20, 32); }
    c.fillStyle = '#e8590c'; c.beginPath(); c.arc(o.x + 30, o.y + 44, 8, 0, 7); c.fill();
    c.fillStyle = '#f2b84b'; c.beginPath(); c.arc(o.x + 60, o.y + 44, 8, 0, 7); c.fill();
    c.fillStyle = '#74b816'; c.beginPath(); c.arc(o.x + 90, o.y + 44, 8, 0, 7); c.fill();
  } else if (o.k === 'crate') { c.fillStyle = '#8a5a2b'; c.fillRect(o.x, o.y, o.w, o.h); c.strokeStyle = '#5c3a18'; c.lineWidth = 3; c.strokeRect(o.x, o.y, o.w, o.h); c.beginPath(); c.moveTo(o.x, o.y); c.lineTo(o.x + o.w, o.y + o.h); c.stroke(); }
  else if (o.k === 'water') {
    c.fillStyle = '#339af0'; c.fillRect(o.x, o.y, o.w, o.h);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2;
    for (let y = o.y + 20; y < o.y + o.h; y += 36) { c.beginPath(); for (let x = 0; x < o.w; x += 20) c.lineTo(o.x + x, y + Math.sin(t * 2 + x + y) * 3); c.stroke(); }
  } else if (o.k === 'ferry') {
    c.fillStyle = '#339af0'; c.fillRect(o.x, o.y, o.w, o.h);
    c.fillStyle = '#8a5a2b'; c.beginPath(); c.ellipse(o.x + o.w / 2, o.y + o.h / 2, 60, 22, 0, 0, 7); c.fill();
  } else if (o.k === 'rock') { c.fillStyle = '#868e96'; c.beginPath(); c.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2 + 4, o.h / 2, 0, 0, 7); c.fill(); }
  else if (o.k === 'tree') {
    c.fillStyle = '#5c3a18'; c.fillRect(o.x + 10, o.y + 10, 16, 30);
    c.fillStyle = scene.dark ? '#1f6f3a' : '#2f9e44'; c.beginPath(); c.arc(o.x + 18, o.y, 30, 0, 7); c.fill();
  } else if (o.k === 'house') {
    c.fillStyle = '#f1d9a8'; c.fillRect(o.x, o.y + 60, o.w, o.h - 60);
    c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(o.x - 16, o.y + 64); c.lineTo(o.x + o.w / 2, o.y); c.lineTo(o.x + o.w + 16, o.y + 64); c.fill();
    c.fillStyle = '#5c3a18'; c.fillRect(o.x + 90, o.y + o.h - 70, 40, 70);
    c.fillStyle = '#74c0fc'; c.fillRect(o.x + 25, o.y + 100, 36, 36); c.fillRect(o.x + 160, o.y + 100, 36, 36);
  }
}
function drawItem(it) {
  const c = ctx, bob = Math.sin(t * 4 + it.x) * 3;
  c.save(); c.translate(it.x, it.y + bob);
  if (it.type === 'star') { c.fillStyle = '#ffd43b'; star(c, 0, 0, 5, 11, 5); c.fill(); }
  else if (it.type === 'coin') { c.fillStyle = '#ffd43b'; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill(); c.fillStyle = '#e67700'; c.fillRect(-2, -5, 4, 10); }
  else if (it.type === 'paddle') { c.rotate(-.6); c.fillStyle = '#8a5a2b'; c.fillRect(-3, -20, 6, 40); c.fillRect(-9, -22, 18, 14); }
  else if (it.type === 'cloth') { c.fillStyle = '#ffd43b'; c.beginPath(); c.moveTo(-10, -6); c.lineTo(10, -10); c.lineTo(8, 8); c.lineTo(-8, 10); c.fill(); }
  else if (it.type === 'firefly') { const g = c.createRadialGradient(0, 0, 0, 0, 0, 26); g.addColorStop(0, 'rgba(255,240,120,1)'); g.addColorStop(1, 'rgba(255,240,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 26, 0, 7); c.fill(); }
  c.restore();
}
function star(c, cx, cy, n, ro, ri) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = i * Math.PI / n - Math.PI / 2; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.closePath(); }

function owl(x, y) {
  const c = ctx; c.save(); c.translate(x, y);
  c.fillStyle = '#8a6a3b'; c.beginPath(); c.ellipse(0, -18, 18, 24, 0, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-7, -26, 7, 0, 7); c.arc(7, -26, 7, 0, 7); c.fill();
  c.fillStyle = '#111'; c.beginPath(); c.arc(-7, -26, 3, 0, 7); c.arc(7, -26, 3, 0, 7); c.fill();
  c.fillStyle = '#f2b84b'; c.beginPath(); c.moveTo(-3, -20); c.lineTo(3, -20); c.lineTo(0, -13); c.fill();
  c.restore();
}

function render() {
  const c = ctx;
  c.clearRect(0, 0, W, H);
  if (!scene) { c.fillStyle = '#d9a35b'; c.fillRect(0, 0, W, H); return; }
  c.fillStyle = scene.bg; c.fillRect(0, 0, W, H);
  c.fillStyle = scene.speck;
  for (const [x, y, r] of SPECKS[S.si]) c.fillRect(x, y, r, r);
  if (scene.exit) { c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(scene.exit.x, scene.exit.y, scene.exit.w, scene.exit.h); c.fillStyle = '#fff'; c.font = '20px sans-serif'; c.fillText('➜', scene.exit.x + 5, scene.exit.y + scene.exit.h / 2 + 7); }
  const ents = [];
  for (const o of solid()) ents.push({ y: o.k === 'water' || o.k === 'ferry' ? -1 : o.y + o.h, draw: () => drawObstacle(o) });
  for (const it of scene.items) if (!S.got.has(it.id) && !(it.needsFlag && !S.flags[it.needsFlag])) ents.push({ y: it.y, draw: () => drawItem(it) });
  for (const n of scene.npcs) ents.push({ y: n.y, draw: () => n.owl ? owl(n.x, n.y) : drawChar(c, n.x, n.y, n.style, 1, false, t, -1, { headtie: n.headtie }) });
  ents.push({ y: S.y, draw: () => drawChar(c, S.x, S.y, player.style, 0.9, S.moving, t, S.facing) });
  ents.sort((a, b) => a.y - b.y).forEach((e) => e.draw());
  if (target && !dialog) { c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(target.x, target.y, 8 + Math.sin(t * 8) * 2, 0, 7); c.stroke(); }
  if (scene.dark) {
    const r = S.flags.lantern ? 190 : 70;
    if (!render.dk) { render.dk = document.createElement('canvas'); render.dk.width = W; render.dk.height = H; }
    const d = render.dk.getContext('2d');
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H); d.fillStyle = 'rgba(5,8,25,.93)'; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const flick = r + Math.sin(t * 9) * 4;
    const g = d.createRadialGradient(S.x, S.y - 30, 10, S.x, S.y - 30, flick); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g; d.fillRect(0, 0, W, H);
    for (const it of scene.items) if (it.type === 'firefly' && !S.got.has(it.id)) { const g2 = d.createRadialGradient(it.x, it.y, 0, it.x, it.y, 55); g2.addColorStop(0, 'rgba(0,0,0,.9)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g2; d.fillRect(it.x - 55, it.y - 55, 110, 110); }
    c.drawImage(render.dk, 0, 0);
    for (const it of scene.items) if (it.type === 'firefly' && !S.got.has(it.id)) drawItem(it);
  }
  if (toast.until > performance.now()) {
    c.font = '700 20px sans-serif'; c.textAlign = 'center';
    const w = c.measureText(toast.t).width + 36;
    c.fillStyle = 'rgba(27,23,34,.85)'; c.beginPath(); c.roundRect(W / 2 - w / 2, 480, w, 40, 20); c.fill();
    c.fillStyle = '#ffd43b'; c.fillText(toast.t, W / 2, 506); c.textAlign = 'left';
  }
}

function frameLoop(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  update(dt); render(); requestAnimationFrame(frameLoop);
}

// ---------- flow ----------
async function finish() {
  S.done = true; inGame = false; $('hud').hidden = true;
  const time = Math.max(1, Math.round((performance.now() - S.start) / 1000));
  const fmt = `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
  $('ending-text').textContent = `${player.name} found Mama after ${fmt}, carrying ${S.keepsakes} keepsake${S.keepsakes === 1 ? '' : 's'}. Together, they walked home.`;
  $('ending').hidden = false;
  $('ending-save').textContent = user ? 'Saving your journey...' : 'Sign in with start.ng to save your score.';
  if (user) {
    const saved = await askStartNg({ type: 'startng:score', stats: { keepsakes: S.keepsakes, time } }, 'startng:scoreSaved');
    $('ending-save').textContent = saved?.ok
      ? (saved.result.improved ? `New personal best! You are #${saved.result.rank}.` : `Saved. Your best run ranks #${saved.result.rank}.`)
      : 'Could not save your score.';
  }
  loadBoard('board-end');
}
$('start-btn').onclick = () => { $('title').hidden = true; $('hud').hidden = false; newRun(); inGame = true; $('hud-stars').textContent = '★ 0';
  say('', ['You lost sight of Mama in the crowded Ojota Market. Everyone is tall, and everything is loud.', 'She wears a bright yellow headtie. Find her!']); };
$('again-btn').onclick = () => { $('ending').hidden = true; $('hud').hidden = false; newRun(); inGame = true; $('hud-stars').textContent = '★ 0'; };

// ---------- input ----------
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  if (dialog && (e.key === ' ' || e.key === 'Enter')) { advance(); return; }
  keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true;
});
addEventListener('keyup', (e) => { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
canvas.addEventListener('pointerdown', (e) => {
  if (dialog) { advance(); return; }
  if (!inGame) return;
  const r = canvas.getBoundingClientRect();
  target = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
});

refreshPlayer().then(() => loadBoard('board-title'));
requestAnimationFrame(frameLoop);
