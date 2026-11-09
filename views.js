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
  const ps = parts(date, d), t = score(date, d);
  return `<div class='scoreline'><div class='bignum'><span id='scorenum'>${t}</span><small>of 10</small></div><div class='muted2'>${date === today() ? 'Today' : long(date)}</div></div>
  <div class='segbar' role='img' aria-label='${t} of 10 points'>${ps.map(p => `<div class='group' style='--n:${p.n}'>${Array.from({ length: p.n }, (_, i) => `<div class='tick${i < p.got ? ' on' : ''}'></div>`).join('')}</div>`).join('')}</div>
  <div class='legend'>${ps.map(p => `<span style='--n:${p.n}'>${p.k}</span>`).join('')}</div>`;
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
    body = rowHTML('gym', 'Gym session', 3, d.gym) + snapHTML(date, d) +
      `<div class='block'><span class='lbl'>Diet</span>${segHTML('diet', d.diet, [['perfect', 'Perfect', '5 pts'], ['average', 'Average', '3 pts'], ['cheat', 'Cheat', '0 pts']])}</div>` +
      rowHTML('steps', 'Step goal', 2, d.steps);
  }
  const wk = weekTotal(S.uid, mon);
  let duelCard = '';
  if (S.opp) {
    const th = weekTotal(S.opp.id, mon), gap = Math.abs(wk - th);
    duelCard = `<button class='card' data-act='go' data-arg='duel'><div class='cardhead'><h2>Duel</h2><span class='pts'>${gap === 0 ? 'Level' : wk > th ? 'You lead by ' + gap : esc(S.opp.name) + ' leads by ' + gap}</span></div>
    <div class='cardhead'><span>You <b>${wk}</b></span><span>${esc(S.opp.name)} <b>${th}</b></span></div></button>`;
  }
  return `<div class='pagehead'><div><h1>${date === today() ? 'Log today' : 'Edit day'}</h1><p>${long(date)}</p></div><div class='datenav'>
      <button class='arrow' data-act='nav' data-arg='-1' aria-label='Previous day' ${date <= mon ? 'disabled' : ''}>&#8249;</button>
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
  <section class='card'><h2>Profile</h2><button class='btn ghost full' data-act='editDetails'>Edit your details</button><button class='link' data-act='signout'>Sign out</button></section></div></div>`;
}

/* Join and invite helpers */
const joinForm = label => `<form class='inline' data-form='join'><input class='input' name='code' required maxlength='10' placeholder='Invite code' aria-label='Invite code' autocapitalize='characters'><button class='btn ghost' type='submit'>${label}</button></form>`;
const inviteBox = code => `<div class='codebox'><b>${esc(code)}</b><button class='link' data-act='copy' data-arg='${esc(code)}'>Copy invite link</button></div>`;

/* Duel */
function viewDuel() {
  const head = `<div class='pagehead'><div><h1>Duel</h1><p>Head to head, reset every Monday</p></div></div>`;
  if (!S.duel) {
    return head + `<div class='grid two'><section class='card'><h2>Start a duel</h2><p class='muted'>Create an invite and send it to one person.</p><button class='btn full' data-act='createDuel'>Create duel invite</button></section>
    <section class='card'><h2>Have a code?</h2>${joinForm('Join')}</section></div>`;
  }
  if (!S.opp) {
    return head + `<section class='card'><h2>Waiting for your opponent</h2><p class='muted'>Send them this invite. The duel starts when they join.</p>${inviteBox(S.duel.code)}<button class='link danger' data-act='endDuel'>${S.confirm === 'endDuel' ? 'Tap again to cancel the invite' : 'Cancel invite'}</button></section>`;
  }
  const mon = mondayOf(today()), oid = S.opp.id, me = weekTotal(S.uid, mon), th = weekTotal(oid, mon), gap = Math.abs(me - th);
  const verdict = gap === 0 ? 'Level so far' : me > th ? 'You lead by ' + gap : esc(S.opp.name) + ' leads by ' + gap;
  const focus = S.dayFocus && weekDates(mon).includes(S.dayFocus) ? S.dayFocus : today();
  const cols = weekDates(mon).map(x => {
    const a = score(x, day(S.uid, x)), b = score(x, day(oid, x));
    return `<button class='col' data-act='day' data-arg='${x}' aria-pressed='${x === focus}' aria-label='${long(x)}: you ${a}, ${esc(S.opp.name)} ${b}'><span class='zone up'>${a ? `<i class='b' style='height:${a * 5}px'></i>` : ''}</span><span class='zone down'>${b ? `<i class='b' style='height:${b * 5}px'></i>` : ''}</span><span class='day'>${DAYS[parse(x).getDay()][0]}</span></button>`;
  }).join('');
  const start = mondayOf(iso(new Date(S.duel.started_at || S.duel.created_at)));
  let w = 0, l = 0, t = 0; const past = [];
  for (let m = start; m < mon; m = addDays(m, 7)) {
    const a = weekTotal(S.uid, m), b = weekTotal(oid, m);
    if (a > b) w++; else if (a < b) l++; else t++;
    past.unshift(`<div class='tr'><span>Week of ${short(m)}</span><span class='muted'>${a} to ${b}</span><span class='r'>${a === b ? 'Tie' : a > b ? 'You won' : esc(S.opp.name) + ' won'}</span></div>`);
  }
  const fd = day(oid, focus) || {}, fp = parts(focus, fd);
  return head + `<section class='panel'><div class='versus'><div class='side'><span class='who'><i class='sw you'></i>You</span><span class='total'>${me}</span></div><div class='side'><span class='who'>${esc(S.opp.name)}<i class='sw them'></i></span><span class='total'>${th}</span></div></div><div class='cardhead'><span>${verdict}</span><span class='muted2'>Out of 70</span></div></section>
  <div class='stats'>${stat(w, 'Weeks you won')}${stat(l, 'Weeks ' + esc(S.opp.name) + ' won')}${stat(t, 'Ties')}${stat(rankOf(oid).tier || 'Unranked', esc(S.opp.name) + ' rank')}</div>
  <div class='grid two'><div class='stack'><section class='card'><h2>This week by day</h2><div class='mirror'>${cols}</div><p class='readout'>${long(focus)}: you ${score(focus, day(S.uid, focus))}, ${esc(S.opp.name)} ${score(focus, fd)}</p><div class='chips'>${fp.map(p => `<span class='chip'>${esc(S.opp.name)} ${p.k}: ${p.got} of ${p.n}</span>`).join('')}</div></section>
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
    const ids = leagueMembers(l.id), sorted = ids.slice().sort((a, b) => weekTotal(b, mon) - weekTotal(a, mon)), pos = sorted.indexOf(S.uid) + 1;
    return `<button class='leaguerow' data-act='league' data-arg='${l.id}'><span><b>${esc(l.name)}</b><br><span class='muted small'>${ids.length} member${ids.length === 1 ? '' : 's'}</span></span><span class='pts'>${pos ? 'You are #' + pos : ''} &#8250;</span></button>`;
  }).join('');
  return `<div class='pagehead'><div><h1>Leagues</h1><p>Weekly leaderboards with your group</p></div></div>
  ${rows ? `<section class='card'><h2>Your leagues</h2><div class='list'>${rows}</div></section>` : `<section class='card'><h2>No leagues yet</h2><p class='muted'>Create one for your friends or gym group, or join with a code.</p></section>`}
  <div class='grid two'><section class='card'><h2>Create a league</h2><form class='inline' data-form='createLeague'><input class='input' name='name' required maxlength='30' placeholder='League name' aria-label='League name'><button class='btn' type='submit'>Create</button></form></section>
  <section class='card'><h2>Join a league</h2>${joinForm('Join')}</section></div>`;
}
function dailySnaps(ids, mon) {
  const focus = S.snapDay && weekDates(mon).includes(S.snapDay) && S.snapDay <= today() ? S.snapDay : today();
  const has = u => { const d = day(u, focus); return !!(d && d.snap_path); };
  const posted = ids.filter(has), missing = ids.filter(u => !has(u));
  const pills = weekDates(mon).map(x => `<button class='dp' data-act='snapDay' data-arg='${x}' aria-pressed='${x === focus}' aria-label='${long(x)}' ${x > today() ? 'disabled' : ''}><span>${DAYS[parse(x).getDay()][0]}</span><b>${parse(x).getDate()}</b></button>`).join('');
  let body;
  if (isSunday(focus) && !posted.length) body = `<p class='muted'>Sunday is a rest day, so there are no gym snaps.</p>`;
  else body = `<div class='snapgrid'>${posted.map(u => { const d = day(u, focus); return `<button class='sg' data-act='snap' data-arg='${u}|${focus}' aria-label='${nameOf(u)}, ${short(focus)}'><img data-snap='${esc(d.snap_path)}' alt=''><span class='cap'><b>${nameOf(u)}</b>${clock(d.snap_at)}${d.snap_verified ? ', verified' : ''}</span></button>`; }).join('')}${missing.map(u => `<div class='sg none'>${avatar(S.profiles[u], u === S.uid ? 'you' : '')}<span><b>${nameOf(u)}</b>No snap</span></div>`).join('')}</div>`;
  return `<section class='card'><div class='cardhead'><h2>Daily snaps</h2><span class='pts'>${posted.length} of ${ids.length} posted</span></div><div class='daypills'>${pills}</div>${body}</section>`;
}

function viewLeague(id) {
  const l = S.leagues.find(x => x.id === id), mon = mondayOf(today()), ids = leagueMembers(id);
  const sorted = ids.slice().sort((a, b) => weekTotal(b, mon) - weekTotal(a, mon) || score(today(), day(b, today())) - score(today(), day(a, today())));
  const rows = sorted.map((u, i) => {
    const p = S.profiles[u], r = rankOf(u), me = u === S.uid;
    return `<button class='lb${me ? ' me' : ''}' data-act='${me ? 'go' : 'player'}' data-arg='${me ? 'dashboard' : u}'><span class='pos'>${i + 1}</span>${avatar(p, me ? 'you' : '')}<span class='nm'>${me ? 'You' : esc(p.name)}<small>${r.tier || 'Unranked'}, today ${score(today(), day(u, today()))} of 10</small></span><span class='wk'>${weekTotal(u, mon)}<small>of 70</small></span></button>`;
  }).join('');
  return `<button class='back' data-act='backLeagues'>&#8249; All leagues</button><div class='pagehead'><div><h1>${esc(l.name)}</h1><p>Week of ${short(mon)}, ${ids.length} member${ids.length === 1 ? '' : 's'}</p></div></div>
  <div class='grid two'><div class='stack'><section class='card'><h2>Leaderboard</h2><div class='list'>${rows}</div></section>${dailySnaps(sorted, mon)}</div>
  <div class='stack'><section class='card'><h2>Invite people</h2>${inviteBox(l.code)}<p class='muted small'>Members can see each other's points and snaps. Body measurements stay private.</p></section><button class='link danger' data-act='leaveLeague' data-arg='${id}'>${S.confirm === 'leave' + id ? 'Tap again to leave this league' : 'Leave league'}</button></div></div>`;
}

/* Another player's page */
function viewPlayer(uid) {
  const p = S.profiles[uid], mon = mondayOf(today()), r = rankOf(uid), weeks = weeksFor(uid, 12).filter(x => !x.current);
  const best = weeks.length ? Math.max(...weeks.map(x => x.score)) : null;
  return `<button class='back' data-act='backPlayer'>&#8249; Back</button>${rankPanel(uid)}
  <div class='stats'>${stat(weekTotal(uid, mon), 'This week', 'of 70')}${stat(score(today(), day(uid, today())), 'Today', 'of 10')}${stat(r.avg == null ? 'None' : r.avg, '4-week average', r.avg == null ? '' : 'of 70')}${stat(best == null ? 'None' : best, 'Best week', best == null ? '' : 'of 70')}</div>
  <div class='grid two'><div class='stack'><section class='card'><h2>Weekly scores</h2>${scoreChart(uid, 'var(--them)')}</section>${waistChart(uid, 'var(--them)')}</div>
  <div class='stack'><section class='card'><h2>This week by day</h2>${weekBars(uid, mon, today())}</section><section class='card'><h2>Snaps this week</h2>${snapStrip(snapsFor([uid], mon))}</section></div></div>`;
}
