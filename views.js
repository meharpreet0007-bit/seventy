const QUOTE = String.fromCharCode(34);
const esc = s => String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split(QUOTE).join('&quot;').split(`'`).join('&#39;');
const CHECK = `<svg viewBox='0 0 12 12' fill='none' stroke='var(--on-accent)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M2.5 6.5l2.4 2.4 4.6-5.2'/></svg>`;
const SHIELD = `<svg viewBox='0 0 16 16'><path d='M8 1l6 2v5c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V3z'/></svg>`;
const initials = n => String(n || '?').trim().split(/ +/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const avatar = (p, cls) => `<span class='avatar ${cls || ''}'>${esc(initials(p && p.name))}</span>`;
const badge = r => r.tier ? `<span class='badge ${r.tier.toLowerCase()}'>${SHIELD}${r.tier}</span>` : `<span class='badge'>Unranked</span>`;
const stat = (v, label, of) => `<div class='stat'><b>${v}${of ? `<small> ${of}</small>` : ''}</b><span>${label}</span></div>`;
const nameOf = uid => uid === S.uid ? 'You' : esc((S.profiles[uid] || {}).name || 'Player');

/* Today */
function heroHTML(date, d) {
  const ps = parts(date, d), t = score(date, d), C = 2 * Math.PI * 52;
  return `<div class='herogrid'><div class='ring' role='img' aria-label='${t} of 10 points'><svg viewBox='0 0 120 120'><circle cx='60' cy='60' r='52' class='rtrack'/><circle cx='60' cy='60' r='52' class='rfill' stroke-dasharray='${(C * t / 10).toFixed(1)} ${C.toFixed(1)}'/></svg><div class='rnum'><b id='scorenum'>${t}</b><span>of 10</span></div></div>
  <div class='hstats'><div class='muted2'>${date === today() ? 'Today' : long(date)}</div>${ps.map(p => `<div class='hrow'><span>${p.k}</span><span class='hbar'><i style='width:${p.got / p.n * 100}%'></i></span><b>${p.got}<small>/${p.n}</small></b></div>`).join('')}</div></div>`;
}
function rowHTML(field, label, points, on) {
  return `<button class='row' data-act='toggle' data-arg='${field}' aria-pressed='${!!on}'><span class='dot'>${CHECK}</span><span class='lbl'>${label}</span><span class='pts'>${points} pts</span></button>`;
}
function segHTML(field, value, opts) {
  return `<div class='seg' role='group'>${opts.map(o => `<button data-act='set' data-arg='${field}' data-val='${o[0]}' aria-pressed='${value === o[0]}'>${o[1]}<small>${o[2]}</small></button>`).join('')}</div>`;
}
function fieldHTML(id, label, v) {
  return `<label class='field'>${label}<input id='f-${id}' data-measure='${id}' type='number' inputmode='decimal' step='0.1' min='0' value='${v == null ? '' : esc(v)}'></label>`;
}
function snapHTML(date, d) {
  const isToday = date === today();
  if (d.snap_path) {
    return `<div class='snaprow'><button data-act='snap' data-arg='${S.uid}|${date}' aria-label='View snap'><img class='thumb' data-snap='${esc(d.snap_path)}' alt='Your gym snap'></button>
    <span class='lbl'>Snap sent<small>${clock(d.snap_at)}${d.snap_verified ? ', verified' : ''}</small></span>${isToday ? `<button class='link' data-act='camera'>Retake</button>` : ''}</div>`;
  }
  return isToday ? `<div class='snaprow'><button class='btn full' data-act='camera'>Take gym snap</button></div>` : '';
}
function weekBars(uid, mon, cur) {
  return `<div class='days7'>${weekDates(mon).map(x => {
    const v = score(x, day(uid, x));
    return `<div class='d7${x === cur ? ' cur' : ''}'><span class='v'>${day(uid, x) ? v : ''}</span><span class='slot'>${v ? `<i style='height:${v * 7.2}px'></i>` : ''}</span>${DAYS[parse(x).getDay()][0]}</div>`;
  }).join('')}</div>`;
}
function proofHTML(kind, date, d) {
  const gym = kind === 'gym', path = gym ? d.snap_path : d.steps_path, pts = gym ? 3 : 2;
  const sub = path ? (gym ? `${d.snap_at ? clock(d.snap_at) + ', ' : ''}${d.snap_verified ? 'live snap' : 'uploaded photo'}` : 'Screenshot added') : (gym ? 'Add a gym photo to earn the points' : 'Upload a screenshot of your step count');
  const btns = gym && date === today()
    ? `<button class='btn sm' data-act='camera'>${path ? 'Retake' : 'Take snap'}</button><button class='btn sm ghost' data-act='upload' data-arg='gym'>Upload photo</button>`
    : `<button class='btn sm${path ? ' ghost' : ''}' data-act='upload' data-arg='${kind}'>${path ? 'Replace' : gym ? 'Upload photo' : 'Upload screenshot'}</button>`;
  return `<div class='block'><div class='proof'><span class='dot${path ? ' on' : ''}'>${CHECK}</span>${path ? `<button data-act='snap' data-arg='${S.uid}|${date}|${kind}' aria-label='View'><img class='thumb' data-snap='${esc(path)}' alt=''></button>` : ''}<span class='lbl'>${gym ? 'Gym session' : 'Step goal'}<small>${sub}</small></span><span class='pts'>${path ? pts + ' of ' + pts : pts + ' pts'}</span></div><div class='proofbtns'>${btns}</div></div>`;
}
function viewToday() {
  const date = S.date, d = day(S.uid, date) || {}, sun = isSunday(date), mon = mondayOf(today());
  let body;
  if (sun) {
    const m = measOf(S.uid, date) || {};
    body = rowHTML('cardio', 'Cardio', 3, d.cardio) +
      `<div class='block'><div class='cardhead'><span class='lbl'>Measurements</span><span class='pts' id='measpts'>${d.measured ? '2 of 2' : '2 pts'}</span></div>
      <div class='fields'>${fieldHTML('waist', 'Waist, cm', m.waist)}${fieldHTML('second', (S.me.second_measure === 'glutes' ? 'Glutes' : 'Biceps') + ', cm', m.second)}${fieldHTML('weight', 'Weight, kg', m.weight)}</div></div>
      <div class='block'><span class='lbl'>Diet</span>${segHTML('cheat_meals', d.cheat_meals, [['good', 'Good diet', '5 pts'], ['some', '1 to 2 cheat meals', '3 pts'], ['more', 'More', '0 pts']])}</div>`;
  } else {
    body = proofHTML('gym', date, d) +
      `<div class='block'><span class='lbl'>Diet</span>${segHTML('diet', d.diet, [['perfect', 'Perfect', '5 pts'], ['average', 'Average', '3 pts'], ['cheat', 'Cheat', '0 pts']])}</div>` +
      proofHTML('steps', date, d);
  }
  const wk = weekTotal(S.uid, mon);
  let duelCard = '';
  if (S.opp) {
    const dm = duelWeekStart(), me = weekTotal(S.uid, dm), th = weekTotal(S.opp.id, dm), gap = Math.abs(me - th);
    duelCard = `<button class='card' data-act='go' data-arg='duel'><div class='cardhead'><h2>Duel, week ${duelWeekIndex(today()) + 1}</h2><span class='pts'>${gap === 0 ? 'Level' : me > th ? 'You lead by ' + gap : esc(S.opp.name) + ' leads by ' + gap}</span></div>
    <div class='cardhead'><span>You <b>${me}</b></span><span>${esc(S.opp.name)} <b>${th}</b></span></div></button>`;
  }
  return `<div class='pagehead'><div><h1>${date === today() ? 'Log today' : 'Edit day'}</h1><p>${long(date)}</p></div><div class='datenav'>
      <button class='arrow' data-act='nav' data-arg='-1' aria-label='Previous day' ${date <= addDays(today(), -6) ? 'disabled' : ''}>&#8249;</button>
      <button class='arrow' data-act='nav' data-arg='1' aria-label='Next day' ${date >= today() ? 'disabled' : ''}>&#8250;</button></div></div>
  <div class='grid two'><div class='stack'><section class='panel' id='hero'>${heroHTML(date, d)}</section><section class='card'><div class='list'>${body}</div></section></div>
  <div class='stack'><section class='card'><div class='cardhead'><h2>This week</h2><span class='pts'>${wk} of 70</span></div>${weekBars(S.uid, mon, date)}</section>${duelCard}</div></div>`;
}

/* Charts */
function scoreChart(uid, color) {
  const weeks = weeksFor(uid, 12);
  if (!weeks.length) return `<p class='muted'>Log your first day and your weekly scores appear here.</p>`;
  const sel = weeks.find(x => x.w === S.week) || weeks[weeks.length - 1];
  const W = 620, H = 180, L = 30, R = 10, T = 12, B = H - 24, n = weeks.length, step = (W - L - R) / n, cx = i => L + step * (i + .5), y = v => B - (v / 70) * (B - T), bw = Math.min(30, step * .6);
  let g = [0, 35, 70].map(v => `<line class='gridline' x1='${L}' x2='${W - R}' y1='${y(v)}' y2='${y(v)}'/><text x='${L - 8}' y='${y(v) + 4}' text-anchor='end'>${v}</text>`).join('');
  weeks.forEach((x, i) => {
    const h = B - y(x.score);
    if (h > 0) { const r = Math.min(4, h); g += `<path d='M${cx(i) - bw / 2} ${B}V${y(x.score) + r}q0 -${r} ${r} -${r}H${cx(i) + bw / 2 - r}q${r} 0 ${r} ${r}V${B}Z' fill='${color}' opacity='${x === sel ? 1 : .45}'/>`; }
    if (n <= 6 || i % 2 === (n - 1) % 2) g += `<text x='${cx(i)}' y='${H - 4}' text-anchor='middle'>${short(x.w)}</text>`;
    g += `<rect class='hit' data-act='week' data-arg='${x.w}' x='${cx(i) - step / 2}' y='0' width='${step}' height='${H}'><title>Week of ${short(x.w)}: ${x.score} of 70</title></rect>`;
  });
  return `<div class='chart'><svg viewBox='0 0 ${W} ${H}' role='img' aria-label='Weekly score out of 70'>${g}</svg></div><p class='readout'>Week of ${short(sel.w)}: ${sel.score} of 70${sel.current ? ' so far' : ''}</p>`;
}
function waistChart(uid, color) {
  const weeks = weeksFor(uid, 12), pts = weeks.filter(x => x.waist != null);
  if (pts.length < 2) return '';
  const W = 620, H = 150, L = 30, R = 44, T = 12, B = H - 24, n = weeks.length, step = (W - L - R) / n, cx = i => L + step * (i + .5), vals = pts.map(p => p.waist);
  let lo = Math.floor(Math.min(...vals) - .5), hi = Math.ceil(Math.max(...vals) + .5);
  if (hi - lo < 2) { hi += 1; lo -= 1; }
  const y = v => B - ((v - lo) / (hi - lo)) * (B - T);
  const c = weeks.map((x, i) => x.waist != null ? [cx(i), y(x.waist), x] : null).filter(Boolean), last = c[c.length - 1];
  const delta = +(pts[pts.length - 1].waist - pts[0].waist).toFixed(1);
  const svg = [lo, hi].map(v => `<line class='gridline' x1='${L}' x2='${W - R}' y1='${y(v)}' y2='${y(v)}'/><text x='${L - 8}' y='${y(v) + 4}' text-anchor='end'>${v}</text>`).join('') +
    `<polyline fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' points='${c.map(p => p[0] + ',' + p[1]).join(' ')}'/>` +
    c.map(p => `<circle cx='${p[0]}' cy='${p[1]}' r='4' fill='${color}' stroke='var(--card)' stroke-width='2'/>`).join('') +
    `<text class='v' x='${last[0] + 10}' y='${last[1] + 4}'>${last[2].waist}</text>` +
    weeks.map((x, i) => (n <= 6 || i % 2 === (n - 1) % 2) ? `<text x='${cx(i)}' y='${H - 4}' text-anchor='middle'>${short(x.w)}</text>` : '').join('');
  return `<section class='card'><div class='cardhead'><h2>Waist trend</h2><span class='pts'>${delta === 0 ? 'No change' : Math.abs(delta) + ' cm ' + (delta < 0 ? 'down' : 'up')}</span></div><div class='chart'><svg viewBox='0 0 ${W} ${H}' role='img' aria-label='Waist in centimetres each Sunday'>${svg}</svg></div></section>`;
}
function snapStrip(list) {
  if (!list.length) return `<p class='muted'>No snaps yet this week.</p>`;
  return `<div class='strip'>${list.map(s => `<button data-act='snap' data-arg='${s.u}|${s.x}' aria-label='${nameOf(s.u)}, ${short(s.x)}'><img class='thumb' data-snap='${esc(s.d.snap_path)}' alt=''><em>${nameOf(s.u)}</em></button>`).join('')}</div>`;
}
function snapsFor(uids, mon) {
  const out = [];
  weekDates(mon).slice().reverse().forEach(x => uids.forEach(u => { const d = day(u, x); if (d && d.snap_path) out.push({ u, x, d }); }));
  return out;
}

/* Dashboard */
function rankPanel(uid, you) {
  const p = S.profiles[uid], r = rankOf(uid);
  let prog = `<div class='muted2'>Rank starts after your first full week.</div>`;
  if (r.tier) {
    if (r.next) {
      const pct = Math.max(4, Math.round(((r.avg - r.floor) / (r.next.min - r.floor)) * 100));
      prog = `<div class='progress'><i style='width:${pct}%'></i></div><div class='muted2'>${r.next.min - r.avg} points a week from ${r.next.n}</div>`;
    } else prog = `<div class='progress'><i style='width:100%'></i></div><div class='muted2'>Top rank</div>`;
  }
  return `<section class='panel'><div class='ident'>${avatar(p, 'lg')}<div><h2>${esc(p.name)}</h2>${badge(r)}</div></div>${prog}</section>`;
}
function viewDashboard() {
  const mon = mondayOf(today()), r = rankOf(S.uid), all = S.days[S.uid] || {};
  const total = Object.keys(all).reduce((a, x) => a + score(x, all[x]), 0);
  const weeks = weeksFor(S.uid, 12), done = weeks.filter(x => !x.current), best = done.length ? Math.max(...done.map(x => x.score)) : null;
  const b = pointsBreakdown(S.uid, mon), max = { Training: 21, Diet: 35, Steps: 12, Measurements: 2 };
  const past = done.slice().reverse().map((x, i, a) => {
    const prev = a[i + 1], diff = prev ? x.score - prev.score : null;
    return `<div class='tr'><span>Week of ${short(x.w)}</span><span class='muted'>${diff == null ? '' : (diff > 0 ? '+' : '') + diff}</span><span class='r'><b>${x.score}</b></span></div>`;
  }).join('');
  return `<div class='pagehead'><div><h1>Dashboard</h1><p>Your scores and rank</p></div></div>
  ${rankPanel(S.uid, true)}
  <div class='stats'>${stat(weekTotal(S.uid, mon), 'This week', 'of 70')}${stat(r.avg == null ? 'None' : r.avg, '4-week average', r.avg == null ? '' : 'of 70')}${stat(best == null ? 'None' : best, 'Best week', best == null ? '' : 'of 70')}${stat(total, 'Total points')}</div>
  <div class='grid two'><div class='stack'><section class='card'><h2>Weekly scores</h2>${scoreChart(S.uid, 'var(--you)')}</section>${waistChart(S.uid, 'var(--you)')}</div>
  <div class='stack'><section class='card'><h2>Points this week</h2>${Object.keys(b).map(k => `<div class='meter'><div><span>${k}</span><span class='muted'>${b[k]} of ${max[k]}</span></div><span class='trk'><i style='width:${b[k] / max[k] * 100}%'></i></span></div>`).join('')}</section>
  ${past ? `<section class='card'><h2>Past weeks</h2><div class='table'>${past}</div></section>` : ''}
  <section class='card'><h2>Profile</h2><button class='btn ghost full' data-act='editDetails'>Edit your details</button><button class='link' data-act='signout'>Sign out</button><button class='link danger' data-act='resetProgress'>${S.confirm === 'reset' ? 'Tap again to permanently delete all your scores, measurements and snaps' : 'Reset progress'}</button></section></div></div>`;
}

/* Join and invite helpers */
const joinForm = label => `<form class='inline' data-form='join'><input class='input' name='code' required maxlength='10' placeholder='Invite code' aria-label='Invite code' autocapitalize='characters'><button class='btn ghost' type='submit'>${label}</button></form>`;
const inviteBox = code => `<div class='codebox'><b>${esc(code)}</b><button class='link' data-act='copy' data-arg='${esc(code)}'>Copy invite link</button></div>`;

/* Duel */
function viewDuel() {
  const head = `<div class='pagehead'><div><h1>Duel</h1><p>Head to head in 7-day weeks, counted from the day your duel started</p></div></div>`;
  if (!S.duel) {
    return head + `<div class='grid two'><section class='card'><h2>Start a duel</h2><p class='muted'>Create an invite and send it to one person.</p><button class='btn full' data-act='createDuel'>Create duel invite</button></section>
    <section class='card'><h2>Have a code?</h2>${joinForm('Join')}</section></div>`;
  }
  if (!S.opp) {
    return head + `<section class='card'><h2>Waiting for your opponent</h2><p class='muted'>Send them this invite. The duel starts when they join.</p>${inviteBox(S.duel.code)}<button class='link danger' data-act='endDuel'>${S.confirm === 'endDuel' ? 'Tap again to cancel the invite' : 'Cancel invite'}</button></section>`;
  }
  const wi = Math.max(0, duelWeekIndex(today())), ds = duelStart(), mon = addDays(ds, 7 * wi), dn = diffDays(today(), mon) + 1, oid = S.opp.id, me = weekTotal(S.uid, mon), th = weekTotal(oid, mon), gap = Math.abs(me - th);
  const verdict = gap === 0 ? 'Level so far' : me > th ? 'You lead by ' + gap : esc(S.opp.name) + ' leads by ' + gap;
  const focus = S.dayFocus && weekDates(mon).includes(S.dayFocus) ? S.dayFocus : today();
  const cols = weekDates(mon).map((x, di) => {
    const a = score(x, day(S.uid, x)), b = score(x, day(oid, x));
    return `<button class='col' data-act='day' data-arg='${x}' aria-pressed='${x === focus}' aria-label='${long(x)}: you ${a}, ${esc(S.opp.name)} ${b}'><span class='zone up'>${a ? `<i class='b' style='height:${a * 5}px'></i>` : ''}</span><span class='zone down'>${b ? `<i class='b' style='height:${b * 5}px'></i>` : ''}</span><span class='day'>Day ${di + 1}</span></button>`;
  }).join('');
  const start = ds;
  let w = 0, l = 0, t = 0; const past = [];
  for (let m = start; m < mon; m = addDays(m, 7)) {
    const a = weekTotal(S.uid, m), b = weekTotal(oid, m);
    if (a > b) w++; else if (a < b) l++; else t++;
    past.unshift(`<div class='tr'><span>Week ${duelWeekIndex(m) + 1}<span class='muted'>, ${short(m)}</span></span><span class='muted'>${a} to ${b}</span><span class='r'>${a === b ? 'Tie' : a > b ? 'You won' : esc(S.opp.name) + ' won'}</span></div>`);
  }
  const fd = day(oid, focus) || {}, fp = parts(focus, fd);
  return head + `<section class='panel'><div class='versus'><div class='side'><span class='who'><i class='sw you'></i>You</span><span class='total'>${me}</span></div><div class='side'><span class='who'>${esc(S.opp.name)}<i class='sw them'></i></span><span class='total'>${th}</span></div></div><div class='cardhead'><span>${verdict}</span><span class='muted2'>Week ${wi + 1}, day ${dn} of 7</span></div></section>
  <div class='stats'>${stat(w, 'Weeks you won')}${stat(l, 'Weeks ' + esc(S.opp.name) + ' won')}${stat(t, 'Ties')}${stat(rankOf(oid).tier || 'Unranked', esc(S.opp.name) + ' rank')}</div>
  <div class='grid two'><div class='stack'><section class='card'><h2>Week ${wi + 1} by day</h2><div class='mirror'>${cols}</div><p class='readout'>${long(focus)}: you ${score(focus, day(S.uid, focus))}, ${esc(S.opp.name)} ${score(focus, fd)}</p><div class='chips'>${fp.map(p => `<span class='chip'>${esc(S.opp.name)} ${p.k}: ${p.got} of ${p.n}</span>`).join('')}</div></section>
  <section class='card'><h2>Snaps this week</h2>${snapStrip(snapsFor([S.uid, oid], mon))}</section></div>
  <div class='stack'><section class='card'><div class='cardhead'><h2>${esc(S.opp.name)}</h2>${badge(rankOf(oid))}</div><button class='btn ghost full' data-act='player' data-arg='${oid}'>View scores and progress</button></section>
  ${past.length ? `<section class='card'><h2>Past weeks</h2><div class='table'>${past.join('')}</div></section>` : ''}
  <button class='link danger' data-act='endDuel'>${S.confirm === 'endDuel' ? 'Tap again to end this duel' : 'End duel'}</button></div></div>`;
}

/* Leagues */
function leagueMembers(id) { return S.members.filter(m => m.league_id === id).map(m => m.user_id).filter(u => S.profiles[u]); }
function viewLeagues() {
  if (S.league) return viewLeague(S.league);
  const mon = mondayOf(today());
  const rows = S.leagues.map(l => {
    const ids = leagueMembers(l.id), lm = leagueWeekStart(l.id, Math.max(0, leagueWeekIdx(l.id, today()))), sorted = ids.slice().sort((a, b) => leagueWeek(l.id, b, lm) - leagueWeek(l.id, a, lm)), pos = sorted.indexOf(S.uid) + 1;
    return `<button class='leaguerow' data-act='league' data-arg='${l.id}'><span><b>${esc(l.name)}</b><br><span class='muted small'>${ids.length} member${ids.length === 1 ? '' : 's'}</span></span><span class='pts'>${pos ? 'You are #' + pos : ''} &#8250;</span></button>`;
  }).join('');
  return `<div class='pagehead'><div><h1>Leagues</h1><p>Weekly leaderboards with your group</p></div></div>
  ${rows ? `<section class='card'><h2>Your leagues</h2><div class='list'>${rows}</div></section>` : `<section class='card'><h2>No leagues yet</h2><p class='muted'>Create one for your friends or gym group, or join with a code.</p></section>`}
  <div class='grid two'><section class='card'><h2>Create a league</h2><form class='inline' data-form='createLeague'><input class='input' name='name' required maxlength='30' placeholder='League name' aria-label='League name'><button class='btn' type='submit'>Create</button></form></section>
  <section class='card'><h2>Join a league</h2>${joinForm('Join')}</section></div>`;
}
/* League daily board: every member's score for each day of the chosen week, with that day's snaps below */
function dayCell(lid, u, x) {
  if (x > today()) return { t: '', lv: 'f', off: true };
  if (x < joinDate(lid, u)) return { t: '', lv: 'n', off: true };
  const d = day(u, x);
  if (!d) return { t: '–', lv: 'n', v: 0 };
  const v = score(x, d);
  return { t: v, lv: v >= 8 ? '3' : v >= 5 ? '2' : v > 0 ? '1' : '0', v };
}
function dailyBoard(id, ids, mon, tot) {
  const dates = weekDates(mon), past = dates.filter(x => x <= today());
  const focus = S.snapDay && dates.includes(S.snapDay) && S.snapDay <= today() ? S.snapDay : (past[past.length - 1] || mon);
  const head = dates.map(x => `<button class='dh' data-act='snapDay' data-arg='${x}' aria-pressed='${x === focus}' aria-label='${long(x)}' ${x > today() ? 'disabled' : ''}><span>${DAYS[parse(x).getDay()].slice(0, 3)}</span><b>${parse(x).getDate()}</b></button>`).join('');
  const rows = ids.map(u => {
    const me = u === S.uid;
    return `<span class='dn${me ? ' me' : ''}'>${me ? 'You' : esc((S.profiles[u] || {}).name || 'Player')}<small>${tot(u)} pts</small></span>` + dates.map(x => {
      const c = dayCell(id, u, x);
      return `<button class='dc l${c.lv}' data-act='snapDay' data-arg='${x}' aria-pressed='${x === focus}' aria-label='${nameOf(u)}, ${long(x)}: ${c.v == null ? 'no score' : c.v + ' of 10'}' ${c.off ? 'disabled' : ''}>${c.t}</button>`;
    }).join('');
  }).join('');
  const sun = isSunday(focus);
  const cards = ids.map(u => {
    const c = dayCell(id, u, focus), d = c.off ? null : day(u, focus), ps = parts(focus, d);
    let media;
    if (d && d.snap_path) media = `<button class='sg' data-act='snap' data-arg='${u}|${focus}' aria-label='${nameOf(u)}, ${short(focus)}'><img data-snap='${esc(d.snap_path)}' alt=''><span class='cap'>${d.snap_at ? clock(d.snap_at) : ''}${d.snap_verified ? (d.snap_at ? ', ' : '') + 'verified' : ''}</span></button>`;
    else media = `<div class='sg none'>${avatar(S.profiles[u], u === S.uid ? 'you' : '')}<span>${sun ? 'Rest day' : c.off ? 'Not in league yet' : 'No snap'}</span></div>`;
    const steps = d && d.steps_path ? `<button class='link small' data-act='snap' data-arg='${u}|${focus}|steps'>Steps screenshot</button>` : '';
    const chips = c.off ? '' : `<div class='chips'>${ps.map(p => `<span class='chip${p.got === p.n ? ' full' : ''}'>${p.k} ${p.got}/${p.n}</span>`).join('')}</div>`;
    return `<div class='dcard'>${media}<div class='meta'><b>${nameOf(u)}</b><span class='pts'>${c.off ? '' : (d ? c.v : 0) + ' of 10'}</span></div>${chips}${steps}</div>`;
  }).join('');
  return `<section class='card'><div class='cardhead'><h2>Daily scores</h2><span class='pts'>${long(focus)}</span></div>
  <div class='dgrid'><span></span>${head}${rows}</div>
  <h2 class='sub'>Snaps and points, ${short(focus)}</h2><div class='dlist'>${cards}</div></section>`;
}

function viewLeague(id) {
  const l = S.leagues.find(x => x.id === id), ids = leagueMembers(id);
  const wi = Math.max(0, leagueWeekIdx(id, today()));
  const ws = S.lwk != null && S.lwk >= 0 && S.lwk <= wi ? S.lwk : wi, isCur = ws === wi;
  const mon = leagueWeekStart(id, ws), dn = diffDays(today(), mon) + 1;
  const season = Math.floor(ws / 4), first = season * 4, weeks = [];
  for (let i = first; i <= Math.min(first + 3, wi); i++) weeks.push(i);
  const monthly = S.lbMode === 'month';
  const wk = (u, i) => leagueWeek(id, u, leagueWeekStart(id, i == null ? ws : i)), mo = u => weeks.reduce((a, i) => a + wk(u, i), 0);
  const results = weeks.map(i => {
    const best = Math.max(0, ...ids.map(u => wk(u, i)));
    return { i, best, who: best ? ids.filter(u => wk(u, i) === best) : [] };
  });
  const wins = u => results.filter(x => x.i < wi && x.who.includes(u)).length;
  const val = monthly ? mo : u => wk(u);
  const sorted = ids.slice().sort((a, b) => val(b) - val(a) || wk(b) - wk(a));
  const logged = u => weekDates(mon).filter(x => x <= today() && x >= joinDate(id, u) && day(u, x)).length;
  const rows = sorted.map((u, i) => {
    const p = S.profiles[u], me = u === S.uid, n = wins(u);
    const sub = monthly ? `${n} week${n === 1 ? '' : 's'} won, this week ${wk(u)}` : isCur ? `${rankOf(u).tier || 'Unranked'}, today ${score(today(), day(u, today()))} of 10` : `${logged(u)} day${logged(u) === 1 ? '' : 's'} logged`;
    return `<button class='lb${me ? ' me' : ''}' data-act='${me ? 'go' : 'player'}' data-arg='${me ? 'dashboard' : u}'><span class='pos'>${i + 1}</span>${avatar(p, me ? 'you' : '')}<span class='nm'>${me ? 'You' : esc(p.name)}<small>${sub}</small></span><span class='wk'>${val(u)}<small>${monthly ? 'points' : 'of 70'}</small></span></button>`;
  }).join('');
  const battles = results.map(x => {
    const cur = x.i === wi, names = x.who.map(nameOf).join(', '), plural = x.who.length > 1 || x.who[0] === S.uid;
    return `<button class='tr trb' data-act='lweek' data-arg='${x.i}'><span>Week ${x.i - first + 1}<span class='muted'>, ${short(leagueWeekStart(id, x.i))}</span></span><span class='muted'>${x.best ? x.best + ' pts' : ''}</span><span class='r'>${!x.best ? 'No scores yet' : cur ? names + (plural ? ' lead' : ' leads') : names + ' won'}</span></button>`;
  }).reverse().join('');
  const wkNav = `<div class='wknav'><button class='arrow' data-act='lweek' data-arg='${ws - 1}' aria-label='Previous week' ${ws <= 0 ? 'disabled' : ''}>&#8249;</button>
    <div class='mid'><b>Week ${ws - first + 1}${isCur ? ', this week' : ''}</b><span>${short(mon)} to ${short(addDays(mon, 6))}, season ${season + 1}</span></div>
    <button class='arrow' data-act='lweek' data-arg='${ws + 1}' aria-label='Next week' ${isCur ? 'disabled' : ''}>&#8250;</button></div>`;
  return `<button class='back' data-act='backLeagues'>&#8249; All leagues</button><div class='pagehead'><div><h1>${esc(l.name)}</h1><p>Season ${season + 1}, week ${ws - first + 1} of 4${isCur ? `, day ${dn} of 7` : ''}, ${ids.length} member${ids.length === 1 ? '' : 's'}</p></div></div>
  <section class='card'>${wkNav}</section>
  <div class='grid two'><div class='stack'><section class='card'><h2>Leaderboard</h2><div class='seg' role='group'><button data-act='lbMode' data-arg='week' aria-pressed='${!monthly}'>${isCur ? 'This week' : 'Week ' + (ws - first + 1)}</button><button data-act='lbMode' data-arg='month' aria-pressed='${monthly}'>Season ${season + 1}</button></div><div class='list'>${rows}</div></section>${dailyBoard(id, sorted, mon, u => wk(u))}</div>
  <div class='stack'><section class='card'><div class='cardhead'><h2>Weekly battles</h2><span class='pts'>Season ${season + 1}</span></div><div class='table'>${battles}</div><p class='muted small'>Tap a week to open it. Weeks run 7 days from the day the league started, and a season is 4 weeks. Scores reset each week and add up over the season. Anyone who joins starts from zero.</p></section>
  <section class='card'><h2>Invite people</h2>${inviteBox(l.code)}<p class='muted small'>Members can see each other's points and snaps. Body measurements stay private.</p></section><button class='link danger' data-act='leaveLeague' data-arg='${id}'>${S.confirm === 'leave' + id ? 'Tap again to leave this league' : 'Leave league'}</button></div></div>`;
}

/* History: every logged day and measurement, for you and your competitors */
const secondLabel = uid => (S.profiles[uid] || {}).second_measure === 'glutes' ? 'Glutes' : 'Biceps';
const ownerName = uid => uid === S.uid ? 'Your' : esc((S.profiles[uid] || {}).name || 'Player') + `'s`;
const canSeeMeas = uid => uid === S.uid || !!(S.opp && S.opp.id === uid);
const numOr = v => Number(v) > 0 ? Number(v) : null;
function peopleIds() {
  const out = [S.uid];
  if (S.opp) out.push(S.opp.id);
  S.leagues.forEach(l => leagueMembers(l.id).forEach(u => { if (!out.includes(u)) out.push(u); }));
  return out.filter(u => S.profiles[u]);
}
function histChips(act, sel, ids, none) {
  return `<div class='pchips'>${none ? `<button class='pchip' data-act='${act}' data-arg='none' aria-pressed='${sel == null}'><span>None</span></button>` : ''}${ids.map(u => `<button class='pchip' data-act='${act}' data-arg='${u}' aria-pressed='${sel === u}'>${avatar(S.profiles[u], u === S.uid ? 'you' : '')}<span>${nameOf(u)}</span></button>`).join('')}</div>`;
}
function keyChips(uids) {
  return `<div class='chips'>${uids.map((u, k) => `<span class='chip key'><i style='background:${k ? 'var(--them)' : 'var(--you)'}'></i>${nameOf(u)}</span>`).join('')}</div>`;
}
function dailyChart(uids, n) {
  const dates = Array.from({ length: n }, (_, i) => addDays(today(), i - n + 1));
  const W = 620, H = 170, L = 26, R = 6, T = 10, B = H - 22, step = (W - L - R) / n, y = v => B - (v / 10) * (B - T);
  const cols = ['var(--you)', 'var(--them)'], bw = Math.max(1.5, Math.min(14, step * .8 / uids.length));
  let g = [0, 5, 10].map(v => `<line class='gridline' x1='${L}' x2='${W - R}' y1='${y(v)}' y2='${y(v)}'/><text x='${L - 6}' y='${y(v) + 4}' text-anchor='end'>${v}</text>`).join('');
  dates.forEach((x, i) => {
    const cx = L + step * (i + .5);
    uids.forEach((u, k) => {
      const d = day(u, x), v = d ? score(x, d) : 0;
      if (!v) return;
      const bx = cx - bw * uids.length / 2 + k * bw;
      g += `<rect x='${bx.toFixed(1)}' y='${y(v).toFixed(1)}' width='${bw.toFixed(1)}' height='${(B - y(v)).toFixed(1)}' rx='${Math.min(2, bw / 2).toFixed(1)}' fill='${cols[k]}'><title>${nameOf(u)}, ${short(x)}: ${v} of 10</title></rect>`;
    });
    if (i % (n > 56 ? 21 : 7) === 0) g += `<text x='${cx}' y='${H - 5}' text-anchor='middle'>${short(x)}</text>`;
  });
  return `<div class='chart'><svg viewBox='0 0 ${W} ${H}' role='img' aria-label='Daily score out of 10, last ${n} days'>${g}</svg></div>`;
}
function lineChart(series, unit) {
  const all = series.reduce((a, s) => a.concat(s.pts), []);
  if (!all.length) return `<p class='muted'>Nothing to chart yet.</p>`;
  const ds = all.map(p => p[0]).sort(), d0 = ds[0], d1 = ds[ds.length - 1], span = Math.max(1, diffDays(d1, d0)), vals = all.map(p => p[1]);
  let lo = Math.floor(Math.min(...vals) - .5), hi = Math.ceil(Math.max(...vals) + .5);
  if (hi - lo < 2) { hi += 1; lo -= 1; }
  const W = 620, H = 170, L = 34, R = 44, T = 12, B = H - 22, X = d => L + diffDays(d, d0) / span * (W - L - R), Y = v => B - (v - lo) / (hi - lo) * (B - T);
  let g = [lo, hi].map(v => `<line class='gridline' x1='${L}' x2='${W - R}' y1='${Y(v)}' y2='${Y(v)}'/><text x='${L - 6}' y='${Y(v) + 4}' text-anchor='end'>${v}</text>`).join('');
  series.forEach((s, k) => {
    const col = k ? 'var(--them)' : 'var(--you)';
    if (!s.pts.length) return;
    if (s.pts.length > 1) g += `<polyline fill='none' stroke='${col}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' points='${s.pts.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}'/>`;
    g += s.pts.map(p => `<circle cx='${X(p[0]).toFixed(1)}' cy='${Y(p[1]).toFixed(1)}' r='4' fill='${col}' stroke='var(--card)' stroke-width='2'><title>${s.name}, ${short(p[0])}: ${p[1]} ${unit}</title></circle>`).join('');
    const last = s.pts[s.pts.length - 1];
    g += `<text class='v' x='${X(last[0]) + 9}' y='${Y(last[1]) + 4}'>${last[1]}</text>`;
  });
  g += `<text x='${L}' y='${H - 5}' text-anchor='start'>${short(d0)}</text>` + (d1 !== d0 ? `<text x='${W - R}' y='${H - 5}' text-anchor='end'>${short(d1)}</text>` : '');
  return `<div class='chart'><svg viewBox='0 0 ${W} ${H}' role='img' aria-label='Measurement trend in ${unit}'>${g}</svg></div>`;
}
function histLog(uid, cmp, weeksShown) {
  const first = firstDate(uid);
  if (!first) return `<p class='muted'>No days logged yet.</p>`;
  const firstMon = mondayOf(first), blocks = [];
  let mon = mondayOf(today()), n = 0;
  for (; mon >= firstMon && n < weeksShown; mon = addDays(mon, -7), n++) {
    const rows = weekDates(mon).filter(x => x <= today() && x >= first).reverse().map(x => {
      const d = day(uid, x), v = score(x, d), cd = cmp ? day(cmp, x) : null, m = isSunday(x) && canSeeMeas(uid) ? measOf(uid, x) : null;
      const chips = d ? parts(x, d).map(p => `<span class='chip${p.got === p.n ? ' full' : ''}'>${p.k} ${p.got}/${p.n}</span>`).join('') : `<span class='chip'>Not logged</span>`;
      const mchips = m ? [['Waist', numOr(m.waist)], [secondLabel(uid), numOr(m.second)], ['Weight', numOr(m.weight)]].filter(p => p[1]).map(p => `<span class='chip meas'>${p[0]} ${p[1]}</span>`).join('') : '';
      const thumb = d && d.snap_path ? `<button data-act='snap' data-arg='${uid}|${x}' aria-label='View snap'><img class='thumb sm' data-snap='${esc(d.snap_path)}' alt=''></button>` : `<span class='thumb sm empty'></span>`;
      return `<div class='hl${d ? '' : ' miss'}'><span class='hd'><b>${DAYS[parse(x).getDay()].slice(0, 3)}</b>${short(x)}</span>${thumb}<span class='hm'><span class='chips'>${chips}${mchips}</span></span><span class='hs'><b>${d ? v : 0}</b>${cmp ? `<small>${cd ? score(x, cd) : 0}</small>` : ''}</span></div>`;
    }).join('');
    const mt = weekTotal(uid, mon), ct = cmp ? weekTotal(cmp, mon) : null;
    blocks.push(`<div class='hweek'><div class='cardhead'><b>Week of ${short(mon)}</b><span class='pts'>${mt} of 70${cmp ? `, ${nameOf(cmp)} ${ct}` : ''}</span></div>${rows}</div>`);
  }
  const more = mon >= firstMon ? `<button class='btn ghost full' data-act='histMore'>Show older weeks</button>` : '';
  return blocks.join('') + more;
}
function measCard(uid) {
  const m = S.meas[uid] || {}, dates = Object.keys(m).sort().reverse(), lab = secondLabel(uid);
  let body;
  if (!dates.length) body = `<p class='muted'>${canSeeMeas(uid) ? 'No measurements yet. Add them on a Sunday.' : 'Measurements are only shared with you and your duel opponent.'}</p>`;
  else {
    const fmt = v => numOr(v) == null ? '–' : numOr(v);
    body = `<div class='mt head'><span>Date</span><span>Waist</span><span>${lab}</span><span>Weight</span></div>` + dates.map((x, i) => {
      const r = m[x], prev = m[dates[i + 1]], w = numOr(r.waist), pw = prev ? numOr(prev.waist) : null, dl = w && pw ? +(w - pw).toFixed(1) : null;
      return `<div class='mt'><span>${short(x)}</span><span>${fmt(r.waist)}${dl ? `<small>${dl > 0 ? '+' : '−'}${Math.abs(dl)}</small>` : ''}</span><span>${fmt(r.second)}</span><span>${fmt(r.weight)}</span></div>`;
    }).join('');
  }
  return `<section class='card'><h2>${ownerName(uid)} measurements</h2>${body}</section>`;
}
function viewHistory() {
  const ids = peopleIds(), u = ids.includes(S.hu) ? S.hu : S.uid, c = S.hc && S.hc !== u && ids.includes(S.hc) ? S.hc : null;
  const n = S.hn === 84 ? 84 : 28, metric = ['waist', 'weight', 'second'].includes(S.hm) ? S.hm : 'waist', unit = metric === 'weight' ? 'kg' : 'cm';
  const all = S.days[u] || {}, keys = Object.keys(all), pts = keys.map(x => score(x, all[x])), total = pts.reduce((a, b) => a + b, 0);
  const best = pts.length ? Math.max(...pts) : 0, avg = keys.length ? (total / keys.length).toFixed(1) : '0';
  const who = c ? [u, c] : [u];
  const label = { waist: 'Waist', weight: 'Weight', second: secondLabel(u) }[metric];
  const series = who.filter(canSeeMeas).map(x => ({ name: nameOf(x), pts: Object.keys(S.meas[x] || {}).sort().map(d => [d, numOr(S.meas[x][d][metric])]).filter(p => p[1]) }));
  const hidden = who.filter(x => !canSeeMeas(x));
  const metricSeg = `<div class='seg' role='group'>${[['waist', 'Waist'], ['weight', 'Weight'], ['second', secondLabel(u)]].map(p => `<button data-act='histMetric' data-arg='${p[0]}' aria-pressed='${metric === p[0]}'>${p[1]}</button>`).join('')}</div>`;
  return `<div class='pagehead'><div><h1>History</h1><p>Every logged day and measurement</p></div></div>
  <section class='card'><h2>Whose history</h2>${histChips('histWho', u, ids)}<h2 class='sub'>Compare with</h2>${histChips('histCmp', c, ids.filter(x => x !== u), true)}</section>
  <div class='stats'>${stat(total, 'Total points')}${stat(keys.length, 'Days logged')}${stat(best, 'Best day', 'of 10')}${stat(avg, 'Average per day', 'of 10')}</div>
  <div class='grid two'><div class='stack'>
    <section class='card'><div class='cardhead'><h2>Daily scores</h2><div class='seg mini' role='group'><button data-act='histRange' data-arg='28' aria-pressed='${n === 28}'>4 weeks</button><button data-act='histRange' data-arg='84' aria-pressed='${n === 84}'>12 weeks</button></div></div>${c ? keyChips(who) : ''}${dailyChart(who, n)}</section>
    <section class='card'><h2>Day by day</h2>${c ? `<p class='muted small'>Big number is ${nameOf(u)}'s score, small number is ${nameOf(c)}'s.</p>` : ''}${histLog(u, c, S.hw || 4)}</section>
  </div><div class='stack'>
    <section class='card'><h2>Measurement trend</h2>${metricSeg}${c ? keyChips(who.filter(canSeeMeas)) : ''}${lineChart(series, unit)}<p class='muted small'>${label} in ${unit}.${hidden.length ? ' ' + hidden.map(x => ownerName(x).replace(/'s$/, '')).join(', ') + ' keep measurements private unless you are in a duel together.' : ''}</p></section>
    ${who.map(measCard).join('')}
  </div></div>`;
}

/* Another player's page */
function viewPlayer(uid) {
  const p = S.profiles[uid], mon = mondayOf(today()), r = rankOf(uid), weeks = weeksFor(uid, 12).filter(x => !x.current);
  const best = weeks.length ? Math.max(...weeks.map(x => x.score)) : null;
  return `<button class='back' data-act='backPlayer'>&#8249; Back</button>${rankPanel(uid)}
  <div class='stats'>${stat(weekTotal(uid, mon), 'This week', 'of 70')}${stat(score(today(), day(uid, today())), 'Today', 'of 10')}${stat(r.avg == null ? 'None' : r.avg, '4-week average', r.avg == null ? '' : 'of 70')}${stat(best == null ? 'None' : best, 'Best week', best == null ? '' : 'of 70')}</div>
  <div class='grid two'><div class='stack'><section class='card'><h2>Weekly scores</h2>${scoreChart(uid, 'var(--them)')}</section>${waistChart(uid, 'var(--them)')}</div>
  <div class='stack'><section class='card'><h2>This week by day</h2>${weekBars(uid, mon, today())}</section><section class='card'><h2>Snaps this week</h2>${snapStrip(snapsFor([uid], mon))}</section><button class='btn ghost full' data-act='histWho' data-arg='${uid}'>See every day and measurements</button></div></div>`;
}
