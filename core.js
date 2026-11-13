const SUPABASE_URL = 'https://gbbzrccqkndbltgzgqrc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYnpyY2Nxa25kYmx0Z3pncXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMTE1ODUsImV4cCI6MjEwOTc4NzU4NX0.0Xj-OsYi5cT7rc8BzbncTNGPm1_jM_edUd9m4GwGwco';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const must = r => { if (r.error) throw r.error; return r.data; };
async function pageAll(build) {
  let out = [], from = 0;
  for (;;) {
    const rows = must(await build().range(from, from + 999));
    out = out.concat(rows);
    if (rows.length < 1000) return out;
    from += 1000;
  }
}

/* Dates */
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = s => { const [a, b, c] = s.split('-').map(Number); return new Date(a, b - 1, c, 12); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const mondayOf = s => addDays(s, -((parse(s).getDay() + 6) % 7));
const isSunday = s => parse(s).getDay() === 0;
const today = () => iso(new Date());
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const short = s => { const d = parse(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
const long = s => DAYS[parse(s).getDay()] + ', ' + short(s);
const clock = t => { const d = new Date(t); let h = d.getHours(); const ap = h < 12 ? 'am' : 'pm'; h = h % 12 || 12; return h + ':' + pad(d.getMinutes()) + ' ' + ap; };
const weekDates = m => Array.from({ length: 7 }, (_, i) => addDays(m, i));

/* Scoring */
const DIET = { perfect: 5, average: 3, cheat: 0 };
const CHEAT = { good: 5, some: 3, more: 0 };
function parts(date, d) {
  d = d || {};
  if (isSunday(date)) return [{ k: 'Cardio', n: 3, got: d.cardio ? 3 : 0 }, { k: 'Measure', n: 2, got: d.measured ? 2 : 0 }, { k: 'Diet', n: 5, got: CHEAT[d.cheat_meals] || 0 }];
  return [{ k: 'Gym', n: 3, got: d.snap_path ? 3 : 0 }, { k: 'Diet', n: 5, got: DIET[d.diet] || 0 }, { k: 'Steps', n: 2, got: d.steps_path ? 2 : 0 }];
}
const score = (date, d) => parts(date, d).reduce((a, p) => a + p.got, 0);
const TIERS = [{ n: 'Bronze', min: 0 }, { n: 'Silver', min: 35 }, { n: 'Gold', min: 49 }, { n: 'Elite', min: 60 }];
function tierFor(avg) { let t = TIERS[0]; TIERS.forEach(x => { if (avg >= x.min) t = x; }); return t; }

/* State */
const S = { uid: null, me: null, profiles: {}, days: {}, meas: {}, duel: null, opp: null, leagues: [], members: [], view: 'today', date: null, dayFocus: null, league: null, player: null, week: null, confirm: null, snapUrls: {}, details: null };
const day = (uid, date) => (S.days[uid] || {})[date];
const measOf = (uid, date) => (S.meas[uid] || {})[date];
const weekTotal = (uid, mon) => weekDates(mon).reduce((a, x) => a + score(x, day(uid, x)), 0);
const firstDate = uid => Object.keys(S.days[uid] || {}).sort()[0] || null;
function rankOf(uid) {
  const mon = mondayOf(today()), first = firstDate(uid), vals = [];
  if (first) for (let i = 1; i <= 4; i++) {
    const w = addDays(mon, -7 * i);
    if (addDays(w, 6) >= first) vals.push(weekTotal(uid, w));
  }
  if (!vals.length) return { tier: null, avg: null, next: null };
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), tier = tierFor(avg);
  const next = TIERS[TIERS.indexOf(tier) + 1] || null;
  return { tier: tier.n, avg, next, floor: tier.min };
}
function weeksFor(uid, n) {
  const mon = mondayOf(today()), out = [];
  for (let i = n - 1; i >= 0; i--) {
    const w = addDays(mon, -7 * i), dates = weekDates(w), m = measOf(uid, dates[6]);
    out.push({ w, has: dates.some(x => day(uid, x)), score: weekTotal(uid, w), waist: m && Number(m.waist) > 0 ? Number(m.waist) : null, current: w === mon });
  }
  const f = out.findIndex(x => x.has);
  return f < 0 ? [] : out.slice(f);
}
function pointsBreakdown(uid, mon) {
  const b = { Training: 0, Diet: 0, Steps: 0, Measurements: 0 };
  weekDates(mon).forEach(x => {
    const d = day(uid, x) || {};
    if (isSunday(x)) { b.Training += d.cardio ? 3 : 0; b.Measurements += d.measured ? 2 : 0; b.Diet += CHEAT[d.cheat_meals] || 0; }
    else { b.Training += d.snap_path ? 3 : 0; b.Diet += DIET[d.diet] || 0; b.Steps += d.steps_path ? 2 : 0; }
  });
  return b;
}

/* Backend */
const api = {
  async session() { const d = must(await sb.auth.getSession()); return d.session ? d.session.user.id : null; },
  async signIn(e, p) { return must(await sb.auth.signInWithPassword({ email: e, password: p })).user.id; },
  async signUp(e, p) { const d = must(await sb.auth.signUp({ email: e, password: p })); return d.session ? d.user.id : null; },
  async signOut() { await sb.auth.signOut(); },
  async createProfile(p) { must(await sb.from('profiles').insert(p)); },
  async saveProfile(p) { must(await sb.from('profiles').upsert(p)); },
  async saveDetails(r) { must(await sb.from('profile_details').upsert(r, { onConflict: 'user_id' })); },
  async rename(id, name) { must(await sb.from('profiles').update({ name }).eq('id', id)); },
  async saveDay(row) { must(await sb.from('days').upsert(row, { onConflict: 'user_id,date' })); },
  async saveMeas(row) { must(await sb.from('measurements').upsert(row, { onConflict: 'user_id,date' })); },
  async rpc(fn, args) { return must(await sb.rpc(fn, args || {})); },
  async uploadSnap(uid, date, blob) {
    const path = uid + '/' + date + '.jpg';
    must(await sb.storage.from('snaps').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '0' }));
    return path;
  },
  async uploadProof(uid, date, kind, blob) {
    const path = uid + '/' + date + (kind === 'steps' ? '-steps' : '') + '.jpg';
    must(await sb.storage.from('snaps').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '0' }));
    return path;
  },
  async snapUrl(path) { return must(await sb.storage.from('snaps').createSignedUrl(path, 3600)).signedUrl; }
};
async function load() {
  const from = addDays(mondayOf(today()), -84);
  const [profiles, duels, leagues, members, recent, mine, meas, details] = await Promise.all([
    pageAll(() => sb.from('profiles').select('*').order('created_at')),
    pageAll(() => sb.from('duels').select('*').order('created_at')),
    pageAll(() => sb.from('leagues').select('*').order('created_at')),
    pageAll(() => sb.from('league_members').select('*').order('joined_at')),
    pageAll(() => sb.from('days').select('*').gte('date', from).order('date')),
    pageAll(() => sb.from('days').select('*').eq('user_id', S.uid).order('date')),
    pageAll(() => sb.from('measurements').select('*').order('date')),
    pageAll(() => sb.from('profile_details').select('*').eq('user_id', S.uid))
  ]);
  S.profiles = {}; profiles.forEach(p => { S.profiles[p.id] = p; });
  S.me = S.profiles[S.uid] || null;
  S.details = details[0] || null;
  S.days = {}; recent.concat(mine).forEach(r => { (S.days[r.user_id] = S.days[r.user_id] || {})[r.date] = r; });
  S.meas = {}; meas.forEach(r => { (S.meas[r.user_id] = S.meas[r.user_id] || {})[r.date] = r; });
  S.duel = duels.find(d => !d.ended_at && (d.player_a === S.uid || d.player_b === S.uid)) || null;
  S.opp = null;
  if (S.duel && S.duel.player_b) S.opp = S.profiles[S.duel.player_a === S.uid ? S.duel.player_b : S.duel.player_a] || null;
  S.leagues = leagues; S.members = members;
  if (S.league && !leagues.find(l => l.id === S.league)) S.league = null;
}

/* League seasons */
function monthWeeks(key) {
  let d = mondayOf(key + '-01');
  if (d.slice(0, 7) !== key) d = addDays(d, 7);
  const out = [];
  while (d.slice(0, 7) === key) { out.push(d); d = addDays(d, 7); }
  return out;
}
function joinDate(lid, uid) {
  const m = S.members.find(x => x.league_id === lid && x.user_id === uid), t = m ? new Date(m.joined_at) : null;
  return t && !isNaN(t) ? iso(t) : '';
}
const leagueWeek = (lid, uid, mon) => { const j = joinDate(lid, uid); return weekDates(mon).reduce((a, x) => a + (x >= j ? score(x, day(uid, x)) : 0), 0); };

/* Duel weeks run in 7-day blocks from the day the duel started */
const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
function duelStart() { const t = S.duel ? new Date(S.duel.started_at || S.duel.created_at) : null; return t && !isNaN(t) ? iso(t) : today(); }
const duelWeekIndex = d => Math.floor(diffDays(d, duelStart()) / 7);
const duelWeekStart = () => addDays(duelStart(), 7 * Math.max(0, duelWeekIndex(today())));

/* League weeks run in 7-day blocks from the day the league was created */
function leagueStart(lid) { const l = S.leagues.find(x => x.id === lid), t = l ? new Date(l.created_at) : null; return t && !isNaN(t) ? iso(t) : today(); }
const leagueWeekIdx = (lid, d) => Math.floor(diffDays(d, leagueStart(lid)) / 7);
const leagueWeekStart = (lid, i) => addDays(leagueStart(lid), 7 * i);
