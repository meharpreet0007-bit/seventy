const app = document.getElementById('app'), tabs = document.getElementById('tabs'), layer = document.getElementById('layer'), toastEl = document.getElementById('toast');

function toast(msg, action, fn) {
  toastEl.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button>${esc(action)}</button>` : '');
  toastEl.classList.add('open');
  clearTimeout(toast.t);
  if (action) toastEl.querySelector('button').onclick = () => { toastEl.classList.remove('open'); fn(); };
  else toast.t = setTimeout(() => toastEl.classList.remove('open'), 3200);
}

/* Saving */
const COLS = ['gym', 'diet', 'steps', 'cardio', 'cheat_meals', 'measured', 'snap_path', 'snap_verified', 'snap_at'];
const pendingDays = new Set(), pendingMeas = new Set();
let saveTimer = null;
function queue() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 500); }
async function flush() {
  clearTimeout(saveTimer);
  let ok = true;
  const dates = [...pendingDays], ms = [...pendingMeas];
  pendingDays.clear(); pendingMeas.clear();
  try {
    for (const date of dates) {
      const d = day(S.uid, date), row = { user_id: S.uid, date };
      COLS.forEach(c => { row[c] = d[c] === undefined ? null : d[c]; });
      if (row.snap_verified == null) row.snap_verified = false;
      if (row.measured == null) row.measured = false;
      await api.saveDay(row);
    }
    for (const date of ms) {
      const m = measOf(S.uid, date);
      await api.saveMeas({ user_id: S.uid, date, waist: m.waist == null ? null : m.waist, second: m.second == null ? null : m.second, weight: m.weight == null ? null : m.weight });
    }
  } catch (e) {
    dates.forEach(x => pendingDays.add(x)); ms.forEach(x => pendingMeas.add(x));
    ok = false; flush.failed = true;
    toast(`Couldn't save your last change. ${e.message || ''}`, 'Try again', flush);
    saveTimer = setTimeout(flush, 8000);
  }
  if (ok && flush.failed) { flush.failed = false; toastEl.classList.remove('open'); }
  return ok;
}
function setDay(fields, date) {
  date = date || S.date;
  S.days[S.uid] = S.days[S.uid] || {};
  S.days[S.uid][date] = Object.assign({}, S.days[S.uid][date], fields);
  pendingDays.add(date); queue();
}

/* Shell */
const ICONS = {
  today: `<path d='M9 12l2 2 4-4'/><circle cx='12' cy='12' r='9'/>`,
  dashboard: `<path d='M4 20V10M10 20V4M16 20v-7M21 20H3'/>`,
  duel: `<path d='M5 3l8 8M3 5l2-2M13 11l-2 2M19 3l-8 8M21 5l-2-2M6 16l2 2M18 16l-2 2M4 21l4-3M20 21l-4-3'/>`,
  leagues: `<path d='M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4c0 3 1 5 3 5M17 6h3c0 3-1 5-3 5'/>`
};
const LABELS = { today: 'Today', dashboard: 'Dashboard', duel: 'Duel', leagues: 'Leagues' };
function renderNav() {
  tabs.hidden = false;
  tabs.innerHTML = `<div class='brand'>Seventy</div>` + Object.keys(ICONS).map(k =>
    `<button class='tab' data-act='go' data-arg='${k}' ${S.view === k && !S.player ? `aria-current='page'` : ''}><svg viewBox='0 0 24 24'>${ICONS[k]}</svg>${LABELS[k]}</button>`).join('') +
    `<button class='me' data-act='go' data-arg='dashboard'>${avatar(S.me, 'you')}<div>${esc(S.me.name)}</div></button>`;
}
function render() {
  const y = window.scrollY;
  app.innerHTML = S.player ? viewPlayer(S.player) : S.view === 'today' ? viewToday() : S.view === 'dashboard' ? viewDashboard() : S.view === 'duel' ? viewDuel() : viewLeagues();
  renderNav();
  window.scrollTo(0, y);
  app.querySelectorAll('img[data-snap]').forEach(async img => { try { img.src = await urlFor(img.dataset.snap); } catch (e) { } });
}
function toTop() { window.scrollTo(0, 0); }
async function urlFor(path) { if (!S.snapUrls[path]) S.snapUrls[path] = await api.snapUrl(path); return S.snapUrls[path]; }

/* Auth */
function viewAuth(mode, error) {
  tabs.hidden = true;
  const signup = mode === 'signup';
  app.innerHTML = `<div class='auth'><div><div class='big'>70</div><h1>Seventy points a week.</h1><p class='muted'>Log your training, diet and steps. Beat your partner and your league.</p></div>
  <form class='form' id='authform'><input class='input' type='email' id='email' required autocomplete='email' placeholder='Email' aria-label='Email'>
  <input class='input' type='password' id='password' required minlength='6' autocomplete='${signup ? 'new-password' : 'current-password'}' placeholder='Password' aria-label='Password'>
  ${error ? `<p class='err'>${esc(error)}</p>` : ''}<button class='btn full' type='submit'>${signup ? 'Create account' : 'Sign in'}</button></form>
  <button class='link center' id='authswitch'>${signup ? 'I already have an account' : 'Create an account'}</button></div>`;
  document.getElementById('authswitch').onclick = () => viewAuth(signup ? 'signin' : 'signup');
  document.getElementById('authform').onsubmit = async e => {
    e.preventDefault();
    const em = document.getElementById('email').value.trim(), pw = document.getElementById('password').value, btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      const uid = signup ? await api.signUp(em, pw) : await api.signIn(em, pw);
      if (!uid) return viewAuth('signin', 'Check your email to confirm your account, then sign in.');
      S.uid = uid; await boot();
    } catch (err) { viewAuth(mode, err.message || 'Sign-in failed. Check your details and try again.'); }
  };
}
function viewOnboard(error) {
  tabs.hidden = true;
  const me = S.me || {}, d = S.details || {}, editing = !!(S.me && S.details);
  const gender = d.gender || (me.second_measure === 'glutes' ? 'female' : me.second_measure === 'biceps' ? 'male' : '');
  const pick = (group, val, label, cur) => `<button type='button' data-group='${group}' data-pick='${val}' aria-pressed='${cur === val}'>${label}</button>`;
  app.innerHTML = `<div class='auth'><div><h1>${editing ? 'Edit your details' : 'Your details'}</h1><p class='muted'>Only you can see your age, height, weight and goal.</p></div>
  <form class='form' id='onb'>
  <label class='field'>Name<input class='input' type='text' id='name' required maxlength='20' autocomplete='given-name' value='${esc(me.name || '')}'></label>
  <div class='field'>Gender<div class='seg' role='group'>${pick('gender', 'male', 'Male', gender)}${pick('gender', 'female', 'Female', gender)}</div></div>
  <div class='fields'>
    <label class='field'>Age<input type='number' id='age' inputmode='numeric' required min='13' max='100' step='1' value='${d.age == null ? '' : esc(d.age)}'></label>
    <label class='field'>Height, cm<input type='number' id='height' inputmode='decimal' required min='100' max='250' step='any' value='${d.height_cm == null ? '' : esc(d.height_cm)}'></label>
    <label class='field'>Weight, kg<input type='number' id='weight' inputmode='decimal' required min='25' max='300' step='any' value='${d.start_weight == null ? '' : esc(d.start_weight)}'></label>
  </div>
  <div class='field'>Goal<div class='seg' role='group'>${pick('goal', 'fat_loss', 'Lose fat', d.goal)}${pick('goal', 'muscle', 'Build muscle', d.goal)}${pick('goal', 'maintain', 'Stay fit', d.goal)}</div></div>
  <p class='err' id='onberr'>${error ? esc(error) : ''}</p>
  <button class='btn full' type='submit'>${editing ? 'Save details' : 'Continue'}</button>
  ${editing ? `<button class='link center' type='button' id='onbcancel'>Cancel</button>` : ''}</form></div>`;
  app.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
    app.querySelectorAll(`[data-group='${b.dataset.group}']`).forEach(x => x.setAttribute('aria-pressed', x === b));
  });
  const cancel = document.getElementById('onbcancel');
  if (cancel) cancel.onclick = () => render();
  const chosen = g => { const b = app.querySelector(`[data-group='${g}'][aria-pressed='true']`); return b ? b.dataset.pick : null; };
  document.getElementById('onb').onsubmit = async e => {
    e.preventDefault();
    const err = document.getElementById('onberr'), g = chosen('gender'), goal = chosen('goal'), btn = e.target.querySelector('[type=submit]');
    if (!g) { err.textContent = 'Choose your gender.'; return; }
    if (!goal) { err.textContent = 'Choose your goal.'; return; }
    btn.disabled = true;
    try {
      await api.saveProfile({ id: S.uid, name: document.getElementById('name').value.trim(), second_measure: g === 'female' ? 'glutes' : 'biceps' });
      await api.saveDetails({ user_id: S.uid, age: Number(document.getElementById('age').value), height_cm: Number(document.getElementById('height').value), start_weight: Number(document.getElementById('weight').value), gender: g, goal });
      await boot();
    } catch (ex) { btn.disabled = false; err.textContent = `Couldn't save your details. Check your connection and try again.`; }
  };
}

/* Invite links */
function takeInvite() {
  try {
    const u = new URL(location.href), c = u.searchParams.get('join');
    if (c) { sessionStorage.setItem('seventy-join', c); u.searchParams.delete('join'); history.replaceState(null, '', u.pathname); }
    return sessionStorage.getItem('seventy-join');
  } catch (e) { return null; }
}
function clearInvite() { try { sessionStorage.removeItem('seventy-join'); } catch (e) { } }
async function join(code) {
  const kind = await api.rpc('join_by_code', { p_code: code.trim().toUpperCase() });
  await load();
  S.player = null; S.league = null; S.view = kind === 'duel' ? 'duel' : 'leagues';
  toast(kind === 'duel' ? 'Duel started' : 'You joined the league');
}
async function boot() {
  S.uid = S.uid || await api.session();
  if (!S.uid) return viewAuth(takeInvite() ? 'signup' : 'signin');
  await load();
  if (!S.me || !S.details) return viewOnboard();
  S.date = S.date || today();
  const code = takeInvite();
  if (code) { clearInvite(); try { await join(code); } catch (e) { toast(e.message || `That invite didn't work.`); } }
  render();
}

/* Camera */
const cam = { stream: null, facing: 'user', blob: null, verified: false };
function stopStream() { if (cam.stream) { cam.stream.getTracks().forEach(t => t.stop()); cam.stream = null; } }
function closeLayer() { stopStream(); layer.classList.remove('open'); layer.innerHTML = ''; }
async function openCamera() {
  layer.classList.add('open');
  layer.innerHTML = `<div class='stage'></div>`;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return cameraBlocked();
  try { stopStream(); cam.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cam.facing, width: { ideal: 1280 }, height: { ideal: 1706 } }, audio: false }); }
  catch (e) { return cameraBlocked(); }
  layer.innerHTML = `<div class='stage'><div class='frame'><video id='v' autoplay playsinline muted class='${cam.facing === 'user' ? 'flipv' : ''}'></video></div></div><div class='controls'><button id='cancel'>Cancel</button><button class='shutter' id='shoot' aria-label='Take snap'></button><button class='right' id='flip'>Flip</button></div>`;
  const v = document.getElementById('v');
  v.srcObject = cam.stream;
  document.getElementById('cancel').onclick = closeLayer;
  document.getElementById('flip').onclick = () => { cam.facing = cam.facing === 'user' ? 'environment' : 'user'; openCamera(); };
  document.getElementById('shoot').onclick = () => compress(v, v.videoWidth, v.videoHeight, true, cam.facing === 'user');
}
function cameraBlocked() {
  layer.innerHTML = `<div class='stage'><div class='message'><p>The camera is blocked here. Allow camera access in your browser settings for a verified snap, or use your phone camera.</p><label class='filelabel' for='filecap'>Use phone camera</label><input class='vh' id='filecap' type='file' accept='image/*' capture='user'><button id='cancel'>Cancel</button></div></div>`;
  document.getElementById('cancel').onclick = closeLayer;
  document.getElementById('filecap').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => { compress(img, img.naturalWidth, img.naturalHeight, false); URL.revokeObjectURL(img.src); };
    img.onerror = () => toast(`That photo couldn't be read. Try again.`);
    img.src = URL.createObjectURL(f);
  };
}
function compress(src, w, h, verified, mirror) {
  if (!w || !h) { toast('The camera is still starting. Try again in a second.'); return; }
  const R = 3 / 4, wide = w / h > R, sw = wide ? h * R : w, sh = wide ? h : w / R, sx = (w - sw) / 2, sy = (h - sh) / 2;
  const k = Math.min(1, 1080 / sh), c = document.createElement('canvas');
  c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  const x = c.getContext('2d');
  if (mirror) { x.translate(c.width, 0); x.scale(-1, 1); }
  x.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  x.setTransform(1, 0, 0, 1, 0, 0);
  const size = Math.round(c.width * .036), now = new Date();
  x.font = '500 ' + size + 'px sans-serif';
  x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = size / 2; x.fillStyle = '#fff';
  x.fillText(short(iso(now)) + ', ' + clock(now), size, c.height - size);
  c.toBlob(b => {
    stopStream(); cam.blob = b; cam.verified = verified;
    const url = URL.createObjectURL(b);
    layer.innerHTML = `<div class='stage'><div class='frame'><img src='${url}' alt='Your snap'></div></div><div class='controls'><button id='retake'>Retake</button><span></span><button class='right' id='use'>Send snap</button></div>`;
    document.getElementById('retake').onclick = () => { URL.revokeObjectURL(url); openCamera(); };
    document.getElementById('use').onclick = () => sendSnap(url);
  }, 'image/jpeg', .74);
}
async function sendSnap(url) {
  const btn = document.getElementById('use'), date = today();
  btn.disabled = true; btn.textContent = 'Sending';
  try {
    const path = await api.uploadSnap(S.uid, date, cam.blob);
    delete S.snapUrls[path];
    setDay({ gym: true, snap_path: path, snap_verified: cam.verified, snap_at: new Date().toISOString() }, date);
    const saved = await flush();
    URL.revokeObjectURL(url); closeLayer(); render();
    if (saved) toast('Snap sent');
  } catch (e) { btn.disabled = false; btn.textContent = 'Send snap'; toast(`Your snap didn't send. ${e.message || 'Check your connection and try again.'}`); }
}
async function openSnap(uid, date) {
  const d = day(uid, date); if (!d || !d.snap_path) return;
  layer.classList.add('open');
  layer.innerHTML = `<div class='caption'><span>${nameOf(uid)}, ${short(date)}, ${clock(d.snap_at)}</span><span>${d.snap_verified ? 'Verified' : 'Not verified'}</span></div><div class='stage'><img id='full' class='fit' alt='Gym snap'></div><div class='controls'><button id='cancel'>Close</button></div>`;
  document.getElementById('cancel').onclick = closeLayer;
  try { document.getElementById('full').src = await urlFor(d.snap_path); } catch (e) { toast(`That snap couldn't load.`); closeLayer(); }
}

/* Actions */
async function runRpc(fn, args, ok) {
  try { const r = await api.rpc(fn, args); await load(); if (ok) ok(r); render(); return r; }
  catch (e) { toast(e.message || 'That did not work. Try again.'); }
}
const ACTIONS = {
  go(a) { S.view = a; S.player = null; S.league = a === 'leagues' ? S.league : null; S.week = null; S.confirm = null; if (a === 'today') S.date = today(); render(); toTop(); },
  toggle(a) { const d = day(S.uid, S.date) || {}; setDay({ [a]: !d[a] }); render(); },
  set(a, t) { const d = day(S.uid, S.date) || {}; setDay({ [a]: d[a] === t.dataset.val ? null : t.dataset.val }); render(); },
  nav(a) { S.date = addDays(S.date, +a); render(); },
  day(a) { S.dayFocus = a; render(); },
  week(a) { S.week = a; render(); },
  snapDay(a) { S.snapDay = a; render(); },
  lbMode(a) { S.lbMode = a; render(); },
  async resetProgress() {
    if (S.confirm !== 'reset') { S.confirm = 'reset'; render(); return; }
    S.confirm = null;
    try {
      clearTimeout(saveTimer); pendingDays.clear(); pendingMeas.clear();
      const ls = await sb.storage.from('snaps').list(S.uid, { limit: 1000 });
      if (ls.error) throw ls.error;
      const paths = (ls.data || []).map(f => S.uid + '/' + f.name);
      if (paths.length) { const r = await sb.storage.from('snaps').remove(paths); if (r.error) throw r.error; }
      await api.rpc('reset_progress', {});
      S.snapUrls = {}; await load(); S.date = today(); render(); toast('Your progress was reset');
    } catch (e) { render(); toast(`Couldn't reset your progress. ${e.message || ''}`); }
  },
  snap(a) { const [u, x] = a.split('|'); openSnap(u, x); },
  camera() { openCamera(); },
  editDetails() { viewOnboard(); toTop(); },
  player(a) { S.prev = { view: S.view, league: S.league }; S.player = a; S.week = null; render(); toTop(); },
  backPlayer() { S.player = null; S.week = null; render(); toTop(); },
  league(a) { S.league = a; S.confirm = null; render(); toTop(); },
  backLeagues() { S.league = null; S.confirm = null; render(); toTop(); },
  async copy(a) {
    const link = location.origin + location.pathname + '?join=' + a;
    try { await navigator.clipboard.writeText(link); toast('Invite link copied'); } catch (e) { toast(link); }
  },
  createDuel() { runRpc('create_duel', {}); },
  endDuel() {
    if (S.confirm !== 'endDuel') { S.confirm = 'endDuel'; render(); return; }
    S.confirm = null; runRpc('end_duel', {});
  },
  leaveLeague(a) {
    if (S.confirm !== 'leave' + a) { S.confirm = 'leave' + a; render(); return; }
    S.confirm = null; S.league = null; runRpc('leave_league', { p_league: a });
  },
  async signout() { await flush(); await api.signOut(); S.uid = null; S.me = null; S.date = null; S.view = 'today'; S.player = null; S.league = null; viewAuth('signin'); }
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const fn = ACTIONS[t.dataset.act]; if (fn) fn(t.dataset.arg, t);
});
const FORMS = {
  async rename(f) { const name = f.name.value.trim(); if (!name) return; try { await api.rename(S.uid, name); S.me.name = name; render(); toast('Name saved'); } catch (e) { toast(`Couldn't save your name.`); } },
  async join(f) { try { await join(f.code.value); render(); } catch (e) { toast(e.message || `That code didn't work.`); } },
  createLeague(f) { const n = f.name.value.trim(); runRpc('create_league', { p_name: n }, id => { S.league = id; }); }
};
document.addEventListener('submit', e => {
  const k = e.target.dataset && e.target.dataset.form; if (!k) return;
  e.preventDefault(); FORMS[k](e.target);
});
document.addEventListener('input', e => {
  const f = e.target.dataset && e.target.dataset.measure; if (!f) return;
  const v = e.target.value === '' ? null : Number(e.target.value);
  S.meas[S.uid] = S.meas[S.uid] || {};
  const m = S.meas[S.uid][S.date] = Object.assign({}, S.meas[S.uid][S.date], { [f]: v > 0 ? v : null });
  pendingMeas.add(S.date);
  const done = [m.waist, m.second, m.weight].every(x => Number(x) > 0);
  setDay({ measured: done });
  document.getElementById('hero').innerHTML = heroHTML(S.date, day(S.uid, S.date));
  document.getElementById('measpts').textContent = done ? '2 of 2' : '2 pts';
});
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden') { flush(); return; }
  const a = document.activeElement;
  if (!S.me || layer.classList.contains('open') || (a && a.tagName === 'INPUT')) return;
  if (pendingDays.size || pendingMeas.size) await flush();
  try { await load(); if (S.date > today() || S.date < mondayOf(today())) S.date = today(); render(); } catch (e) { }
});

boot().catch(() => { app.innerHTML = `<p class='err'>Seventy couldn't connect. Check your connection and reload.</p>`; });
