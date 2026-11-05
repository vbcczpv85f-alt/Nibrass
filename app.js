// Nibrass — suivi sport, nutrition (IA photo) et budget.
// Tout est stocké localement dans le navigateur (localStorage).

const STORE_KEY = 'nibrass.v1';
const APP_VERSION = '1.6 · calendrier de suivi';
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.5.0/+esm';

/* ------------------------------------------------------------------ */
/* Données de référence                                                */
/* ------------------------------------------------------------------ */

const SESSION_TYPES = {
  pec: {
    label: 'Haut du corps · Focus pecs', short: 'Focus pecs', emoji: '🏋️', color: '#ff7aa8', kind: 'strength',
    exercises: ['Développé couché', 'Développé incliné haltères', 'Écarté poulie vis-à-vis', 'Dips', 'Développé militaire', 'Élévations latérales', 'Extension triceps poulie'],
  },
  dosup: {
    label: 'Haut du corps · Focus dos', short: 'Focus dos', emoji: '🦅', color: '#6aa8ff', kind: 'strength',
    exercises: ['Tractions', 'Rowing barre', 'Tirage vertical prise serrée', 'Rowing haltère unilatéral', 'Développé incliné haltères', 'Face pull', 'Curl haltères'],
  },
  bras: {
    label: 'Séance bras', short: 'Bras', emoji: '💪', color: '#ffb35c', kind: 'strength',
    exercises: ['Curl barre EZ', 'Barre au front', 'Curl marteau', 'Extension triceps poulie corde', 'Curl incliné haltères', 'Dips entre bancs', 'Curl poulie basse'],
  },
  dos: {
    label: 'Séance dos', short: 'Dos', emoji: '🧗', color: '#b48cff', kind: 'strength',
    exercises: ['Soulevé de terre', 'Tractions lestées', 'Rowing barre', 'Tirage horizontal', 'Pull-over poulie', 'Shrugs', 'Extensions lombaires'],
  },
  cardio: {
    label: 'Séance cardio', short: 'Cardio', emoji: '🫀', color: '#ff5d5d', kind: 'cardio',
    activities: ['Course à pied', 'Tapis incliné', 'Vélo', 'Rameur', 'Elliptique', 'Corde à sauter', 'HIIT', 'Natation'],
  },
  hyrox: {
    label: 'Hyrox', short: 'Hyrox', emoji: '🏁', color: '#7cf29c', kind: 'hyrox',
    stations: [
      'Run 1 · 1 km', 'SkiErg · 1000 m',
      'Run 2 · 1 km', 'Sled Push · 50 m',
      'Run 3 · 1 km', 'Sled Pull · 50 m',
      'Run 4 · 1 km', 'Burpee Broad Jumps · 80 m',
      'Run 5 · 1 km', 'Rameur · 1000 m',
      'Run 6 · 1 km', 'Farmers Carry · 200 m',
      'Run 7 · 1 km', 'Sandbag Lunges · 100 m',
      'Run 8 · 1 km', 'Wall Balls · 100 reps',
    ],
  },
};

const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Collation', 'Dîner'];

const INCOME_TYPES = [
  { id: 'salaire', label: 'Salaire', emoji: '💼' },
  { id: 'prime', label: 'Prime / bonus', emoji: '🎯' },
  { id: 'freelance', label: 'Freelance / missions', emoji: '🧑‍💻' },
  { id: 'vente', label: 'Ventes (Vinted, LBC…)', emoji: '📦' },
  { id: 'aides', label: 'Aides (CAF, APL…)', emoji: '🏛️' },
  { id: 'rembours', label: 'Remboursements', emoji: '↩️' },
  { id: 'cadeau', label: 'Cadeaux', emoji: '🎁' },
  { id: 'invest', label: 'Placements / intérêts', emoji: '📈' },
  { id: 'autre', label: 'Autres revenus', emoji: '➕' },
];

const EXPENSE_CATS = [
  { id: 'essence', label: 'Essence', emoji: '⛽', color: '#ffb35c' },
  { id: 'fastfood', label: 'Restauration rapide', emoji: '🍔', color: '#ff7aa8' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️', color: '#b48cff' },
  { id: 'plaisir', label: 'Dépenses plaisir', emoji: '🎉', color: '#6aa8ff' },
  { id: 'redbull', label: 'Red Bull', emoji: '🥫', color: '#ff5d5d' },
  { id: 'courses', label: 'Courses', emoji: '🛒', color: '#7cf29c' },
  { id: 'fixes', label: 'Charges fixes', emoji: '🏠', color: '#9aa1ad' },
  { id: 'autre', label: 'Autres', emoji: '🧾', color: '#c9cdd4' },
];

const AI_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (le plus précis)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (équilibré)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (rapide, économique)' },
];

/* ------------------------------------------------------------------ */
/* État                                                                */
/* ------------------------------------------------------------------ */

const defaultState = () => ({
  workouts: [],
  templates: Object.fromEntries(Object.entries(SESSION_TYPES).filter(([, t]) => t.kind === 'strength').map(([k, t]) => [k, [...t.exercises]])),
  meals: [],
  water: {},
  goals: { kcal: 2500, protein: 160, carbs: 280, fat: 75, fiber: 30, water: 2500 },
  profile: { sex: 'h', age: 25, weight: 75, height: 178, activity: 1.55, goal: 'maintien' },
  incomes: [],
  expenses: [],
  redbull: { price: 1.9, weeklyLimit: 3, startDate: todayISO() },
  exSettings: {},
  weights: [],
  creatine: { dose: 10, logs: {} },
  proteinFavs: [],
  checks: {},
  checkPrefs: { trainingPerWeek: 4 },
  restPrefs: { compound: 150, isolation: 90, auto: true, sound: true },
  settings: { apiKey: '', model: 'claude-opus-5-5' },
});

let state = load();
let currentTab = 'suivi';
let ui = { nutDate: todayISO(), budgetMonth: todayISO().slice(0, 7), budgetTab: 'depenses', sportTab: 'seances', nutTab: 'journal', weightRange: '90', suiviMonth: todayISO().slice(0, 7), suiviFilter: 'all' };

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const d = defaultState();
    const s = JSON.parse(raw);
    return { ...d, ...s, goals: { ...d.goals, ...s.goals }, profile: { ...d.profile, ...s.profile }, redbull: { ...d.redbull, ...s.redbull }, restPrefs: { ...d.restPrefs, ...s.restPrefs }, checkPrefs: { ...d.checkPrefs, ...s.checkPrefs }, creatine: { ...d.creatine, ...s.creatine, logs: { ...(s.creatine || {}).logs } }, exSettings: { ...s.exSettings }, settings: { ...d.settings, ...s.settings }, templates: { ...d.templates, ...s.templates } };
  } catch {
    return defaultState();
  }
}
function save() {
  _trackStart = null;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Stockage plein : supprime d’anciennes photos ou exporte tes données.'); }
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayISO() { return toISO(new Date()); }
function toISO(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(iso, n) { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function num(v) { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; }
function r0(n) { return Math.round(n); }
function r1(n) { return Math.round(n * 10) / 10; }
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
function money(n) { return eur.format(n || 0); }
function fmtDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) { return parseISO(iso).toLocaleDateString('fr-FR', opts); }
function fmtMonth(ym) { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
function shiftMonth(ym, n) { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function startOfWeek(iso) { const d = parseISO(iso); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return toISO(d); }
function secToClock(s) { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); }
function clockToSec(str) {
  if (!str) return 0;
  const parts = String(str).trim().split(':').map(p => num(p));
  if (parts.length === 1) return parts[0] * 60; // minutes seules
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

const TITLES = { suivi: 'Suivi', sport: 'Sport', nutrition: 'Nutrition', proteines: 'Protéines', budget: 'Budget', settings: 'Réglages' };

$$('.tabbar button').forEach(b => b.addEventListener('click', () => {
  currentTab = b.dataset.tab;
  $$('.tabbar button').forEach(x => x.classList.toggle('active', x === b));
  render();
  window.scrollTo({ top: 0 });
}));

function render() {
  $('#page-title').textContent = TITLES[currentTab];
  $('#top-actions').innerHTML = '';
  const v = $('#view');
  if (currentTab === 'suivi') renderSuivi(v);
  else if (currentTab === 'sport') renderSport(v);
  else if (currentTab === 'nutrition') renderNutrition(v);
  else if (currentTab === 'proteines') renderProtein(v);
  else if (currentTab === 'budget') renderBudget(v);
  else renderSettings(v);
}

/* Bottom sheet */
let sheetOnClose = null;
function openSheet(title, html, onClose) {
  const s = $('#sheet');
  s.innerHTML = `<div class="sheet-head"><h2>${title}</h2><button class="icon-btn" data-close>✕</button></div>${html}`;
  s.classList.remove('hidden'); $('#sheet-backdrop').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  sheetOnClose = onClose || null;
  $('[data-close]', s).addEventListener('click', closeSheet);
  s.scrollTop = 0;
  return s;
}
function closeSheet() {
  $('#sheet').classList.add('hidden'); $('#sheet-backdrop').classList.add('hidden');
  document.body.style.overflow = '';
  const cb = sheetOnClose; sheetOnClose = null;
  if (cb) cb();
}
$('#sheet-backdrop').addEventListener('click', closeSheet);

/* ================================================================== */
/* SUIVI : calendrier de régularité                                    */
/* ================================================================== */

const CHECK_ITEMS = [
  { k: 'training', label: 'Entraînement', emoji: '🏋️' },
  { k: 'creatine', label: 'Créatine', emoji: '💊' },
  { k: 'dietLogged', label: 'Diète notée', emoji: '📝' },
  { k: 'dietOk', label: 'Diète respectée', emoji: '🥗' },
  { k: 'noRedbull', label: 'Sans Red Bull', emoji: '🥫' },
];

// Premier jour suivi : avant, les cases restent vides (pas de croix rouge injuste).
let _trackStart = null;
function trackStart() {
  if (_trackStart) return _trackStart;
  const dates = [
    ...state.workouts.map(w => w.date), ...state.meals.map(m => m.date), ...state.expenses.map(e => e.date),
    ...state.weights.map(w => w.date), ...Object.keys(state.creatine.logs), ...Object.keys(state.checks),
    state.trackStart || todayISO(),
  ].filter(Boolean).sort();
  state.trackStart = dates[0] < todayISO() ? dates[0] : todayISO();
  _trackStart = state.trackStart;
  return _trackStart;
}

function dietRespected(d) {
  const t = dayTotals(d), g = state.goals;
  return t.kcal >= g.kcal * 0.85 && t.kcal <= g.kcal * 1.1 && t.protein >= g.protein * 0.9;
}

function autoStatus(k, d) {
  const past = d < todayISO();
  switch (k) {
    case 'training': return state.workouts.some(w => w.date === d) ? 'ok' : null;
    case 'creatine': return (state.creatine.logs[d] || 0) >= state.creatine.dose ? 'ok' : null;
    case 'dietLogged': return state.meals.some(m => m.date === d) ? 'ok' : null;
    case 'dietOk':
      if (!state.meals.some(m => m.date === d)) return null;
      return dietRespected(d) ? 'ok' : (past ? 'ko' : null); // aujourd'hui : la journée n'est pas finie
    case 'noRedbull':
      if (state.expenses.some(e => e.cat === 'redbull' && e.date === d)) return 'ko';
      return past ? 'ok' : null;
  }
  return null;
}

// Statut final : choix manuel > automatique > rouge si la journée est passée.
function checkStatus(k, d) {
  if (d > todayISO() || d < trackStart()) return { s: null };
  const man = (state.checks[d] || {})[k];
  if (man) return { s: man, manual: true };
  const a = autoStatus(k, d);
  if (a) return { s: a, auto: true };
  if (d < todayISO()) return { s: 'ko', missing: true };
  return { s: null };
}

function setCheck(k, d, value) {
  if (k === 'creatine') {
    // la créatine reste synchronisée avec l'onglet Créatine
    if (value === 'ok') state.creatine.logs[d] = state.creatine.dose;
    else delete state.creatine.logs[d];
    if (state.checks[d]) delete state.checks[d].creatine;
  } else {
    state.checks[d] = state.checks[d] || {};
    if (value) state.checks[d][k] = value; else delete state.checks[d][k];
    if (!Object.keys(state.checks[d]).length) delete state.checks[d];
  }
  if (d < trackStart()) state.trackStart = d;
  save();
}

function dayScore(d) {
  let ok = 0, n = 0;
  for (const it of CHECK_ITEMS) {
    const { s } = checkStatus(it.k, d);
    if (!s || s === 'rest') continue;
    n++; if (s === 'ok') ok++;
  }
  return { ok, n };
}

const MARK = { ok: '<span class="mk ok">✓</span>', ko: '<span class="mk ko">✗</span>', rest: '<span class="mk rest">😴</span>' };

function renderSuivi(v) {
  const ym = ui.suiviMonth;
  const [y, m] = ym.split('-').map(Number);
  const first = `${ym}-01`;
  const nDays = new Date(y, m, 0).getDate();
  const days = Array.from({ length: nDays }, (_, i) => addDays(first, i));
  const today = todayISO();
  const filter = ui.suiviFilter;
  const counted = days.filter(d => d <= today && d >= trackStart());

  // statistiques du mois
  const stats = CHECK_ITEMS.map(it => {
    let ok = 0, n = 0;
    for (const d of counted) { const { s } = checkStatus(it.k, d); if (!s || s === 'rest') continue; n++; if (s === 'ok') ok++; }
    return { ...it, ok, n, pct: n ? ok / n * 100 : 0 };
  });
  const sessions = state.workouts.filter(w => w.date.startsWith(ym)).length;
  const trainDays = counted.filter(d => checkStatus('training', d).s === 'ok').length;
  const elapsed = counted.length;
  const target = Math.round(state.checkPrefs.trainingPerWeek * (ym === today.slice(0, 7) ? elapsed : nDays) / 7);
  const global = stats.reduce((a, s) => a + s.ok, 0) / (stats.reduce((a, s) => a + s.n, 0) || 1) * 100;
  const todayScore = dayScore(today);

  // série de journées parfaites (toutes les cases vertes)
  let perfect = 0; for (let d = addDays(today, -1); d >= trackStart(); d = addDays(d, -1)) { const sc = dayScore(d); if (sc.n && sc.ok === sc.n) perfect++; else break; }

  v.innerHTML = `
    ${ym === today.slice(0, 7) ? `<div class="card">
      <div class="row between"><h3 style="margin:0">Aujourd’hui</h3><span class="muted small">${todayScore.ok}/${CHECK_ITEMS.length} validés</span></div>
      <div class="today-checks">${CHECK_ITEMS.map(it => {
        const st = checkStatus(it.k, today);
        return `<button class="tcheck ${st.s || ''}" data-today="${it.k}"><span>${it.emoji}</span><small>${it.label}</small>${st.s ? MARK[st.s] : '<span class="mk none">○</span>'}</button>`;
      }).join('')}</div>
      <p class="muted small" style="margin:8px 0 0">Touche une case pour cocher ✓ / ✗. Ce qui est déjà enregistré (séance, créatine, repas) se coche tout seul.</p>
    </div>` : ''}

    <div class="datenav" style="margin-top:6px">
      <button class="btn sm" id="sm-prev">‹</button><b>${fmtMonth(ym)}</b><button class="btn sm" id="sm-next" ${ym >= today.slice(0, 7) ? 'disabled' : ''}>›</button>
    </div>

    <div class="chips" style="margin-bottom:10px">
      <button class="chip ${filter === 'all' ? 'active' : ''}" data-f="all">Tout</button>
      ${CHECK_ITEMS.map(it => `<button class="chip ${filter === it.k ? 'active' : ''}" data-f="${it.k}">${it.emoji} ${it.label}</button>`).join('')}
    </div>

    <div class="card">
      <div class="cal">
        ${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(l => `<span class="cal-h">${l}</span>`).join('')}
        ${Array.from({ length: (parseISO(first).getDay() + 6) % 7 }, () => '<span></span>').join('')}
        ${days.map(d => {
          const n = parseISO(d).getDate();
          if (filter !== 'all') {
            const { s } = checkStatus(filter, d);
            return `<button class="cal-cell ${s || 'empty'} ${d === today ? 'today' : ''}" data-day="${d}"><small>${n}</small>${s ? MARK[s] : ''}</button>`;
          }
          const sc = dayScore(d);
          const cls = !sc.n ? 'empty' : sc.ok === sc.n ? 'ok' : sc.ok === 0 ? 'ko' : 'mid';
          return `<button class="cal-cell all ${cls} ${d === today ? 'today' : ''}" data-day="${d}"><small>${n}</small>
            ${sc.n ? `<span class="dots">${CHECK_ITEMS.map(it => { const s = checkStatus(it.k, d).s; return `<i class="${s || 'none'}"></i>`; }).join('')}</span>` : ''}</button>`;
        }).join('')}
      </div>
      <div class="row small muted" style="gap:12px;margin-top:10px;flex-wrap:wrap">
        <span><span class="mk ok">✓</span> fait</span><span><span class="mk ko">✗</span> pas fait</span><span>😴 repos</span>
        ${filter === 'all' ? '<span>· points = Entraînement, Créatine, Diète notée, Diète respectée, Sans Red Bull</span>' : ''}
      </div>
    </div>

    <h2>Bilan du mois</h2>
    <div class="stats">
      <div class="stat"><div class="v" style="color:${global >= 80 ? 'var(--accent)' : global >= 50 ? 'var(--orange)' : 'var(--red)'}">${counted.length ? r0(global) + ' %' : '—'}</div><div class="l">régularité globale</div></div>
      <div class="stat"><div class="v">${sessions}<span class="muted" style="font-size:13px"> / ${target}</span></div><div class="l">séances / objectif</div></div>
      <div class="stat"><div class="v">${perfect}</div><div class="l">jours parfaits d’affilée</div></div>
    </div>
    <div class="card" style="margin-top:12px">
      ${stats.map(s => {
        const extra = s.k === 'training' ? `${trainDays} jours entraînés · ${sessions} séance${sessions > 1 ? 's' : ''}` : `${s.ok}/${s.n} jours`;
        const pct = s.k === 'training' ? (target ? Math.min(100, sessions / target * 100) : 0) : s.pct;
        return `<div class="macro"><div class="row between"><span>${s.emoji} ${s.label}</span><span class="muted">${extra} · <b style="color:var(--text)">${r0(pct)} %</b></span></div>
          <div class="bar" style="--c:${pct >= 80 ? 'var(--accent)' : pct >= 50 ? 'var(--orange)' : 'var(--red)'}"><i style="width:${pct}%"></i></div></div>`;
      }).join('')}
    </div>

    <div class="card">
      <b>Réglages du suivi</b>
      <label class="field" style="margin-top:8px"><span>Objectif d’entraînements par semaine</span>
        <select id="sp-train">${[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(n => `<option ${n === state.checkPrefs.trainingPerWeek ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <p class="muted small" style="margin:0">« Diète respectée » se coche toute seule si tes calories sont entre −15 % et +10 % de l’objectif et tes protéines à 90 % ou plus. Tu peux toujours corriger à la main.
      Pour un jour de repos prévu, mets 😴 dans Entraînement : il ne compte pas comme raté.</p>
    </div>`;

  $('#sm-prev', v).addEventListener('click', () => { ui.suiviMonth = shiftMonth(ym, -1); renderSuivi(v); });
  $('#sm-next', v).addEventListener('click', () => { if (ym < today.slice(0, 7)) { ui.suiviMonth = shiftMonth(ym, 1); renderSuivi(v); } });
  $$('[data-f]', v).forEach(b => b.addEventListener('click', () => { ui.suiviFilter = b.dataset.f; renderSuivi(v); }));
  $$('[data-day]', v).forEach(b => b.addEventListener('click', () => {
    const d = b.dataset.day;
    if (d > today) return toast('Ce jour n’est pas encore passé 🙂');
    openDayChecks(d, () => renderSuivi(v));
  }));
  $$('[data-today]', v).forEach(b => b.addEventListener('click', () => {
    // cycle rapide : vide → ✓ → ✗ → (repos pour l'entraînement) → automatique
    const k = b.dataset.today; const cur = checkStatus(k, today);
    const order = k === 'training' ? ['ok', 'ko', 'rest', null] : ['ok', 'ko', null];
    const now = cur.manual || cur.auto ? cur.s : null;
    const next = order[(order.indexOf(now) + 1) % order.length];
    setCheck(k, today, next); renderSuivi(v);
  }));
  $('#sp-train', v).addEventListener('change', e => { state.checkPrefs.trainingPerWeek = +e.target.value; save(); renderSuivi(v); });
}

function openDayChecks(d, onDone) {
  const draw = () => {
    const s = openSheet(`📅 ${fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}`, `
      ${CHECK_ITEMS.map(it => {
        const st = checkStatus(it.k, d);
        const a = autoStatus(it.k, d);
        const info = st.manual ? 'coché à la main' : st.auto ? 'automatique' : st.missing ? 'rien d’enregistré' : '';
        return `<div class="card tight">
          <div class="row between"><b>${it.emoji} ${it.label}</b><span class="muted small">${info}</span></div>
          <div class="row" style="margin-top:8px">
            <button class="btn sm grow choice ${st.s === 'ok' ? 'sel-ok' : ''}" data-k="${it.k}" data-v="ok">✓ Fait</button>
            <button class="btn sm grow choice ${st.s === 'ko' ? 'sel-ko' : ''}" data-k="${it.k}" data-v="ko">✗ Pas fait</button>
            ${it.k === 'training' ? `<button class="btn sm grow choice ${st.s === 'rest' ? 'sel-rest' : ''}" data-k="${it.k}" data-v="rest">😴 Repos</button>` : ''}
            ${st.manual ? `<button class="btn sm ghost" data-k="${it.k}" data-v="">Auto${a ? ' (' + (a === 'ok' ? '✓' : '✗') + ')' : ''}</button>` : ''}
          </div></div>`;
      }).join('')}
      <button class="btn primary block" data-close2>Terminé</button>`, onDone);
    $$('[data-k]', s).forEach(b => b.addEventListener('click', () => { setCheck(b.dataset.k, d, b.dataset.v || null); draw(); }));
    $('[data-close2]', s).addEventListener('click', closeSheet);
  };
  draw();
}

/* ================================================================== */
/* SPORT                                                               */
/* ================================================================== */

function workoutVolume(w) {
  return (w.exercises || []).reduce((a, e) => a + e.sets.reduce((b, s) => b + num(s.w) * num(s.r), 0), 0);
}

function renderSport(v) {
  const week = startOfWeek(todayISO());
  const thisWeek = state.workouts.filter(w => w.date >= week);
  const month = todayISO().slice(0, 7);
  const thisMonth = state.workouts.filter(w => w.date.startsWith(month));
  const streak = weekStreak();
  const tabs = [['seances', 'Séances'], ['progression', 'Progression'], ['pauses', 'Pauses'], ['historique', 'Historique']];

  v.innerHTML = `
    <div class="seg">${tabs.map(([k, l]) => `<button data-st="${k}" class="${ui.sportTab === k ? 'active' : ''}">${l}</button>`).join('')}</div>
    <div id="sport-body"></div>`;
  $$('[data-st]', v).forEach(b => b.addEventListener('click', () => { ui.sportTab = b.dataset.st; renderSport(v); }));
  const body = $('#sport-body', v);

  if (ui.sportTab === 'seances') {
    body.innerHTML = `
      <div class="stats">
        <div class="stat"><div class="v">${thisWeek.length}</div><div class="l">séances cette semaine</div></div>
        <div class="stat"><div class="v">${thisMonth.length}</div><div class="l">ce mois-ci</div></div>
        <div class="stat"><div class="v">${streak}</div><div class="l">semaines d’affilée</div></div>
      </div>
      <h2>Démarrer une séance</h2>
      <div class="session-grid">
        ${Object.entries(SESSION_TYPES).map(([k, t]) => {
          const last = state.workouts.filter(w => w.type === k).sort((a, b) => b.date.localeCompare(a.date))[0];
          return `<button class="session-card" style="--c:${t.color}" data-start="${k}">
            <span class="emoji">${t.emoji}</span>
            <span><b>${t.label}</b><br><span class="muted">${last ? 'Dernière : ' + fmtDate(last.date) : 'Jamais faite'}</span></span>
          </button>`;
        }).join('')}
      </div>
      <h2>Cette semaine</h2>
      ${weekStrip()}
    `;
    $$('[data-start]', body).forEach(b => b.addEventListener('click', () => openWorkout(b.dataset.start)));
  } else if (ui.sportTab === 'historique') {
    const list = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    body.innerHTML = list.length ? `<div class="card list">${list.map(w => {
      const t = SESSION_TYPES[w.type];
      let detail = '';
      if (t.kind === 'strength') detail = `${w.exercises.length} exos · ${w.exercises.reduce((a, e) => a + e.sets.length, 0)} séries · ${r0(workoutVolume(w)).toLocaleString('fr-FR')} kg`;
      if (t.kind === 'cardio') detail = `${w.cardio.activity} · ${w.cardio.minutes || 0} min${w.cardio.distance ? ' · ' + w.cardio.distance + ' km' : ''}`;
      if (t.kind === 'hyrox') detail = `Temps total ${secToClock(w.hyrox.total)} · ${w.hyrox.division || ''}`;
      return `<div class="list-item" data-w="${w.id}">
        <div class="ico" style="background:${t.color}22">${t.emoji}</div>
        <div class="grow"><b>${t.label}</b><div class="muted small">${fmtDate(w.date, { weekday: 'long', day: 'numeric', month: 'long' })}${w.duration ? ' · ' + secToClock(w.duration) : ''}</div><div class="small">${detail}</div></div>
        <span class="muted">›</span></div>`;
    }).join('')}</div>` : `<div class="card empty">Aucune séance enregistrée pour l’instant.<br>Lance ta première séance 💪</div>`;
    $$('[data-w]', body).forEach(el => el.addEventListener('click', () => openWorkout(null, el.dataset.w)));
  } else if (ui.sportTab === 'progression') {
    renderProgression(body);
  } else {
    renderPauses(body);
  }
}

function weekStreak() {
  let n = 0; let wk = startOfWeek(todayISO());
  const has = w0 => state.workouts.some(w => w.date >= w0 && w.date < addDays(w0, 7));
  if (!has(wk)) wk = addDays(wk, -7); // la semaine en cours ne casse pas la série
  while (has(wk)) { n++; wk = addDays(wk, -7); }
  return n;
}

function weekStrip() {
  const ws = startOfWeek(todayISO());
  return `<div class="card"><div class="grid3" style="grid-template-columns:repeat(7,1fr);gap:6px;text-align:center">
    ${Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i);
      const ws2 = state.workouts.filter(w => w.date === d);
      return `<div><div class="muted small">${fmtDate(d, { weekday: 'narrow' })}</div>
        <div style="margin-top:6px;height:34px;border-radius:10px;display:grid;place-items:center;background:${ws2.length ? SESSION_TYPES[ws2[0].type].color + '33' : 'var(--card2)'};${d === todayISO() ? 'outline:1px solid var(--accent)' : ''}">${ws2.map(w => SESSION_TYPES[w.type].emoji).join('') || '<span class="muted small">' + parseISO(d).getDate() + '</span>'}</div></div>`;
    }).join('')}
  </div></div>`;
}

/* ---------------- Surcharge progressive ---------------- */

const COMPOUND_RE = /(développé|soulevé|squat|rowing barre|traction|dips|militaire|presse|hip thrust|fente)/i;
const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300];

function isCompound(name) { return COMPOUND_RE.test(name); }
function fmtKg(n) { return (Math.round(n * 100) / 100).toLocaleString('fr-FR'); }

// Réglages d'un exercice : pause, fourchette de reps, palier de charge.
function exCfg(name) {
  const c = isCompound(name);
  return { rest: c ? state.restPrefs.compound : state.restPrefs.isolation, repMin: c ? 6 : 10, repMax: c ? 10 : 15, inc: c ? 2.5 : 1, ...(state.exSettings[name] || {}) };
}

// Score d'une série : 1RM estimé (Epley) si chargée, sinon nombre de reps (poids du corps).
function setScore(s) { const w = num(s.w), r = num(s.r); if (!r) return 0; return w > 0 ? w * (1 + r / 30) : r; }

function exHistory(name, excludeId) {
  return state.workouts
    .filter(w => w.id !== excludeId && w.exercises && w.exercises.some(e => e.name === name))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map(w => {
      const sets = w.exercises.filter(e => e.name === name).flatMap(e => e.sets).filter(s => num(s.r) > 0);
      if (!sets.length) return null;
      const best = sets.reduce((a, s) => setScore(s) > setScore(a) ? s : a, sets[0]);
      const loaded = sets.some(s => num(s.w) > 0);
      return {
        id: w.id, date: w.date, sets, best, loaded,
        score: setScore(best),
        volume: sets.reduce((a, s) => a + num(s.w) * num(s.r), 0),
        reps: sets.reduce((a, s) => a + num(s.r), 0),
      };
    }).filter(Boolean);
}

function progressStatus(hist) {
  if (!hist.length) return { k: 'none', label: 'Pas encore fait', cls: '' };
  if (hist.length === 1) return { k: 'new', label: '🆕 1ʳᵉ séance', cls: '' };
  let maxI = 0;
  hist.forEach((h, i) => { if (h.score > hist[maxI].score) maxI = i; });
  const since = hist.length - 1 - maxI;
  const last = hist[hist.length - 1], prev = hist[hist.length - 2];
  if (since === 0 && last.score > prev.score) return { k: 'up', label: '📈 Record', cls: 'good', since };
  if (since >= 3) return { k: 'stuck', label: `⏸️ Stagnation (${since} séances)`, cls: 'warn', since };
  if (last.score < prev.score * 0.97) return { k: 'down', label: '📉 En baisse', cls: 'bad', since };
  return { k: 'stable', label: '➖ Stable', cls: '', since };
}

// Double progression : on monte les reps jusqu'au haut de la fourchette, puis la charge.
function nextTarget(name, sets) {
  const cfg = exCfg(name);
  const valid = (sets || []).filter(s => num(s.r) > 0);
  if (!valid.length) return null;
  const topW = Math.max(...valid.map(s => num(s.w)));
  const minR = Math.min(...valid.filter(s => num(s.w) === topW).map(s => num(s.r)));
  if (topW === 0) {
    return { w: '', r: minR + 1, up: false, text: `Vise ${minR + 1} reps par série${minR + 1 > cfg.repMax ? ' — ou ajoute du lest' : ''}` };
  }
  if (minR >= cfg.repMax) {
    const nw = Math.round((topW + cfg.inc) * 100) / 100;
    return { w: nw, r: cfg.repMin, up: true, text: `Monte à ${fmtKg(nw)} kg × ${cfg.repMin} reps (tu as validé ${cfg.repMax} reps à ${fmtKg(topW)} kg)` };
  }
  const tr = Math.min(cfg.repMax, minR + 1);
  return { w: topW, r: tr, up: false, text: `Garde ${fmtKg(topW)} kg et vise ${tr} reps sur chaque série (objectif ${cfg.repMax} avant d’ajouter ${fmtKg(cfg.inc)} kg)` };
}

function sparkline(values, color = 'var(--accent)', h = 36) {
  if (values.length < 2) return '';
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1) * 100).toFixed(2)},${(h - 3 - (v - min) / span * (h - 6)).toFixed(2)}`).join(' ');
  return `<svg viewBox="0 0 100 ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}

function allExerciseNames() {
  const set = new Set();
  for (const w of state.workouts) for (const e of (w.exercises || [])) if (e.name) set.add(e.name);
  for (const k of Object.keys(state.templates)) for (const n of state.templates[k]) set.add(n);
  return [...set];
}

function renderProgression(body) {
  const hy = state.workouts.filter(w => w.type === 'hyrox' && w.hyrox.total > 0 && w.hyrox.full).sort((a, b) => a.hyrox.total - b.hyrox.total)[0];
  const longest = state.workouts.filter(w => w.type === 'cardio' && num(w.cardio.distance) > 0).sort((a, b) => num(b.cardio.distance) - num(a.cardio.distance))[0];
  const rows = allExerciseNames().map(n => ({ n, hist: exHistory(n) })).filter(x => x.hist.length)
    .sort((a, b) => b.hist[b.hist.length - 1].date.localeCompare(a.hist[a.hist.length - 1].date));
  const stuck = rows.filter(x => progressStatus(x.hist).k === 'stuck').length;
  const ups = rows.filter(x => progressStatus(x.hist).k === 'up').length;

  body.innerHTML = `
    <div class="stats">
      <div class="stat"><div class="v" style="color:var(--accent)">${ups}</div><div class="l">exos en record</div></div>
      <div class="stat"><div class="v" style="color:var(--orange)">${stuck}</div><div class="l">en stagnation</div></div>
      <div class="stat"><div class="v">${rows.length}</div><div class="l">exos suivis</div></div>
    </div>
    <div class="card small muted" style="margin-top:12px">
      <b style="color:var(--text)">Comment ça marche :</b> double progression. Pour chaque exercice tu as une fourchette de reps (ex. 8–12).
      Tant que tu n’atteins pas le haut de la fourchette sur toutes tes séries, tu gardes la charge et tu ajoutes des reps.
      Quand c’est validé, tu montes la charge d’un palier. L’objectif du jour s’affiche directement pendant ta séance.
    </div>
    <h2>Musculation</h2>
    ${rows.length ? rows.map(({ n, hist }) => {
      const st = progressStatus(hist);
      const last = hist[hist.length - 1];
      const tgt = nextTarget(n, last.sets);
      const best = hist.reduce((a, h) => h.score > a.score ? h : a, hist[0]);
      const first = hist[0];
      const gain = first.score ? (last.score - first.score) / first.score * 100 : 0;
      return `<div class="card" data-ex="${esc(n)}" style="cursor:pointer">
        <div class="row between"><b class="grow">${esc(n)}</b><span class="pill ${st.cls}">${st.label}</span></div>
        <div class="row between small muted" style="margin:6px 0">
          <span>Dernière : <b style="color:var(--text)">${last.best.w ? fmtKg(num(last.best.w)) + ' kg' : 'PDC'} × ${last.best.r}</b></span>
          <span>${last.loaded ? `1RM est. ${r0(last.score)} kg` : `${r0(last.score)} reps max`}${hist.length > 1 ? ` · <span style="color:${gain >= 0 ? 'var(--accent)' : 'var(--red)'}">${gain >= 0 ? '+' : ''}${r0(gain)} %</span>` : ''}</span>
        </div>
        ${sparkline(hist.map(h => h.score))}
        ${tgt ? `<div class="target small">🎯 Prochaine séance : ${esc(tgt.text)}</div>` : ''}
        <div class="muted small" style="margin-top:4px">Record : ${best.best.w ? fmtKg(num(best.best.w)) + ' kg' : 'PDC'} × ${best.best.r} (${fmtDate(best.date)}) · ${hist.length} séance${hist.length > 1 ? 's' : ''}</div>
      </div>`;
    }).join('') : '<div class="card empty">Ta progression apparaîtra après tes premières séances de muscu.</div>'}
    <h2>Cardio & Hyrox</h2>
    <div class="grid2">
      <div class="stat"><div class="l">Meilleur Hyrox complet</div><div class="v">${hy ? secToClock(hy.hyrox.total) : '—'}</div></div>
      <div class="stat"><div class="l">Plus longue sortie cardio</div><div class="v">${longest ? longest.cardio.distance + ' km' : '—'}</div></div>
    </div>`;
  $$('[data-ex]', body).forEach(el => el.addEventListener('click', () => openExercise(el.dataset.ex, () => renderProgression(body))));
}

function restSelect(id, value) {
  const opts = REST_OPTIONS.includes(+value) ? REST_OPTIONS : [...REST_OPTIONS, +value].sort((a, b) => a - b);
  return `<select id="${id}">${opts.map(s => `<option value="${s}" ${+value === s ? 'selected' : ''}>${secToClock(s)}</option>`).join('')}</select>`;
}

function openExercise(name, onDone) {
  const hist = exHistory(name);
  const cfg = exCfg(name);
  const st = progressStatus(hist);
  const last = hist[hist.length - 1];
  const tgt = last ? nextTarget(name, last.sets) : null;
  const vals = hist.map(h => h.score);
  const s = openSheet(`📈 ${esc(name)}`, `
    <div class="row between" style="margin-bottom:10px"><span class="pill ${st.cls}">${st.label}</span><span class="muted small">${hist.length} séance${hist.length > 1 ? 's' : ''}</span></div>
    ${vals.length > 1 ? `<div class="card"><div class="muted small" style="margin-bottom:6px">${last.loaded ? '1RM estimé (kg)' : 'Reps max'} · de ${r0(Math.min(...vals))} à ${r0(Math.max(...vals))}</div>${sparkline(vals, 'var(--accent)', 90)}</div>` : ''}
    ${tgt ? `<div class="target">🎯 <b>Prochaine séance</b><br>${esc(tgt.text)}</div>` : ''}
    ${st.k === 'stuck' ? `<div class="card small" style="border-color:var(--orange)"><b>Conseils anti-stagnation</b><ul style="margin:6px 0 0;padding-left:18px">
      <li>Vérifie ton sommeil et tes protéines (onglet Nutrition).</li>
      <li>Fais une semaine plus légère (−10 % de charge) puis repars.</li>
      <li>Change la fourchette de reps (ex. 6–8 au lieu de 8–12) ou une variante de l’exercice.</li>
      <li>Allonge un peu la pause entre les séries.</li></ul></div>` : ''}
    <div class="card">
      <h3>Réglages de l’exercice</h3>
      <div class="grid2">
        <label class="field"><span>Reps min</span><input id="x-min" inputmode="numeric" value="${cfg.repMin}"></label>
        <label class="field"><span>Reps max</span><input id="x-max" inputmode="numeric" value="${cfg.repMax}"></label>
        <label class="field"><span>Palier de charge (kg)</span><input id="x-inc" inputmode="decimal" value="${String(cfg.inc).replace('.', ',')}"></label>
        <label class="field"><span>Pause entre séries</span>${restSelect('x-rest', cfg.rest)}</label>
      </div>
      <button class="btn primary block" id="x-save">Enregistrer</button>
    </div>
    <h3>Historique</h3>
    ${hist.length ? `<div class="card list">${[...hist].reverse().map(h => `<div class="list-item"><div class="grow"><b>${fmtDate(h.date)}</b>
      <div class="small muted">${h.sets.map(x => `${x.w ? fmtKg(num(x.w)) : 'PDC'}×${x.r}`).join(' · ')}</div></div>
      <div style="text-align:right" class="small"><b>${h.loaded ? r0(h.score) + ' kg' : r0(h.score) + ' reps'}</b><div class="muted">vol. ${r0(h.volume).toLocaleString('fr-FR')} kg</div></div></div>`).join('')}</div>`
      : '<div class="card empty">Pas encore de séance avec cet exercice.</div>'}
  `);
  $('#x-save', s).addEventListener('click', () => {
    const repMin = Math.max(1, r0(num($('#x-min', s).value))), repMax = Math.max(repMin, r0(num($('#x-max', s).value)));
    state.exSettings[name] = { repMin, repMax, inc: num($('#x-inc', s).value) || cfg.inc, rest: +$('#x-rest', s).value };
    save(); closeSheet(); if (onDone) onDone(); toast('Réglages enregistrés');
  });
}

/* ---------------- Pauses ---------------- */

function renderPauses(body) {
  const rp = state.restPrefs;
  const names = allExerciseNames().sort((a, b) => a.localeCompare(b));
  body.innerHTML = `
    <div class="card">
      <h3>⏱️ Pauses par défaut</h3>
      <div class="grid2">
        <label class="field"><span>Exos lourds (polyarticulaires)</span>${restSelect('rp-comp', rp.compound)}</label>
        <label class="field"><span>Exos d’isolation</span>${restSelect('rp-iso', rp.isolation)}</label>
      </div>
      <label class="row" style="margin-bottom:10px"><input type="checkbox" id="rp-auto" style="width:auto" ${rp.auto ? 'checked' : ''}> <span>Lancer la pause automatiquement quand je valide une série ✓</span></label>
      <label class="row"><input type="checkbox" id="rp-sound" style="width:auto" ${rp.sound ? 'checked' : ''}> <span>Bip sonore à la fin de la pause</span></label>
    </div>
    <div class="card small muted">
      <b style="color:var(--text)">Repères :</b> force (1–5 reps) 3–5 min · hypertrophie sur exos lourds 2–3 min · isolation 60–90 s · circuits / Hyrox 30–60 s.
    </div>
    <h2>Pause par exercice</h2>
    <div class="card list">${names.map((n, i) => `<div class="list-item"><div class="grow"><b>${esc(n)}</b><div class="muted small">${isCompound(n) ? 'Polyarticulaire' : 'Isolation'}${state.exSettings[n] && state.exSettings[n].rest ? ' · personnalisé' : ''}</div></div>
      <div style="width:96px">${restSelect('rx-' + i, exCfg(n).rest)}</div></div>`).join('')}</div>`;

  const saveDefaults = () => {
    rp.compound = +$('#rp-comp', body).value; rp.isolation = +$('#rp-iso', body).value;
    rp.auto = $('#rp-auto', body).checked; rp.sound = $('#rp-sound', body).checked;
    save(); renderPauses(body); toast('Pauses enregistrées');
  };
  ['#rp-comp', '#rp-iso', '#rp-auto', '#rp-sound'].forEach(sel => $(sel, body).addEventListener('change', saveDefaults));
  names.forEach((n, i) => $('#rx-' + i, body).addEventListener('change', e => {
    state.exSettings[n] = { ...(state.exSettings[n] || {}), rest: +e.target.value }; save(); toast(`Pause ${n} : ${secToClock(+e.target.value)}`);
  }));
}

/* ---------------- Séance en cours ---------------- */

let workoutTimer = null, restTimer = null, restEnd = 0, audioCtx = null;
const openStats = new Set();

function openWorkout(type, existingId) {
  let w;
  if (existingId) {
    w = JSON.parse(JSON.stringify(state.workouts.find(x => x.id === existingId)));
    type = w.type;
  } else {
    const t = SESSION_TYPES[type];
    w = { id: uid(), type, date: todayISO(), createdAt: Date.now(), startedAt: Date.now(), notes: '' };
    if (t.kind === 'strength') w.exercises = state.templates[type].map(name => ({ name, sets: [{ w: '', r: '' }, { w: '', r: '' }, { w: '', r: '' }] }));
    if (t.kind === 'cardio') w.cardio = { activity: t.activities[0], minutes: '', distance: '', kcal: '', fc: '', intensity: 'Modérée' };
    if (t.kind === 'hyrox') w.hyrox = { mode: 'complet', division: 'Open', times: t.stations.map(() => ''), total: 0, full: true };
  }
  const t = SESSION_TYPES[type];
  const isNew = !existingId;

  const s = openSheet(`${t.emoji} ${t.short}`, `
    ${isNew ? `<div class="timerbar sticky">
        <div><div class="muted small">Durée séance</div><div class="t" id="wk-time">0:00</div></div>
        <div style="text-align:right"><div class="muted small">Pause</div>
          <div class="row" style="justify-content:flex-end;gap:6px"><span class="t rest" id="rest-time">—</span>
          <button class="btn sm" data-rest-adj="-15">−15</button><button class="btn sm" data-rest-adj="15">+15</button><button class="btn sm" data-rest-adj="0">✕</button></div></div>
      </div>` : ''}
    <label class="field"><span>Date</span><input type="date" id="wk-date" value="${w.date}"></label>
    <div id="wk-body"></div>
    <label class="field"><span>Notes / ressenti</span><textarea id="wk-notes" placeholder="Énergie, douleurs, sensations…">${esc(w.notes)}</textarea></label>
    <div class="row" style="margin-top:8px">
      ${!isNew ? '<button class="btn danger" id="wk-del">Supprimer</button>' : ''}
      <button class="btn primary grow" id="wk-save">${isNew ? 'Terminer & enregistrer' : 'Enregistrer'}</button>
    </div>
    ${t.kind === 'strength' ? '<button class="btn ghost block" style="margin-top:10px" id="wk-tpl">💾 Utiliser ces exercices comme modèle par défaut</button>' : ''}
  `, () => { clearInterval(workoutTimer); clearInterval(restTimer); restEnd = 0; });

  if (isNew) {
    const tick = () => { const el = $('#wk-time'); if (el) el.textContent = secToClock((Date.now() - w.startedAt) / 1000); };
    tick(); clearInterval(workoutTimer); workoutTimer = setInterval(tick, 1000);
    $$('[data-rest-adj]', s).forEach(b => b.addEventListener('click', () => {
      const d = +b.dataset.restAdj;
      if (d === 0) { restEnd = 0; clearInterval(restTimer); const el = $('#rest-time'); el.textContent = '—'; el.classList.remove('running'); return; }
      if (!restEnd || restEnd < Date.now()) startRest(Math.max(15, d)); else { restEnd = Math.max(Date.now() + 1000, restEnd + d * 1000); }
    }));
  }

  const body = $('#wk-body', s);
  if (t.kind === 'strength') drawStrength(body, w, isNew);
  if (t.kind === 'cardio') drawCardio(body, w, t);
  if (t.kind === 'hyrox') drawHyrox(body, w, t);

  $('#wk-date', s).addEventListener('change', e => w.date = e.target.value);
  $('#wk-notes', s).addEventListener('input', e => w.notes = e.target.value);
  $('#wk-save', s).addEventListener('click', () => {
    let prs = [];
    if (t.kind === 'strength') {
      w.exercises = w.exercises.map(e => ({ ...e, sets: e.sets.filter(x => num(x.r) > 0) })).filter(e => e.sets.length);
      if (!w.exercises.length) return toast('Remplis au moins une série 🙂');
      prs = w.exercises.filter(e => {
        const h = exHistory(e.name, w.id); if (!h.length) return false;
        return Math.max(...e.sets.map(setScore)) > Math.max(...h.map(x => x.score));
      }).map(e => e.name);
    }
    if (t.kind === 'hyrox') {
      w.hyrox.total = w.hyrox.times.reduce((a, x) => a + clockToSec(x), 0);
      w.hyrox.full = w.hyrox.times.every(x => clockToSec(x) > 0);
      if (!w.hyrox.total) return toast('Entre au moins un temps');
    }
    if (t.kind === 'cardio' && !num(w.cardio.minutes)) return toast('Indique la durée en minutes');
    if (isNew) w.duration = Math.round((Date.now() - w.startedAt) / 1000);
    const i = state.workouts.findIndex(x => x.id === w.id);
    if (i >= 0) state.workouts[i] = w; else state.workouts.push(w);
    save(); closeSheet(); render();
    toast(prs.length ? `🏆 ${prs.length} record${prs.length > 1 ? 's' : ''} battu${prs.length > 1 ? 's' : ''} : ${prs.join(', ')}` : 'Séance enregistrée ✅');
  });
  const del = $('#wk-del', s);
  if (del) del.addEventListener('click', () => {
    if (!confirm('Supprimer cette séance ?')) return;
    state.workouts = state.workouts.filter(x => x.id !== w.id); save(); closeSheet(); render();
  });
  const tpl = $('#wk-tpl', s);
  if (tpl) tpl.addEventListener('click', () => {
    state.templates[type] = w.exercises.map(e => e.name).filter(Boolean); save(); toast('Modèle mis à jour');
  });
}

function beep() {
  if (!state.restPrefs.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(t0 => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime + t0;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t); o.stop(t + 0.2);
    });
  } catch { /* audio indisponible */ }
}

function unlockAudio() {
  // iOS n'autorise le son qu'après un geste de l'utilisateur.
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch { /* */ }
}

function startRest(sec) {
  clearInterval(restTimer);
  restEnd = Date.now() + sec * 1000;
  const el = () => $('#rest-time');
  const tick = () => {
    if (!el() || !restEnd) return clearInterval(restTimer);
    const left = (restEnd - Date.now()) / 1000;
    if (left <= 0) {
      el().textContent = 'GO'; el().classList.remove('running'); clearInterval(restTimer); restEnd = 0;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      beep(); toast('⏱️ Pause terminée — série suivante !');
      return;
    }
    el().textContent = secToClock(left); el().classList.add('running');
  };
  tick(); restTimer = setInterval(tick, 250);
}

function drawStrength(body, w, live) {
  body.innerHTML = w.exercises.map((e, i) => {
    const hist = exHistory(e.name, w.id);
    const p = hist[hist.length - 1];
    const tgt = p ? nextTarget(e.name, p.sets) : null;
    const cfg = exCfg(e.name);
    const bestScore = hist.length ? Math.max(...hist.map(h => h.score)) : 0;
    return `<div class="exo" data-i="${i}">
      <div class="exo-head"><input value="${esc(e.name)}" data-name placeholder="Nom de l’exercice"><button class="icon-btn" data-stats title="Progression">📈</button><button class="icon-btn" data-rm-ex title="Retirer">🗑️</button></div>
      ${p ? `<div class="prev">Dernière fois (${fmtDate(p.date)}) : ${p.sets.map(s => `${s.w ? fmtKg(num(s.w)) : 'PDC'}×${s.r}`).join(' · ')}</div>` : '<div class="prev">Première fois : choisis une charge où tu peux faire ' + cfg.repMin + '–' + cfg.repMax + ' reps propres.</div>'}
      ${tgt ? `<div class="target small ${tgt.up ? 'up' : ''}">🎯 ${esc(tgt.text)}</div>` : ''}
      ${openStats.has(e.name) ? `<div class="card tight" style="background:var(--card2)">
        ${hist.length > 1 ? sparkline(hist.map(h => h.score)) : ''}
        <div class="small muted" style="margin-top:6px">${progressStatus(hist).label}</div>
        ${hist.slice(-5).reverse().map(x => `<div class="small">${fmtDate(x.date)} : ${x.sets.map(s => (s.w ? fmtKg(num(s.w)) : 'PDC') + '×' + s.r).join(' · ')}</div>`).join('') || '<div class="small muted">Pas encore d’historique.</div>'}
      </div>` : ''}
      <div class="row between small muted" style="margin-bottom:6px"><span>Fourchette ${cfg.repMin}–${cfg.repMax} reps</span>
        <span class="row" style="gap:6px">⏱️ Pause <span style="width:84px">${restSelect('rest-' + i, cfg.rest)}</span></span></div>
      <div class="set-head"><span>#</span><span>kg</span><span>reps</span><span>✓</span><span></span></div>
      ${e.sets.map((s, j) => {
        const pr = bestScore && setScore(s) > bestScore;
        return `<div class="set-row ${s.done ? 'done' : ''}" data-j="${j}"><span class="n">${pr ? '🏆' : j + 1}</span>
        <input inputmode="decimal" placeholder="${tgt ? esc(tgt.w === '' ? 'PDC' : fmtKg(tgt.w)) : 'kg'}" value="${esc(s.w)}" data-f="w">
        <input inputmode="numeric" placeholder="${tgt ? tgt.r : 'reps'}" value="${esc(s.r)}" data-f="r">
        <button class="check" data-done>${s.done ? '✓' : ''}</button>
        <button class="icon-btn" data-rm-set>−</button></div>`;
      }).join('')}
      <button class="btn sm ghost" data-add-set>＋ Série</button>
    </div>`;
  }).join('') + `<button class="btn block" id="add-ex" style="margin-bottom:14px">＋ Ajouter un exercice</button>`;

  $$('.exo', body).forEach(card => {
    const i = +card.dataset.i; const e = w.exercises[i];
    const hist = exHistory(e.name, w.id);
    const tgt = hist.length ? nextTarget(e.name, hist[hist.length - 1].sets) : null;
    $('[data-name]', card).addEventListener('change', ev => { e.name = ev.target.value.trim(); drawStrength(body, w, live); });
    $('[data-rm-ex]', card).addEventListener('click', () => { w.exercises.splice(i, 1); drawStrength(body, w, live); });
    $('[data-stats]', card).addEventListener('click', () => {
      if (openStats.has(e.name)) openStats.delete(e.name); else openStats.add(e.name);
      drawStrength(body, w, live);
    });
    $('#rest-' + i, card).addEventListener('change', ev => {
      state.exSettings[e.name] = { ...(state.exSettings[e.name] || {}), rest: +ev.target.value }; save();
    });
    $('[data-add-set]', card).addEventListener('click', () => {
      const last = e.sets[e.sets.length - 1] || { w: '', r: '' };
      e.sets.push({ w: last.w, r: last.r }); drawStrength(body, w, live);
    });
    $$('.set-row', card).forEach(row => {
      const j = +row.dataset.j;
      $$('input', row).forEach(inp => inp.addEventListener('input', ev => { e.sets[j][inp.dataset.f] = ev.target.value; }));
      $('[data-rm-set]', row).addEventListener('click', () => { e.sets.splice(j, 1); drawStrength(body, w, live); });
      $('[data-done]', row).addEventListener('click', () => {
        unlockAudio();
        const st = e.sets[j];
        if (st.done) { st.done = false; drawStrength(body, w, live); return; }
        // série validée sans saisie = objectif du jour réalisé
        if (st.w === '' && tgt && tgt.w !== '') st.w = fmtKg(tgt.w);
        if (st.r === '' && tgt) st.r = String(tgt.r);
        if (!num(st.r)) return toast('Indique le nombre de reps');
        st.done = true;
        const bestScore = hist.length ? Math.max(...hist.map(h => h.score)) : 0;
        if (bestScore && setScore(st) > bestScore) toast(`🏆 Nouveau record sur ${e.name} !`);
        drawStrength(body, w, live);
        const isLastSet = j === e.sets.length - 1 && i === w.exercises.length - 1;
        if (live && state.restPrefs.auto && !isLastSet) startRest(exCfg(e.name).rest);
      });
    });
  });
  $('#add-ex', body).addEventListener('click', () => {
    const name = prompt('Nom de l’exercice ?'); if (!name) return;
    w.exercises.push({ name: name.trim(), sets: [{ w: '', r: '' }, { w: '', r: '' }, { w: '', r: '' }] }); drawStrength(body, w, live);
  });
}

function drawCardio(body, w, t) {
  const c = w.cardio;
  body.innerHTML = `
    <label class="field"><span>Activité</span><select data-k="activity">${t.activities.map(a => `<option ${a === c.activity ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
    <div class="grid2">
      <label class="field"><span>Durée (min)</span><input inputmode="decimal" data-k="minutes" value="${esc(c.minutes)}"></label>
      <label class="field"><span>Distance (km)</span><input inputmode="decimal" data-k="distance" value="${esc(c.distance)}"></label>
      <label class="field"><span>Calories brûlées</span><input inputmode="numeric" data-k="kcal" value="${esc(c.kcal)}"></label>
      <label class="field"><span>FC moyenne (bpm)</span><input inputmode="numeric" data-k="fc" value="${esc(c.fc)}"></label>
    </div>
    <label class="field"><span>Intensité</span><select data-k="intensity">${['Légère', 'Modérée', 'Intense', 'Fractionné'].map(a => `<option ${a === c.intensity ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
    <div class="card tight muted small" id="pace">—</div>`;
  const pace = () => {
    const d = num(c.distance), m = num(c.minutes);
    $('#pace', body).textContent = d && m ? `Allure : ${secToClock((m * 60) / d)} /km · Vitesse : ${r1(d / (m / 60))} km/h` : 'Renseigne durée + distance pour voir l’allure.';
  };
  $$('[data-k]', body).forEach(el => el.addEventListener('input', () => { c[el.dataset.k] = el.value; pace(); }));
  pace();
}

function drawHyrox(body, w, t) {
  const h = w.hyrox;
  const best = state.workouts.filter(x => x.type === 'hyrox' && x.id !== w.id && x.hyrox.full).sort((a, b) => a.hyrox.total - b.hyrox.total)[0];
  body.innerHTML = `
    <div class="grid2">
      <label class="field"><span>Type</span><select data-k="mode">${['complet', 'simulation partielle', 'entraînement stations'].map(a => `<option ${a === h.mode ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
      <label class="field"><span>Division</span><select data-k="division">${['Open', 'Pro', 'Doubles', 'Relais'].map(a => `<option ${a === h.division ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
    </div>
    <p class="muted small">Temps au format <b>m:ss</b> (ex. 4:35). Laisse vide les stations non faites.</p>
    <div class="card">
      ${t.stations.map((st, i) => {
        const bt = best ? best.hyrox.times[i] : '';
        return `<div class="hyrox-row ${st.startsWith('Run') ? 'run' : ''}"><span>${st}${bt ? `<br><small class="muted">record séance : ${esc(bt)}</small>` : ''}</span>
        <input data-i="${i}" placeholder="m:ss" value="${esc(h.times[i])}"></div>`;
      }).join('')}
    </div>
    <div class="card row between"><span>Temps total</span><b id="hy-total" style="font-size:20px">0:00</b></div>
    ${best ? `<p class="muted small">Ton meilleur Hyrox complet : <b>${secToClock(best.hyrox.total)}</b></p>` : ''}`;
  const upd = () => {
    const tot = h.times.reduce((a, x) => a + clockToSec(x), 0);
    const run = h.times.reduce((a, x, i) => a + (t.stations[i].startsWith('Run') ? clockToSec(x) : 0), 0);
    $('#hy-total', body).innerHTML = `${secToClock(tot)} <small class="muted">(course ${secToClock(run)} · stations ${secToClock(tot - run)})</small>`;
  };
  $$('input[data-i]', body).forEach(el => el.addEventListener('input', () => { h.times[+el.dataset.i] = el.value; upd(); }));
  $$('select[data-k]', body).forEach(el => el.addEventListener('change', () => { h[el.dataset.k] = el.value; }));
  upd();
}

/* ================================================================== */
/* NUTRITION                                                           */
/* ================================================================== */

const MACROS = [
  { k: 'protein', label: 'Protéines', unit: 'g', color: '#ff7aa8' },
  { k: 'carbs', label: 'Glucides', unit: 'g', color: '#6aa8ff' },
  { k: 'fat', label: 'Lipides', unit: 'g', color: '#ffb35c' },
  { k: 'fiber', label: 'Fibres', unit: 'g', color: '#7cf29c' },
];

function dayTotals(date) {
  return state.meals.filter(m => m.date === date).reduce((a, m) => {
    a.kcal += num(m.kcal); a.protein += num(m.protein); a.carbs += num(m.carbs); a.fat += num(m.fat); a.fiber += num(m.fiber); a.sugar += num(m.sugar);
    return a;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 });
}

function ring(value, goal, color, size = 118) {
  const r = (size - 14) / 2, c = 2 * Math.PI * r;
  const pct = goal ? Math.min(value / goal, 1) : 0;
  const over = goal && value > goal;
  return `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--card2)" stroke-width="12"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${over ? 'var(--red)' : color}" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg>`;
}

function renderNutrition(v) {
  const tabs = [['journal', 'Journal'], ['poids', 'Poids'], ['creatine', 'Créatine']];
  v.innerHTML = `<div class="seg">${tabs.map(([k, l]) => `<button data-nt="${k}" class="${ui.nutTab === k ? 'active' : ''}">${l}</button>`).join('')}</div><div id="nut-body"></div>`;
  $$('[data-nt]', v).forEach(b => b.addEventListener('click', () => { ui.nutTab = b.dataset.nt; renderNutrition(v); }));
  const body = $('#nut-body', v);
  if (ui.nutTab === 'poids') renderWeight(body);
  else if (ui.nutTab === 'creatine') renderCreatine(body);
  else renderJournal(body);
}

/* ---------------- Poids ---------------- */

function weightsSorted() { return [...state.weights].sort((a, b) => a.date.localeCompare(b.date)); }
function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

// Moyenne glissante sur 7 jours (lisse les variations d'eau / de digestion).
function movingAvg(list, days = 7) {
  return list.map(p => {
    const from = addDays(p.date, -(days - 1));
    const win = list.filter(x => x.date >= from && x.date <= p.date);
    return win.reduce((a, x) => a + x.kg, 0) / win.length;
  });
}

function weightChart(list, goal) {
  if (list.length < 2) return '<div class="empty small">Ajoute au moins 2 pesées pour voir la courbe.</div>';
  const W = 320, H = 170, L = 34, R = 8, T = 10, B = 22;
  const avg = movingAvg(list);
  const t0 = parseISO(list[0].date).getTime(), t1 = parseISO(list[list.length - 1].date).getTime() || t0 + 1;
  const vals = [...list.map(p => p.kg), ...(goal ? [goal] : [])];
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = Math.max(0.5, (max - min) * 0.12); min -= pad; max += pad;
  const x = d => L + (parseISO(d).getTime() - t0) / ((t1 - t0) || 1) * (W - L - R);
  const y = kg => T + (1 - (kg - min) / (max - min)) * (H - T - B);
  const ticks = [0, 0.5, 1].map(f => min + (max - min) * f);
  const raw = list.map(p => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="2.6" fill="var(--blue)" opacity=".55"/>`).join('');
  const line = list.map((p, i) => `${x(p.date).toFixed(1)},${y(avg[i]).toFixed(1)}`).join(' ');
  const last = list[list.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
    ${ticks.map(tk => `<line x1="${L}" x2="${W - R}" y1="${y(tk)}" y2="${y(tk)}" stroke="var(--line)" stroke-dasharray="3 4"/>
      <text x="${L - 6}" y="${y(tk) + 3.5}" font-size="10" fill="var(--muted)" text-anchor="end">${fmt1(tk)}</text>`).join('')}
    ${goal ? `<line x1="${L}" x2="${W - R}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--orange)" stroke-dasharray="6 4"/>
      <text x="${W - R}" y="${y(goal) - 4}" font-size="10" fill="var(--orange)" text-anchor="end">objectif ${fmt1(goal)}</text>` : ''}
    ${raw}
    <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(last.date)}" cy="${y(avg[avg.length - 1])}" r="4" fill="var(--accent)"/>
    <text x="${L}" y="${H - 6}" font-size="10" fill="var(--muted)">${fmtDate(list[0].date, { day: 'numeric', month: 'short' })}</text>
    <text x="${W - R}" y="${H - 6}" font-size="10" fill="var(--muted)" text-anchor="end">${fmtDate(last.date, { day: 'numeric', month: 'short' })}</text>
  </svg>
  <div class="row small muted" style="gap:14px;margin-top:6px"><span><span style="color:var(--blue)">●</span> pesées</span><span><span style="color:var(--accent)">━</span> moyenne 7 jours</span></div>`;
}

function renderWeight(body) {
  const all = weightsSorted();
  const ranges = [['30', '1 mois'], ['90', '3 mois'], ['180', '6 mois'], ['all', 'Tout']];
  const from = ui.weightRange === 'all' ? '0000' : addDays(todayISO(), -num(ui.weightRange));
  const list = all.filter(p => p.date >= from);
  const goal = num(state.profile.weightGoal) || 0;
  const last = all[all.length - 1];
  const avgAll = movingAvg(all);
  const trendNow = avgAll[avgAll.length - 1];
  // tendance : moyenne 7 j actuelle vs moyenne 7 j il y a ~7 jours
  let weekly = null;
  if (all.length >= 2) {
    const ref = addDays(last.date, -7);
    const idx = all.map(p => p.date).filter(d => d <= ref).length - 1;
    if (idx >= 0) weekly = trendNow - avgAll[idx];
  }
  const start = all[0];
  const todayW = all.find(p => p.date === todayISO());
  const toGoal = goal && last ? last.kg - goal : null;

  body.innerHTML = `
    <div class="card">
      <div class="row">
        <input id="w-kg" inputmode="decimal" placeholder="${last ? fmt1(last.kg) : 'Poids en kg'}" value="${todayW ? fmt1(todayW.kg) : ''}" style="font-size:20px;font-weight:700">
        <input type="date" id="w-date" value="${todayISO()}" style="max-width:150px">
      </div>
      <button class="btn primary block" id="w-add" style="margin-top:10px">⚖️ ${todayW ? 'Mettre à jour la pesée du jour' : 'Enregistrer ma pesée'}</button>
      <p class="muted small" style="margin:8px 0 0">Conseil : pèse-toi le matin à jeun, après être allé aux toilettes. Fie-toi à la moyenne sur 7 jours plutôt qu’au chiffre du jour.</p>
    </div>

    <div class="stats">
      <div class="stat"><div class="v">${last ? fmt1(last.kg) : '—'}</div><div class="l">kg actuel</div></div>
      <div class="stat"><div class="v" style="color:${weekly == null ? 'inherit' : weekly <= 0 ? 'var(--blue)' : 'var(--orange)'}">${weekly == null ? '—' : (weekly > 0 ? '+' : '') + fmt1(weekly)}</div><div class="l">kg / semaine</div></div>
      <div class="stat"><div class="v">${start && last && all.length > 1 ? (last.kg - start.kg > 0 ? '+' : '') + fmt1(last.kg - start.kg) : '—'}</div><div class="l">depuis le début</div></div>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="chips" style="margin-bottom:10px">${ranges.map(([k, l]) => `<button class="chip ${ui.weightRange === k ? 'active' : ''}" data-wr="${k}">${l}</button>`).join('')}</div>
      ${weightChart(list, goal)}
    </div>

    <div class="card">
      <div class="row between"><b>🎯 Poids objectif</b>${toGoal != null ? `<span class="pill ${Math.abs(toGoal) < 0.5 ? 'good' : ''}">${Math.abs(toGoal) < 0.5 ? 'Atteint 🎉' : `encore ${fmt1(Math.abs(toGoal))} kg`}</span>` : ''}</div>
      <div class="row" style="margin-top:8px"><input id="w-goal" inputmode="decimal" placeholder="Ex. 78" value="${goal ? fmt1(goal) : ''}"><button class="btn" id="w-goal-save">OK</button></div>
      ${toGoal != null && weekly && Math.abs(toGoal) >= 0.5 && Math.sign(weekly) === -Math.sign(toGoal) ? `<p class="muted small" style="margin:8px 0 0">À ce rythme, objectif atteint dans environ <b style="color:var(--text)">${Math.ceil(Math.abs(toGoal / weekly))} semaines</b>.</p>` : ''}
    </div>

    <h2>Pesées</h2>
    ${all.length ? `<div class="card list">${[...all].reverse().slice(0, 30).map((p, i, arr) => {
      const prev = arr[i + 1]; const d = prev ? p.kg - prev.kg : 0;
      return `<div class="list-item"><div class="grow"><b>${fmt1(p.kg)} kg</b><div class="muted small">${fmtDate(p.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
        ${prev ? `<span class="small" style="color:${d <= 0 ? 'var(--blue)' : 'var(--orange)'}">${d > 0 ? '+' : ''}${fmt1(d)}</span>` : ''}
        <button class="icon-btn" data-wdel="${p.id}">🗑️</button></div>`;
    }).join('')}</div>` : '<div class="card empty">Aucune pesée pour l’instant.</div>'}`;

  $('#w-add', body).addEventListener('click', () => {
    const kg = num($('#w-kg', body).value); const date = $('#w-date', body).value || todayISO();
    if (kg < 20 || kg > 400) return toast('Entre un poids valide');
    const ex = state.weights.find(p => p.date === date);
    if (ex) ex.kg = kg; else state.weights.push({ id: uid(), date, kg });
    if (date >= (weightsSorted().pop() || {}).date) state.profile.weight = kg; // garde le calculateur à jour
    save(); renderWeight(body); toast('Pesée enregistrée ⚖️');
  });
  $$('[data-wr]', body).forEach(b => b.addEventListener('click', () => { ui.weightRange = b.dataset.wr; renderWeight(body); }));
  $('#w-goal-save', body).addEventListener('click', () => { state.profile.weightGoal = num($('#w-goal', body).value) || ''; save(); renderWeight(body); toast('Objectif enregistré'); });
  $$('[data-wdel]', body).forEach(b => b.addEventListener('click', () => {
    if (!confirm('Supprimer cette pesée ?')) return;
    state.weights = state.weights.filter(p => p.id !== b.dataset.wdel); save(); renderWeight(body);
  }));
}

/* ---------------- Protéines ---------------- */

const PROTEIN_PRESETS = [
  { id: 'whey', name: 'Shaker whey (30 g)', emoji: '🥤', protein: 24, kcal: 120, carbs: 3, fat: 1.5 },
  { id: 'oeufs', name: '3 œufs', emoji: '🥚', protein: 19, kcal: 215, carbs: 1, fat: 15 },
  { id: 'poulet', name: 'Blanc de poulet 150 g', emoji: '🍗', protein: 46, kcal: 240, carbs: 0, fat: 5 },
  { id: 'steak', name: 'Steak haché 5 % (125 g)', emoji: '🥩', protein: 26, kcal: 165, carbs: 0, fat: 6 },
  { id: 'thon', name: 'Thon en boîte (140 g)', emoji: '🐟', protein: 36, kcal: 160, carbs: 0, fat: 1.5 },
  { id: 'saumon', name: 'Saumon 125 g', emoji: '🍣', protein: 25, kcal: 250, carbs: 0, fat: 17 },
  { id: 'skyr', name: 'Skyr (150 g)', emoji: '🥛', protein: 16, kcal: 95, carbs: 6, fat: 0.3 },
  { id: 'fb', name: 'Fromage blanc 0 % (200 g)', emoji: '🍶', protein: 15, kcal: 100, carbs: 8, fat: 0.4 },
  { id: 'barre', name: 'Barre protéinée', emoji: '🍫', protein: 20, kcal: 200, carbs: 20, fat: 7 },
  { id: 'lentilles', name: 'Lentilles cuites (200 g)', emoji: '🫘', protein: 18, kcal: 230, carbs: 34, fat: 1 },
];

function allProteinPresets() { return [...state.proteinFavs.map(f => ({ ...f, fav: true })), ...PROTEIN_PRESETS]; }

function addProteinEntry(date, p) {
  state.meals.push({
    id: uid(), date, createdAt: Date.now(), source: 'proteine', mealType: guessMealType(),
    name: p.name, kcal: num(p.kcal) || r0(num(p.protein) * 4 + num(p.carbs) * 4 + num(p.fat) * 9),
    protein: num(p.protein), carbs: num(p.carbs), fat: num(p.fat), fiber: 0, sugar: 0,
  });
  save();
}

function proteinStreak() {
  const goal = state.goals.protein; let n = 0; let d = todayISO();
  if (dayTotals(d).protein < goal) d = addDays(d, -1);
  while (dayTotals(d).protein >= goal && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}

function renderProtein(body) {
  const d = ui.nutDate;
  const goal = state.goals.protein;
  const tot = dayTotals(d);
  const got = tot.protein;
  const left = Math.max(0, goal - got);
  const pct = goal ? got / goal * 100 : 0;
  const lastW = (weightsSorted().pop() || {}).kg || num(state.profile.weight);
  const meals = state.meals.filter(m => m.date === d && num(m.protein) > 0).sort((a, b) => num(b.protein) - num(a.protein));
  const days = Array.from({ length: 14 }, (_, i) => addDays(d, i - 13));
  const vals = days.map(x => dayTotals(x).protein);
  const maxV = Math.max(goal, ...vals) || 1;
  const hit14 = vals.filter(v => v >= goal).length;
  const avg7 = vals.slice(-7).reduce((a, v) => a + v, 0) / 7;
  const hour = new Date().getHours();
  const mealsLeft = d === todayISO() ? Math.max(1, hour < 11 ? 4 : hour < 15 ? 3 : hour < 19 ? 2 : 1) : 1;

  body.innerHTML = `
    <div class="datenav">
      <button class="btn sm" id="pd-prev">‹</button>
      <b>${d === todayISO() ? 'Aujourd’hui' : fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
      <button class="btn sm" id="pd-next" ${d >= todayISO() ? 'disabled' : ''}>›</button>
    </div>

    <div class="card">
      <div class="ring-wrap">
        <div class="ring">${ring(got, goal, 'var(--pink)')}<div class="center"><div><b>${r0(got)}</b><span class="muted small">/ ${goal} g</span></div></div></div>
        <div class="grow small">
          ${left > 0 ? `<div style="font-size:16px">Encore <b style="color:var(--pink)">${r0(left)} g</b></div>
            ${d === todayISO() ? `<div class="muted">soit ~${r0(left / mealsLeft)} g par repas sur ${mealsLeft} repas restant${mealsLeft > 1 ? 's' : ''}</div>` : ''}`
            : `<div style="font-size:16px;color:var(--accent)"><b>Objectif atteint 🎉</b></div>`}
          <div class="muted" style="margin-top:6px">${r0(pct)} % de l’objectif${lastW ? ` · ${fmt1(got / lastW)} g/kg (cible ${fmt1(goal / lastW)})` : ''}</div>
          <div class="muted">🔥 Série : <b style="color:var(--text)">${proteinStreak()} j</b> à l’objectif</div>
        </div>
      </div>
    </div>

    <h2>Ajout rapide</h2>
    <div class="prot-grid">
      ${allProteinPresets().map((p, i) => `<button class="prot-btn" data-pp="${i}">
        <span class="e">${p.emoji || '⭐'}</span><span class="grow"><b>${esc(p.name)}</b><span class="muted small">${r0(p.kcal)} kcal</span></span>
        <span class="g">+${r1(p.protein)} g</span></button>`).join('')}
    </div>

    <div class="card" style="margin-top:12px">
      <h3>✍️ Ajout libre</h3>
      <label class="field"><span>Aliment</span><input id="pf-name" placeholder="Ex. Burger maison, shaker double…"></label>
      <div class="grid2">
        <label class="field"><span>Protéines (g)</span><input id="pf-protein" inputmode="decimal"></label>
        <label class="field"><span>Calories (facultatif)</span><input id="pf-kcal" inputmode="decimal"></label>
      </div>
      <div class="row">
        <button class="btn primary grow" id="pf-add">＋ Ajouter</button>
        <button class="btn" id="pf-fav" title="Ajouter aux favoris">⭐ Favori</button>
      </div>
    </div>

    <h2>Sources de protéines du jour</h2>
    ${meals.length ? `<div class="card list">${meals.map(m => `<div class="list-item">
      <div class="ico">${m.thumb ? `<img src="${m.thumb}" alt="">` : m.source === 'proteine' ? '💪' : m.source === 'ia' ? '🤖' : '🍽️'}</div>
      <div class="grow"><b>${esc(m.name)}</b><div class="muted small">${esc(m.mealType)} · ${r0(m.kcal)} kcal</div>
        <div class="bar" style="--c:var(--pink);margin-top:4px;height:5px"><i style="width:${Math.min(100, num(m.protein) / goal * 100)}%"></i></div></div>
      <b style="color:var(--pink)">${r1(num(m.protein))} g</b>
      ${m.source === 'proteine' ? `<button class="icon-btn" data-pdel="${m.id}">🗑️</button>` : ''}</div>`).join('')}</div>`
      : '<div class="card empty">Aucune protéine enregistrée ce jour-là.<br>Utilise l’ajout rapide ci-dessus 💪</div>'}

    <h2>14 derniers jours</h2>
    <div class="card">
      <div class="minichart" style="position:relative">
        <div style="position:absolute;left:0;right:0;bottom:calc(${goal / maxV * 100}% * (90 - 18) / 90 + 18px);border-top:1px dashed var(--pink);opacity:.6"></div>
        ${days.map((x, i) => `<div class="col"><i style="height:${vals[i] / maxV * 100}%;--c:${vals[i] >= goal ? 'var(--pink)' : '#5a3446'}"></i><small>${parseISO(x).getDate()}</small></div>`).join('')}
      </div>
      <div class="row between small muted" style="margin-top:8px"><span>Moyenne 7 j : <b style="color:var(--text)">${r0(avg7)} g</b></span><span>Objectif atteint <b style="color:var(--text)">${hit14}/14</b> jours</span></div>
    </div>

    ${state.proteinFavs.length ? `<h2>Mes favoris</h2><div class="card list">${state.proteinFavs.map(f => `<div class="list-item"><div class="ico">⭐</div><div class="grow"><b>${esc(f.name)}</b><div class="muted small">${r1(f.protein)} g · ${r0(f.kcal)} kcal</div></div><button class="icon-btn" data-fdel="${f.id}">🗑️</button></div>`).join('')}</div>` : ''}
    <p class="muted small">Ce que tu ajoutes ici compte aussi dans les calories et macros du Journal. Objectif modifiable dans Journal → 🎯 Objectifs.</p>`;

  const redraw = () => renderProtein(body);
  $('#pd-prev', body).addEventListener('click', () => { ui.nutDate = addDays(d, -1); redraw(); });
  $('#pd-next', body).addEventListener('click', () => { if (d < todayISO()) { ui.nutDate = addDays(d, 1); redraw(); } });
  const presets = allProteinPresets();
  $$('[data-pp]', body).forEach(b => b.addEventListener('click', () => {
    const p = presets[+b.dataset.pp];
    const before = dayTotals(d).protein;
    addProteinEntry(d, p); redraw();
    toast(before < goal && before + p.protein >= goal ? '🎉 Objectif protéines atteint !' : `+${r1(p.protein)} g de protéines`);
  }));
  const readFree = () => {
    const protein = num($('#pf-protein', body).value);
    if (!protein) { toast('Indique les grammes de protéines'); return null; }
    return { name: $('#pf-name', body).value.trim() || 'Protéines', protein, kcal: num($('#pf-kcal', body).value) || r0(protein * 4), carbs: 0, fat: 0 };
  };
  $('#pf-add', body).addEventListener('click', () => { const p = readFree(); if (!p) return; addProteinEntry(d, p); redraw(); toast(`+${r1(p.protein)} g de protéines`); });
  $('#pf-fav', body).addEventListener('click', () => { const p = readFree(); if (!p) return; state.proteinFavs.unshift({ id: uid(), emoji: '⭐', ...p }); save(); redraw(); toast('Ajouté aux favoris ⭐'); });
  $$('[data-pdel]', body).forEach(b => b.addEventListener('click', () => { state.meals = state.meals.filter(m => m.id !== b.dataset.pdel); save(); redraw(); }));
  $$('[data-fdel]', body).forEach(b => b.addEventListener('click', () => { state.proteinFavs = state.proteinFavs.filter(f => f.id !== b.dataset.fdel); save(); redraw(); }));
}

/* ---------------- Créatine ---------------- */

function creatineStreak() {
  const c = state.creatine; let n = 0; let d = todayISO();
  if ((c.logs[d] || 0) < c.dose) d = addDays(d, -1); // la journée en cours ne casse pas la série
  while ((c.logs[d] || 0) >= c.dose) { n++; d = addDays(d, -1); }
  return n;
}

function creatineCard(date, compact) {
  const c = state.creatine; const got = c.logs[date] || 0; const ok = got >= c.dose;
  return `<div class="card" style="${ok ? 'border-color:#24543a' : ''}">
    <div class="row between"><h3 style="margin:0">💊 Créatine</h3><span class="${ok ? 'amount-pos' : 'muted'}">${fmt1(got).replace(',0', '')} / ${c.dose} g ${ok ? '✓' : ''}</span></div>
    <div class="bar" style="--c:var(--purple);margin:10px 0"><i style="width:${Math.min(100, got / c.dose * 100)}%"></i></div>
    <div class="row">
      ${ok ? `<span class="small muted grow">Prise du jour validée 💪 Série : ${creatineStreak()} j</span><button class="btn sm" data-crea="reset">Annuler</button>`
        : `<button class="btn sm grow" data-crea="${c.dose / 2}">＋ ${String(c.dose / 2).replace('.', ',')} g</button><button class="btn sm grow primary" data-crea="${c.dose}">✓ J’ai pris mes ${c.dose} g</button>`}
    </div>
    ${compact ? '' : ''}
  </div>`;
}

function bindCreatine(root, date, redraw) {
  $$('[data-crea]', root).forEach(b => b.addEventListener('click', () => {
    const c = state.creatine;
    if (b.dataset.crea === 'reset') delete c.logs[date];
    else c.logs[date] = Math.min(c.dose, (c.logs[date] || 0) + num(b.dataset.crea));
    save(); redraw();
    if ((c.logs[date] || 0) >= c.dose) toast('Créatine du jour ✅');
  }));
}

function renderCreatine(body) {
  const c = state.creatine; const today = todayISO();
  const days = Array.from({ length: 35 }, (_, i) => addDays(today, i - 34));
  const taken30 = Array.from({ length: 30 }, (_, i) => addDays(today, -i)).filter(d => (c.logs[d] || 0) >= c.dose).length;
  let best = 0, cur = 0;
  const keys = Object.keys(c.logs).sort();
  if (keys.length) for (let d = keys[0]; d <= today; d = addDays(d, 1)) { if ((c.logs[d] || 0) >= c.dose) { cur++; best = Math.max(best, cur); } else cur = 0; }

  body.innerHTML = `
    ${creatineCard(today)}
    <div class="stats">
      <div class="stat"><div class="v">${creatineStreak()}</div><div class="l">jours d’affilée</div></div>
      <div class="stat"><div class="v">${best}</div><div class="l">meilleure série</div></div>
      <div class="stat"><div class="v">${r0(taken30 / 30 * 100)} %</div><div class="l">régularité 30 j</div></div>
    </div>
    <div class="card" style="margin-top:12px">
      <b>5 dernières semaines</b>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:10px;text-align:center">
        ${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(l => `<span class="muted small">${l}</span>`).join('')}
        ${Array.from({ length: (parseISO(days[0]).getDay() + 6) % 7 }, () => '<span></span>').join('')}
        ${days.map(d => { const g = c.logs[d] || 0; const full = g >= c.dose;
          return `<button class="cal-day ${full ? 'full' : g ? 'half' : ''} ${d === today ? 'today' : ''}" data-cday="${d}" title="${fmtDate(d)}">${parseISO(d).getDate()}</button>`; }).join('')}
      </div>
      <p class="muted small" style="margin:10px 0 0">Touche un jour pour cocher / décocher un oubli de saisie.</p>
    </div>
    <div class="card">
      <b>Réglages</b>
      <label class="field" style="margin-top:8px"><span>Dose quotidienne (g)</span><input id="c-dose" inputmode="decimal" value="${String(c.dose).replace('.', ',')}"></label>
      <button class="btn block" id="c-save">Enregistrer</button>
    </div>
    <div class="card small muted">
      <b style="color:var(--text)">Bon à savoir :</b> la créatine monohydrate agit par saturation des muscles, donc c’est la <b style="color:var(--text)">régularité</b> qui compte, pas l’heure de la prise —
      jours de repos compris. Bois suffisamment d’eau (objectif eau dans le Journal). Une prise de 1 à 2 kg en début de cure est normale : c’est de l’eau dans les muscles, pas du gras.
    </div>`;

  bindCreatine(body, today, () => renderCreatine(body));
  $$('[data-cday]', body).forEach(b => b.addEventListener('click', () => {
    const d = b.dataset.cday;
    if ((c.logs[d] || 0) >= c.dose) delete c.logs[d]; else c.logs[d] = c.dose;
    save(); renderCreatine(body);
  }));
  $('#c-save', body).addEventListener('click', () => { c.dose = num($('#c-dose', body).value) || c.dose; save(); renderCreatine(body); toast('Dose enregistrée'); });
}

function renderJournal(v) {
  const d = ui.nutDate;
  const tot = dayTotals(d);
  const g = state.goals;
  const meals = state.meals.filter(m => m.date === d).sort((a, b) => MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType) || a.createdAt - b.createdAt);
  const water = state.water[d] || 0;
  const remaining = g.kcal - tot.kcal;

  v.innerHTML = `
    <div class="datenav">
      <button class="btn sm" id="nd-prev">‹</button>
      <b>${d === todayISO() ? 'Aujourd’hui' : fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
      <button class="btn sm" id="nd-next" ${d >= todayISO() ? 'disabled' : ''}>›</button>
    </div>

    <div class="card">
      <div class="ring-wrap">
        <div class="ring">${ring(tot.kcal, g.kcal, 'var(--accent)')}<div class="center"><div><b>${r0(tot.kcal)}</b><span class="muted small">/ ${g.kcal} kcal</span></div></div></div>
        <div class="grow">
          ${MACROS.map(m => `<div class="macro"><div class="row between"><span>${m.label}</span><span class="muted">${r0(tot[m.k])} / ${g[m.k]} ${m.unit}</span></div>
            <div class="bar" style="--c:${m.color}"><i style="width:${Math.min(100, g[m.k] ? tot[m.k] / g[m.k] * 100 : 0)}%"></i></div></div>`).join('')}
        </div>
      </div>
      <hr>
      <div class="row between small">
        <span>${remaining >= 0 ? `Il te reste <b>${r0(remaining)} kcal</b>` : `<span style="color:var(--red)">Dépassé de <b>${r0(-remaining)} kcal</b></span>`}</span>
        <span class="muted">Protéines restantes : <b>${Math.max(0, r0(g.protein - tot.protein))} g</b></span>
      </div>
    </div>

    <div class="grid2">
      <button class="btn primary" id="ai-meal">📷 Photo + IA</button>
      <button class="btn" id="manual-meal">✍️ Ajout manuel</button>
    </div>

    <div style="margin-top:12px" id="crea-slot">${creatineCard(d, true)}</div>

    <div class="card">
      <div class="row between"><h3 style="margin:0">💧 Eau</h3><span class="muted">${(water / 1000).toLocaleString('fr-FR')} / ${(g.water / 1000).toLocaleString('fr-FR')} L</span></div>
      <div class="bar" style="--c:var(--blue);margin:10px 0"><i style="width:${Math.min(100, water / g.water * 100)}%"></i></div>
      <div class="row"><button class="btn sm" data-water="-250">−250 ml</button><button class="btn sm grow" data-water="250">＋ 250 ml</button><button class="btn sm grow" data-water="500">＋ 500 ml</button></div>
    </div>

    <h2>Repas</h2>
    ${MEAL_TYPES.map(mt => {
      const ms = meals.filter(m => m.mealType === mt);
      if (!ms.length) return '';
      const k = ms.reduce((a, m) => a + num(m.kcal), 0);
      return `<div class="card list"><div class="row between" style="padding:4px 12px 0"><b>${mt}</b><span class="muted small">${r0(k)} kcal</span></div>
        ${ms.map(m => `<div class="list-item" data-meal="${m.id}">
          <div class="ico">${m.thumb ? `<img src="${m.thumb}" alt="">` : (m.source === 'ia' ? '🤖' : m.source === 'proteine' ? '💪' : '🍽️')}</div>
          <div class="grow"><b>${esc(m.name)}</b><div class="muted small">P ${r0(m.protein)} g · G ${r0(m.carbs)} g · L ${r0(m.fat)} g</div></div>
          <b>${r0(m.kcal)}</b></div>`).join('')}</div>`;
    }).join('') || '<div class="card empty">Aucun repas ce jour-là.<br>Prends ton assiette en photo pour commencer 📸</div>'}

    <h2>7 derniers jours</h2>
    ${weekNutritionChart(d)}

    <h2>Objectifs</h2>
    <div class="card">
      <div class="grid3 small">
        <div><span class="muted">Calories</span><br><b>${g.kcal} kcal</b></div>
        <div><span class="muted">Protéines</span><br><b>${g.protein} g</b></div>
        <div><span class="muted">Glucides</span><br><b>${g.carbs} g</b></div>
        <div><span class="muted">Lipides</span><br><b>${g.fat} g</b></div>
        <div><span class="muted">Fibres</span><br><b>${g.fiber} g</b></div>
        <div><span class="muted">Eau</span><br><b>${g.water / 1000} L</b></div>
      </div>
      <button class="btn block" style="margin-top:12px" id="edit-goals">🎯 Modifier / calculer mes objectifs</button>
    </div>`;

  $('#nd-prev', v).addEventListener('click', () => { ui.nutDate = addDays(d, -1); renderJournal(v); });
  $('#nd-next', v).addEventListener('click', () => { if (d < todayISO()) { ui.nutDate = addDays(d, 1); renderJournal(v); } });
  $('#ai-meal', v).addEventListener('click', () => openAIMeal());
  $('#manual-meal', v).addEventListener('click', () => openMealEditor({ date: d }));
  $('#edit-goals', v).addEventListener('click', openGoals);
  bindCreatine(v, d, () => renderJournal(v));
  $$('[data-water]', v).forEach(b => b.addEventListener('click', () => {
    state.water[d] = Math.max(0, (state.water[d] || 0) + +b.dataset.water); save(); renderJournal(v);
  }));
  $$('[data-meal]', v).forEach(el => el.addEventListener('click', () => openMealEditor(state.meals.find(m => m.id === el.dataset.meal))));
}

function weekNutritionChart(endDate) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(endDate, i - 6));
  const vals = days.map(d => dayTotals(d));
  const max = Math.max(state.goals.kcal, ...vals.map(v => v.kcal)) || 1;
  const avgP = vals.reduce((a, v) => a + v.protein, 0) / 7;
  const avgK = vals.reduce((a, v) => a + v.kcal, 0) / 7;
  return `<div class="card">
    <div class="minichart">${days.map((d, i) => `<div class="col"><i style="height:${vals[i].kcal / max * 100}%;--c:${vals[i].kcal > state.goals.kcal ? 'var(--red)' : 'var(--accent)'}"></i><small>${fmtDate(d, { weekday: 'narrow' })}</small></div>`).join('')}</div>
    <div class="row between small muted" style="margin-top:8px"><span>Moyenne : <b>${r0(avgK)} kcal</b></span><span>Protéines moy. : <b>${r0(avgP)} g</b></span></div>
  </div>`;
}

function openGoals() {
  const g = { ...state.goals }; const p = { ...state.profile };
  const s = openSheet('🎯 Objectifs nutrition', `
    <div class="card">
      <h3>Calculateur automatique</h3>
      <div class="grid2">
        <label class="field"><span>Sexe</span><select id="p-sex"><option value="h" ${p.sex === 'h' ? 'selected' : ''}>Homme</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>Femme</option></select></label>
        <label class="field"><span>Âge</span><input id="p-age" inputmode="numeric" value="${p.age}"></label>
        <label class="field"><span>Poids (kg)</span><input id="p-weight" inputmode="decimal" value="${p.weight}"></label>
        <label class="field"><span>Taille (cm)</span><input id="p-height" inputmode="numeric" value="${p.height}"></label>
      </div>
      <label class="field"><span>Activité</span><select id="p-act">
        ${[[1.2, 'Sédentaire'], [1.375, 'Légère (1-2 séances/sem)'], [1.55, 'Modérée (3-4 séances/sem)'], [1.725, 'Élevée (5-6 séances/sem)'], [1.9, 'Très élevée (2x/jour, Hyrox…)']]
          .map(([v, l]) => `<option value="${v}" ${+p.activity === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Objectif</span><select id="p-goal">
        ${[['seche', 'Sèche (−20 %)'], ['seche-douce', 'Sèche douce (−10 %)'], ['maintien', 'Maintien'], ['prise', 'Prise de masse (+10 %)']]
          .map(([v, l]) => `<option value="${v}" ${p.goal === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <button class="btn block" id="calc">⚡ Calculer</button>
      <p class="muted small" id="calc-info"></p>
    </div>
    <div class="grid2">
      <label class="field"><span>Calories (kcal)</span><input id="g-kcal" inputmode="numeric" value="${g.kcal}"></label>
      <label class="field"><span>Protéines (g)</span><input id="g-protein" inputmode="numeric" value="${g.protein}"></label>
      <label class="field"><span>Glucides (g)</span><input id="g-carbs" inputmode="numeric" value="${g.carbs}"></label>
      <label class="field"><span>Lipides (g)</span><input id="g-fat" inputmode="numeric" value="${g.fat}"></label>
      <label class="field"><span>Fibres (g)</span><input id="g-fiber" inputmode="numeric" value="${g.fiber}"></label>
      <label class="field"><span>Eau (ml)</span><input id="g-water" inputmode="numeric" value="${g.water}"></label>
    </div>
    <button class="btn primary block" id="g-save">Enregistrer</button>`);

  $('#calc', s).addEventListener('click', () => {
    const sex = $('#p-sex', s).value, age = num($('#p-age', s).value), wt = num($('#p-weight', s).value), ht = num($('#p-height', s).value);
    const act = num($('#p-act', s).value), goal = $('#p-goal', s).value;
    const bmr = 10 * wt + 6.25 * ht - 5 * age + (sex === 'h' ? 5 : -161); // Mifflin-St Jeor
    const tdee = bmr * act;
    const factor = { seche: 0.8, 'seche-douce': 0.9, maintien: 1, prise: 1.1 }[goal];
    const kcal = Math.round(tdee * factor / 10) * 10;
    const protein = Math.round(wt * (goal.startsWith('seche') ? 2.2 : 2));
    const fat = Math.round(wt * 0.9);
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const fiber = Math.round(kcal / 1000 * 14);
    const water = Math.round(wt * 35 / 250) * 250 + 500;
    Object.assign(state.profile, { sex, age, weight: wt, height: ht, activity: act, goal });
    $('#g-kcal', s).value = kcal; $('#g-protein', s).value = protein; $('#g-carbs', s).value = carbs;
    $('#g-fat', s).value = fat; $('#g-fiber', s).value = fiber; $('#g-water', s).value = water;
    $('#calc-info', s).textContent = `Métabolisme de base ≈ ${r0(bmr)} kcal · Dépense journalière ≈ ${r0(tdee)} kcal.`;
  });
  $('#g-save', s).addEventListener('click', () => {
    for (const k of ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'water']) state.goals[k] = r0(num($('#g-' + k, s).value));
    save(); closeSheet(); render(); toast('Objectifs enregistrés');
  });
}

function guessMealType() {
  const h = new Date().getHours();
  if (h < 11) return 'Petit-déjeuner';
  if (h < 15) return 'Déjeuner';
  if (h < 18) return 'Collation';
  return 'Dîner';
}

function openMealEditor(meal) {
  const isNew = !meal.id;
  const m = { id: uid(), date: ui.nutDate, mealType: guessMealType(), name: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', source: 'manuel', createdAt: Date.now(), ...meal };
  const s = openSheet(isNew ? '✍️ Ajouter un aliment' : '🍽️ Modifier le repas', `
    ${m.thumb ? `<img src="${m.thumb}" style="width:100%;border-radius:14px;margin-bottom:12px;max-height:220px;object-fit:cover">` : ''}
    <label class="field"><span>Nom</span><input id="m-name" value="${esc(m.name)}" placeholder="Ex. Poulet riz brocolis"></label>
    <div class="grid2">
      <label class="field"><span>Repas</span><select id="m-type">${MEAL_TYPES.map(t => `<option ${t === m.mealType ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="field"><span>Date</span><input type="date" id="m-date" value="${m.date}"></label>
      <label class="field"><span>Calories (kcal)</span><input id="m-kcal" inputmode="decimal" value="${esc(m.kcal)}"></label>
      <label class="field"><span>Protéines (g)</span><input id="m-protein" inputmode="decimal" value="${esc(m.protein)}"></label>
      <label class="field"><span>Glucides (g)</span><input id="m-carbs" inputmode="decimal" value="${esc(m.carbs)}"></label>
      <label class="field"><span>dont sucres (g)</span><input id="m-sugar" inputmode="decimal" value="${esc(m.sugar)}"></label>
      <label class="field"><span>Lipides (g)</span><input id="m-fat" inputmode="decimal" value="${esc(m.fat)}"></label>
      <label class="field"><span>Fibres (g)</span><input id="m-fiber" inputmode="decimal" value="${esc(m.fiber)}"></label>
    </div>
    <p class="muted small" id="m-calc"></p>
    ${m.details ? `<details class="card small"><summary>Détail de l’analyse IA</summary><div style="margin-top:8px">${m.details.map(it => `<div>${esc(it.name)} · ${r0(it.grams)} g · ${r0(it.kcal)} kcal</div>`).join('')}</div></details>` : ''}
    <div class="row">
      ${!isNew ? '<button class="btn danger" id="m-del">Supprimer</button><button class="btn" id="m-dup">Dupliquer aujourd’hui</button>' : ''}
      <button class="btn primary grow" id="m-save">Enregistrer</button>
    </div>`);
  const calc = () => {
    const k = num($('#m-protein', s).value) * 4 + num($('#m-carbs', s).value) * 4 + num($('#m-fat', s).value) * 9;
    $('#m-calc', s).textContent = k ? `Calories calculées à partir des macros : ${r0(k)} kcal` : '';
  };
  $$('input', s).forEach(i => i.addEventListener('input', calc)); calc();
  const read = () => {
    m.name = $('#m-name', s).value.trim() || 'Repas'; m.mealType = $('#m-type', s).value; m.date = $('#m-date', s).value;
    for (const k of ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar']) m[k] = num($('#m-' + k, s).value);
    if (!m.kcal) m.kcal = r0(m.protein * 4 + m.carbs * 4 + m.fat * 9);
  };
  $('#m-save', s).addEventListener('click', () => {
    read();
    const i = state.meals.findIndex(x => x.id === m.id);
    if (i >= 0) state.meals[i] = m; else state.meals.push(m);
    save(); closeSheet(); render(); toast('Repas enregistré ✅');
  });
  if (!isNew) {
    $('#m-del', s).addEventListener('click', () => { state.meals = state.meals.filter(x => x.id !== m.id); save(); closeSheet(); render(); });
    $('#m-dup', s).addEventListener('click', () => {
      read(); state.meals.push({ ...m, id: uid(), date: todayISO(), mealType: guessMealType(), createdAt: Date.now() });
      save(); closeSheet(); render(); toast('Ajouté à aujourd’hui');
    });
  }
}

/* ---------------- IA : analyse photo des macros ---------------- */

const NUTRITION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['meal_name', 'items', 'total', 'confidence', 'questions', 'notes'],
  properties: {
    meal_name: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'grams', 'kcal', 'protein', 'carbs', 'fat', 'fiber'],
        properties: {
          name: { type: 'string' }, grams: { type: 'number' }, kcal: { type: 'number' },
          protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' }, fiber: { type: 'number' },
        },
      },
    },
    total: {
      type: 'object', additionalProperties: false,
      required: ['kcal', 'protein', 'carbs', 'sugar', 'fat', 'fiber'],
      properties: { kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, sugar: { type: 'number' }, fat: { type: 'number' }, fiber: { type: 'number' } },
    },
    confidence: { type: 'string', enum: ['faible', 'moyenne', 'élevée'] },
    questions: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
};

const NUTRITION_SYSTEM = `Tu es un nutritionniste du sport francophone qui estime les apports d'un repas à partir d'une photo et/ou d'une description.
Méthode :
- Identifie chaque aliment visible (et les ingrédients cachés probables : huile de cuisson, beurre, sauce, sucre).
- Estime le poids de chaque portion en grammes en t'aidant des repères visuels (taille de l'assiette, des couverts, de la main, des emballages).
- Calcule kcal, protéines, glucides, lipides et fibres à partir de valeurs nutritionnelles de référence (Ciqual / étiquettes des produits connus). Le total doit être la somme des aliments ; ajoute le sucre total dans "total.sugar".
- Si un détail change nettement le résultat (quantité, mode de cuisson, sauce, type de produit, light ou non, marque…), pose 1 à 3 questions courtes et précises dans "questions". Donne quand même ta meilleure estimation.
- Quand l'utilisateur a répondu et que l'estimation est fiable, renvoie "questions": [].
- "notes" : une phrase utile (ex. conseil pour atteindre l'objectif protéines), en français, tutoiement.
Toutes les réponses textuelles sont en français.`;

let Anthropic = null;
async function getClient() {
  const key = state.settings.apiKey.trim();
  if (!key) throw new Error('NO_KEY');
  if (!Anthropic) Anthropic = (await import(SDK_URL)).default;
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
}

async function callNutritionAI(messages) {
  const client = await getClient();
  const model = state.settings.model;
  const params = {
    model,
    max_tokens: 16000,
    system: NUTRITION_SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: NUTRITION_SCHEMA } },
    messages,
  };
  let resp;
  if (model === 'claude-haiku-5-5') {
    resp = await client.messages.create(params);
  } else {
    // Repli automatique côté serveur si le modèle refuse la requête.
    resp = await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  }
  if (resp.stop_reason === 'refusal') throw new Error('Le modèle a refusé d’analyser cette image. Essaie une autre photo ou une description.');
  if (resp.stop_reason === 'max_tokens') throw new Error('Réponse incomplète, réessaie.');
  const text = resp.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return { data: JSON.parse(text), content: resp.content };
}

// Réduit la photo (économie de tokens et de stockage).
function resizeImage(file, max = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

function openAIMeal() {
  const ctx = { photo: null, thumb: null, messages: [], result: null, factor: 1, mealType: guessMealType(), busy: false };

  const s = openSheet('📷 Analyse IA du repas', `
    ${!state.settings.apiKey ? `<div class="card" style="border-color:var(--orange)"><b>Clé API manquante</b><p class="muted small">Ajoute ta clé API Anthropic dans <b>Réglages</b> pour activer l’analyse automatique.</p><button class="btn sm" id="go-settings">Aller aux réglages</button></div>` : ''}
    <div class="photo-drop" id="drop"><div class="muted">📸<br>Prends ton assiette en photo<br><small>ou décris simplement ton repas ci-dessous</small></div></div>
    <div class="grid2" style="margin:10px 0">
      <label class="btn"><input type="file" accept="image/*" capture="environment" id="cam" hidden>📷 Appareil photo</label>
      <label class="btn"><input type="file" accept="image/*" id="gal" hidden>🖼️ Galerie</label>
    </div>
    <label class="field"><span>Précisions (facultatif mais améliore la précision)</span>
      <textarea id="desc" placeholder="Ex. 150 g de riz cuit, blanc de poulet ~120 g cuit à l’huile d’olive, sauce soja"></textarea></label>
    <button class="btn primary block" id="analyze">🤖 Analyser</button>
    <div id="ai-out" style="margin-top:14px"></div>`);

  const gs = $('#go-settings', s);
  if (gs) gs.addEventListener('click', () => { closeSheet(); $('.tabbar [data-tab=settings]').click(); });

  const onFile = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      ctx.photo = await resizeImage(f, 1280, 0.85);
      ctx.thumb = await resizeImage(f, 160, 0.7);
      $('#drop', s).innerHTML = `<img src="${ctx.photo}" alt="Repas">`;
      ctx.messages = []; ctx.result = null; $('#ai-out', s).innerHTML = '';
    } catch (err) { toast(err.message); }
  };
  $('#cam', s).addEventListener('change', onFile);
  $('#gal', s).addEventListener('change', onFile);

  const run = async userContent => {
    if (ctx.busy) return;
    ctx.busy = true;
    const out = $('#ai-out', s);
    const btns = $$('#analyze, #answer', s); btns.forEach(b => b.disabled = true);
    const loading = document.createElement('div');
    loading.className = 'card row'; loading.innerHTML = '<span class="spinner"></span><span>Analyse en cours…</span>';
    out.prepend(loading);
    try {
      ctx.messages.push({ role: 'user', content: userContent });
      const { data, content } = await callNutritionAI(ctx.messages);
      ctx.messages.push({ role: 'assistant', content }); // historique conservé tel quel pour les questions de suivi
      ctx.result = data; ctx.factor = 1;
      drawResult();
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      ctx.messages.pop();
      loading.remove();
      const msg = err.message === 'NO_KEY' ? 'Ajoute ta clé API dans Réglages.'
        : err.status === 401 ? 'Clé API invalide.'
        : err.status === 429 ? 'Trop de requêtes, réessaie dans un instant.'
        : err instanceof SyntaxError ? 'Réponse illisible, réessaie.'
        : (err.message || 'Erreur réseau');
      out.insertAdjacentHTML('afterbegin', `<div class="card" style="border-color:var(--red)">⚠️ ${esc(msg)}</div>`);
    } finally {
      ctx.busy = false; $$('#analyze, #answer', s).forEach(b => b.disabled = false);
    }
  };

  $('#analyze', s).addEventListener('click', () => {
    const desc = $('#desc', s).value.trim();
    if (!ctx.photo && !desc) return toast('Ajoute une photo ou une description');
    ctx.messages = [];
    const content = [];
    if (ctx.photo) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: ctx.photo.split(',')[1] } });
    const g = state.goals;
    content.push({ type: 'text', text: `${desc ? 'Précisions de ma part : ' + desc : 'Pas de précision supplémentaire.'}\nMes objectifs journaliers : ${g.kcal} kcal, ${g.protein} g protéines, ${g.carbs} g glucides, ${g.fat} g lipides.\nAnalyse ce repas.` });
    run(content);
  });

  function drawResult() {
    const r = ctx.result; const f = ctx.factor;
    const out = $('#ai-out', s);
    const conf = { faible: 'bad', moyenne: 'warn', 'élevée': 'good' }[r.confidence] || '';
    out.innerHTML = `
      <div class="card">
        <div class="row between"><h3 style="margin:0">${esc(r.meal_name)}</h3><span class="pill ${conf}">confiance ${esc(r.confidence)}</span></div>
        <div class="grid3" style="grid-template-columns:repeat(4,1fr);margin:12px 0;text-align:center">
          <div><b style="font-size:20px">${r0(r.total.kcal * f)}</b><div class="muted small">kcal</div></div>
          <div><b style="font-size:20px;color:var(--pink)">${r0(r.total.protein * f)}</b><div class="muted small">prot. g</div></div>
          <div><b style="font-size:20px;color:var(--blue)">${r0(r.total.carbs * f)}</b><div class="muted small">gluc. g</div></div>
          <div><b style="font-size:20px;color:var(--orange)">${r0(r.total.fat * f)}</b><div class="muted small">lip. g</div></div>
        </div>
        <div class="muted small">Fibres ${r0(r.total.fiber * f)} g · Sucres ${r0(r.total.sugar * f)} g</div>
        <hr>
        ${r.items.map(it => `<div class="ai-item"><span>${esc(it.name)} <span class="muted small">· ${r0(it.grams * f)} g</span></span><b>${r0(it.kcal * f)} kcal</b>
          <span class="muted small" style="grid-column:1/-1">P ${r1(it.protein * f)} · G ${r1(it.carbs * f)} · L ${r1(it.fat * f)} · F ${r1(it.fiber * f)}</span></div>`).join('')}
        ${r.notes ? `<p class="small" style="margin-bottom:0">💡 ${esc(r.notes)}</p>` : ''}
      </div>

      ${r.questions.length ? `<div class="card">
        <h3>🤔 L’IA a besoin de précisions</h3>
        ${r.questions.map(q => `<div class="question small">${esc(q)}</div>`).join('')}
        <textarea id="answers" placeholder="Tes réponses…"></textarea>
        <button class="btn block" id="answer" style="margin-top:8px">↻ Répondre et affiner</button>
      </div>` : ''}

      <div class="card">
        <label class="field"><span>Portion réellement mangée : <b id="fac-l">${Math.round(f * 100)} %</b></span>
          <input type="range" id="fac" min="0.25" max="2" step="0.05" value="${f}"></label>
        <label class="field"><span>Repas</span><select id="ai-type">${MEAL_TYPES.map(t => `<option ${t === ctx.mealType ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <button class="btn primary block" id="ai-save">✅ Ajouter au journal</button>
        <button class="btn ghost block" id="ai-edit" style="margin-top:8px">✏️ Ajuster manuellement</button>
      </div>`;
    const ans = $('#answer', out);
    if (ans) ans.addEventListener('click', () => {
      const t = $('#answers', out).value.trim(); if (!t) return toast('Écris ta réponse');
      run([{ type: 'text', text: 'Mes réponses : ' + t + '\nMets à jour l’estimation.' }]);
    });
    const fac = $('#fac', out);
    fac.addEventListener('input', () => { $('#fac-l', out).textContent = Math.round(fac.value * 100) + ' %'; });
    fac.addEventListener('change', () => { ctx.factor = +fac.value; drawResult(); });
    $('#ai-type', out).addEventListener('change', e => ctx.mealType = e.target.value);
    const buildMeal = () => ({
      id: uid(), date: ui.nutDate, createdAt: Date.now(), source: 'ia', mealType: ctx.mealType, name: r.meal_name, thumb: ctx.thumb,
      kcal: r0(r.total.kcal * f), protein: r1(r.total.protein * f), carbs: r1(r.total.carbs * f), sugar: r1(r.total.sugar * f), fat: r1(r.total.fat * f), fiber: r1(r.total.fiber * f),
      details: r.items.map(it => ({ name: it.name, grams: it.grams * f, kcal: it.kcal * f })),
    });
    $('#ai-save', out).addEventListener('click', () => { state.meals.push(buildMeal()); save(); closeSheet(); render(); toast('Repas ajouté ✅'); });
    $('#ai-edit', out).addEventListener('click', () => { const m = buildMeal(); delete m.id; closeSheet(); openMealEditor(m); });
  }
}

/* ================================================================== */
/* BUDGET                                                              */
/* ================================================================== */

function catOf(id) { return EXPENSE_CATS.find(c => c.id === id) || EXPENSE_CATS[EXPENSE_CATS.length - 1]; }
function incOf(id) { return INCOME_TYPES.find(c => c.id === id) || INCOME_TYPES[INCOME_TYPES.length - 1]; }

function renderBudget(v) {
  const ym = ui.budgetMonth;
  const inc = state.incomes.filter(x => x.date.startsWith(ym));
  const exp = state.expenses.filter(x => x.date.startsWith(ym));
  const tIn = inc.reduce((a, x) => a + num(x.amount), 0);
  const tOut = exp.reduce((a, x) => a + num(x.amount), 0);
  const bal = tIn - tOut;

  v.innerHTML = `
    <div class="datenav">
      <button class="btn sm" id="bm-prev">‹</button><b>${fmtMonth(ym)}</b><button class="btn sm" id="bm-next">›</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="l">Revenus</div><div class="v amount-pos" style="font-size:17px">${money(tIn)}</div></div>
      <div class="stat"><div class="l">Dépenses</div><div class="v amount-neg" style="font-size:17px">${money(tOut)}</div></div>
      <div class="stat"><div class="l">Solde</div><div class="v" style="font-size:17px;color:${bal >= 0 ? 'var(--accent)' : 'var(--red)'}">${money(bal)}</div></div>
    </div>
    ${tIn ? `<div class="card tight small" style="margin-top:10px"><div class="row between"><span>Taux d’épargne</span><b>${r0(bal / tIn * 100)} %</b></div>
      <div class="bar" style="margin-top:6px;--c:${bal >= 0 ? 'var(--accent)' : 'var(--red)'}"><i style="width:${Math.max(0, Math.min(100, tOut / tIn * 100))}%"></i></div>
      <div class="muted" style="margin-top:4px">${r0(tOut / tIn * 100)} % des revenus dépensés</div></div>` : ''}
    <div class="seg" style="margin-top:12px">
      <button data-bt="depenses" class="${ui.budgetTab === 'depenses' ? 'active' : ''}">Dépenses</button>
      <button data-bt="revenus" class="${ui.budgetTab === 'revenus' ? 'active' : ''}">Revenus</button>
      <button data-bt="redbull" class="${ui.budgetTab === 'redbull' ? 'active' : ''}">🥫 Red Bull</button>
    </div>
    <div id="b-body"></div>`;

  $('#bm-prev', v).addEventListener('click', () => { ui.budgetMonth = shiftMonth(ym, -1); renderBudget(v); });
  $('#bm-next', v).addEventListener('click', () => { ui.budgetMonth = shiftMonth(ym, 1); renderBudget(v); });
  $$('[data-bt]', v).forEach(b => b.addEventListener('click', () => { ui.budgetTab = b.dataset.bt; renderBudget(v); }));

  const body = $('#b-body', v);
  if (ui.budgetTab === 'depenses') renderExpenses(body, exp, tOut);
  else if (ui.budgetTab === 'revenus') renderIncomes(body, inc, tIn);
  else renderRedBull(body);
}

function renderExpenses(body, exp, tOut) {
  const byCat = EXPENSE_CATS.map(c => ({ ...c, total: exp.filter(x => x.cat === c.id).reduce((a, x) => a + num(x.amount), 0) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const prev = state.expenses.filter(x => x.date.startsWith(shiftMonth(ui.budgetMonth, -1)));
  const prevBy = id => prev.filter(x => x.cat === id).reduce((a, x) => a + num(x.amount), 0);
  body.innerHTML = `
    <button class="btn primary block" id="add-exp">＋ Ajouter une dépense</button>
    <div class="chips" style="margin:12px 0">${EXPENSE_CATS.filter(c => c.id !== 'redbull').slice(0, 4).map(c => `<button class="chip" data-quick="${c.id}">${c.emoji} ${c.label}</button>`).join('')}</div>
    <h2>Par catégorie</h2>
    ${byCat.length ? `<div class="card">${byCat.map(c => {
      const p = prevBy(c.id); const diff = c.total - p;
      return `<div class="macro"><div class="row between"><span>${c.emoji} ${c.label}</span><span><b>${money(c.total)}</b> ${p ? `<span class="pill ${diff > 0 ? 'bad' : 'good'}">${diff > 0 ? '+' : ''}${money(diff)}</span>` : ''}</span></div>
        <div class="bar" style="--c:${c.color}"><i style="width:${c.total / tOut * 100}%"></i></div></div>`;
    }).join('')}<p class="muted small" style="margin:0">Badge = différence avec le mois précédent.</p></div>` : '<div class="card empty">Aucune dépense ce mois-ci.</div>'}
    <h2>Détail</h2>
    ${txList(exp, 'exp')}`;
  $('#add-exp', body).addEventListener('click', () => openTx('exp', {}));
  $$('[data-quick]', body).forEach(b => b.addEventListener('click', () => openTx('exp', { cat: b.dataset.quick })));
  bindTxList(body);
}

function renderIncomes(body, inc, tIn) {
  const byType = INCOME_TYPES.map(c => ({ ...c, total: inc.filter(x => x.type === c.id).reduce((a, x) => a + num(x.amount), 0) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  body.innerHTML = `
    <button class="btn primary block" id="add-inc">＋ Ajouter un revenu</button>
    <h2>Par type de revenu</h2>
    ${byType.length ? `<div class="card">${byType.map(c => `<div class="macro"><div class="row between"><span>${c.emoji} ${c.label}</span><b>${money(c.total)}</b></div>
      <div class="bar"><i style="width:${c.total / tIn * 100}%"></i></div></div>`).join('')}</div>` : '<div class="card empty">Aucun revenu saisi ce mois-ci.</div>'}
    <h2>Détail</h2>
    ${txList(inc, 'inc')}`;
  $('#add-inc', body).addEventListener('click', () => openTx('inc', {}));
  bindTxList(body);
}

function txList(items, kind) {
  if (!items.length) return '<div class="card empty">Rien pour l’instant.</div>';
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  return `<div class="card list">${sorted.map(x => {
    const meta = kind === 'exp' ? catOf(x.cat) : incOf(x.type);
    return `<div class="list-item" data-tx="${kind}:${x.id}"><div class="ico">${meta.emoji}</div>
      <div class="grow"><b>${esc(x.label || meta.label)}</b><div class="muted small">${meta.label} · ${fmtDate(x.date)}${x.qty > 1 ? ' · ' + x.qty + ' canettes' : ''}</div></div>
      <span class="${kind === 'exp' ? 'amount-neg' : 'amount-pos'}">${kind === 'exp' ? '−' : '+'}${money(x.amount)}</span></div>`;
  }).join('')}</div>`;
}
function bindTxList(body) {
  $$('[data-tx]', body).forEach(el => el.addEventListener('click', () => {
    const [kind, id] = el.dataset.tx.split(':');
    const arr = kind === 'exp' ? state.expenses : state.incomes;
    openTx(kind, arr.find(x => x.id === id));
  }));
}

function openTx(kind, tx) {
  const isNew = !tx.id;
  const isExp = kind === 'exp';
  const defDate = ui.budgetMonth === todayISO().slice(0, 7) ? todayISO() : ui.budgetMonth + '-01';
  const x = { id: uid(), date: defDate, amount: '', label: '', createdAt: Date.now(), ...(isExp ? { cat: 'essence' } : { type: 'salaire' }), ...tx };
  const s = openSheet(isExp ? (isNew ? '➖ Nouvelle dépense' : 'Modifier la dépense') : (isNew ? '➕ Nouveau revenu' : 'Modifier le revenu'), `
    <label class="field"><span>Montant (€)</span><input id="t-amount" inputmode="decimal" value="${esc(x.amount)}" placeholder="0,00" style="font-size:22px;font-weight:700"></label>
    <label class="field"><span>${isExp ? 'Catégorie' : 'Type de revenu'}</span></label>
    <div class="chips" id="t-cats" style="margin:-4px 0 12px">${(isExp ? EXPENSE_CATS : INCOME_TYPES).map(c => `<button class="chip ${(isExp ? x.cat : x.type) === c.id ? 'active' : ''}" data-c="${c.id}">${c.emoji} ${c.label}</button>`).join('')}</div>
    <div id="t-qty-wrap" class="${isExp && x.cat === 'redbull' ? '' : 'hidden'}"><label class="field"><span>Nombre de canettes</span><input id="t-qty" inputmode="numeric" value="${x.qty || 1}"></label></div>
    <label class="field"><span>Libellé</span><input id="t-label" value="${esc(x.label)}" placeholder="${isExp ? 'Ex. Total Énergies, McDo…' : 'Ex. Salaire novembre'}"></label>
    <label class="field"><span>Date</span><input type="date" id="t-date" value="${x.date}"></label>
    <div class="row">${!isNew ? '<button class="btn danger" id="t-del">Supprimer</button>' : ''}<button class="btn primary grow" id="t-save">Enregistrer</button></div>`);
  $$('[data-c]', s).forEach(b => b.addEventListener('click', () => {
    $$('[data-c]', s).forEach(o => o.classList.toggle('active', o === b));
    if (isExp) {
      x.cat = b.dataset.c;
      $('#t-qty-wrap', s).classList.toggle('hidden', x.cat !== 'redbull');
      if (x.cat === 'redbull' && !num($('#t-amount', s).value)) $('#t-amount', s).value = String(state.redbull.price * num($('#t-qty', s).value || 1)).replace('.', ',');
    } else x.type = b.dataset.c;
  }));
  setTimeout(() => $('#t-amount', s).focus(), 250);
  $('#t-save', s).addEventListener('click', () => {
    x.amount = Math.round(num($('#t-amount', s).value) * 100) / 100;
    if (!x.amount) return toast('Indique un montant');
    x.label = $('#t-label', s).value.trim(); x.date = $('#t-date', s).value;
    if (isExp && x.cat === 'redbull') x.qty = Math.max(1, r0(num($('#t-qty', s).value))); else delete x.qty;
    const arr = isExp ? state.expenses : state.incomes;
    const i = arr.findIndex(y => y.id === x.id);
    if (i >= 0) arr[i] = x; else arr.push(x);
    save(); closeSheet(); render(); toast('Enregistré ✅');
  });
  const del = $('#t-del', s);
  if (del) del.addEventListener('click', () => {
    if (isExp) state.expenses = state.expenses.filter(y => y.id !== x.id); else state.incomes = state.incomes.filter(y => y.id !== x.id);
    save(); closeSheet(); render();
  });
}

/* ---------------- Red Bull : objectif arrêt ---------------- */

function redbullByDay() {
  const map = {};
  for (const e of state.expenses) if (e.cat === 'redbull') map[e.date] = (map[e.date] || 0) + (e.qty || 1);
  return map;
}

function renderRedBull(body) {
  const rb = state.redbull;
  const byDay = redbullByDay();
  const today = todayISO();
  const todayCount = byDay[today] || 0;
  const ws = startOfWeek(today);
  const weekCount = Object.entries(byDay).filter(([d]) => d >= ws && d <= today).reduce((a, [, n]) => a + n, 0);
  const ym = today.slice(0, 7);
  const monthCans = Object.entries(byDay).filter(([d]) => d.startsWith(ym)).reduce((a, [, n]) => a + n, 0);
  const monthSpent = state.expenses.filter(e => e.cat === 'redbull' && e.date.startsWith(ym)).reduce((a, e) => a + num(e.amount), 0);
  const allDays = Object.keys(byDay).sort();
  const lastDay = allDays.filter(d => d <= today).pop();
  const daysWithout = lastDay ? Math.round((parseISO(today) - parseISO(lastDay)) / 86400000) : Math.round((parseISO(today) - parseISO(rb.startDate)) / 86400000);

  // meilleure série sans Red Bull depuis la date de début
  let best = 0, cur = 0;
  for (let d = rb.startDate; d <= today; d = addDays(d, 1)) { if (byDay[d]) cur = 0; else { cur++; best = Math.max(best, cur); } }

  // moyenne sur les 30 derniers jours -> projection annuelle
  let last30 = 0; for (let i = 0; i < 30; i++) last30 += byDay[addDays(today, -i)] || 0;
  const perYear = last30 / 30 * 365;
  const limitPct = rb.weeklyLimit ? weekCount / rb.weeklyLimit * 100 : (weekCount ? 100 : 0);

  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const maxD = Math.max(2, ...days.map(d => byDay[d] || 0));

  const mood = daysWithout >= 30 ? '🏆 Énorme, tu es en train de gagner !' : daysWithout >= 7 ? '🔥 Une semaine sans, continue !' : daysWithout >= 3 ? '💪 Bien parti, tiens bon.' : todayCount ? 'Pas grave, demain on recommence la série.' : 'Chaque jour sans compte 👊';

  body.innerHTML = `
    <div class="card redbull-hero">
      <div class="muted small">Jours sans Red Bull</div>
      <div class="big">${daysWithout}</div>
      <div class="small" style="margin:6px 0 14px">${mood}</div>
      <button class="btn redbull-btn" id="rb-add">🥫 J’en ai bu un (+${money(rb.price)})</button>
      ${todayCount ? `<div class="small muted" style="margin-top:8px">Aujourd’hui : ${todayCount} canette${todayCount > 1 ? 's' : ''} · <button class="icon-btn small" id="rb-undo" style="font-size:13px">annuler la dernière</button></div>` : ''}
    </div>

    <div class="card">
      <div class="row between"><b>Cette semaine</b><span>${weekCount} / ${rb.weeklyLimit} max</span></div>
      <div class="bar" style="margin:8px 0;--c:${limitPct > 100 ? 'var(--red)' : limitPct >= 80 ? 'var(--orange)' : 'var(--accent)'}"><i style="width:${Math.min(100, limitPct)}%"></i></div>
      <div class="muted small">${weekCount > rb.weeklyLimit ? 'Objectif hebdo dépassé — baisse progressivement la limite pour arrêter.' : `Encore ${rb.weeklyLimit - weekCount} autorisée(s) cette semaine. Objectif final : 0.`}</div>
    </div>

    <div class="stats">
      <div class="stat"><div class="v">${monthCans}</div><div class="l">canettes ce mois</div></div>
      <div class="stat"><div class="v" style="font-size:17px">${money(monthSpent)}</div><div class="l">dépensés ce mois</div></div>
      <div class="stat"><div class="v">${best}</div><div class="l">meilleure série (j)</div></div>
    </div>

    <div class="card" style="margin-top:12px">
      <b>14 derniers jours</b>
      <div class="minichart">${days.map(d => `<div class="col"><i style="height:${(byDay[d] || 0) / maxD * 100}%;--c:var(--red)"></i><small>${parseISO(d).getDate()}</small></div>`).join('')}</div>
    </div>

    <div class="card">
      <b>💸 Ce que tu économises en arrêtant</b>
      <p class="small muted" style="margin:6px 0 0">Au rythme des 30 derniers jours (${last30} canette${last30 > 1 ? 's' : ''}), ça fait <b style="color:var(--text)">${r0(perYear)} canettes</b> et <b style="color:var(--text)">${money(perYear * rb.price)}</b> par an,
      soit ~${r0(perYear * 112)} kcal et ~${(r0(perYear * 27.5 / 100) / 10).toLocaleString('fr-FR')} kg de sucre (canette 25 cl : 112 kcal, 27,5 g de sucre, 80 mg de caféine).</p>
    </div>

    <div class="card">
      <b>Réglages Red Bull</b>
      <div class="grid2" style="margin-top:8px">
        <label class="field"><span>Prix d’une canette (€)</span><input id="rb-price" inputmode="decimal" value="${String(rb.price).replace('.', ',')}"></label>
        <label class="field"><span>Limite par semaine</span><input id="rb-limit" inputmode="numeric" value="${rb.weeklyLimit}"></label>
      </div>
      <label class="field"><span>Début du défi</span><input type="date" id="rb-start" value="${rb.startDate}"></label>
      <button class="btn block" id="rb-save">Enregistrer</button>
    </div>`;

  $('#rb-add', body).addEventListener('click', () => {
    state.expenses.push({ id: uid(), date: today, cat: 'redbull', qty: 1, amount: rb.price, label: 'Red Bull', createdAt: Date.now() });
    save(); render();
    toast(weekCount + 1 > rb.weeklyLimit ? '⚠️ Limite de la semaine dépassée' : 'Noté. Tu peux le faire 💪');
  });
  const undo = $('#rb-undo', body);
  if (undo) undo.addEventListener('click', () => {
    const last = state.expenses.filter(e => e.cat === 'redbull' && e.date === today).sort((a, b) => b.createdAt - a.createdAt)[0];
    if (last) { state.expenses = state.expenses.filter(e => e.id !== last.id); save(); render(); }
  });
  $('#rb-save', body).addEventListener('click', () => {
    rb.price = num($('#rb-price', body).value) || rb.price;
    rb.weeklyLimit = Math.max(0, r0(num($('#rb-limit', body).value)));
    rb.startDate = $('#rb-start', body).value || rb.startDate;
    save(); render(); toast('Réglages Red Bull enregistrés');
  });
}

/* ================================================================== */
/* RÉGLAGES                                                            */
/* ================================================================== */

function renderSettings(v) {
  const st = state.settings;
  const size = new Blob([localStorage.getItem(STORE_KEY) || '']).size;
  v.innerHTML = `
    <div class="card">
      <h3>🤖 Intelligence artificielle (analyse des repas)</h3>
      <p class="muted small">L’analyse photo utilise l’API Claude d’Anthropic. Crée une clé sur <b>console.anthropic.com</b> puis colle-la ici. Elle reste uniquement sur cet appareil.</p>
      <label class="field"><span>Clé API</span><input type="password" id="s-key" value="${esc(st.apiKey)}" placeholder="sk-ant-…" autocomplete="off"></label>
      <label class="field"><span>Modèle</span><select id="s-model">${AI_MODELS.map(m => `<option value="${m.id}" ${m.id === st.model ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
      <button class="btn primary block" id="s-save">Enregistrer</button>
    </div>
    <div class="card">
      <h3>💾 Mes données</h3>
      <p class="muted small">Tout est enregistré dans ce navigateur (${r1(size / 1024)} Ko). Exporte régulièrement pour garder une sauvegarde.</p>
      <div class="grid2">
        <button class="btn" id="s-export">⬇️ Exporter</button>
        <label class="btn"><input type="file" accept="application/json" id="s-import" hidden>⬆️ Importer</label>
      </div>
      <button class="btn ghost block" style="margin-top:10px" id="s-photos">🧹 Supprimer les miniatures photo</button>
      <button class="btn danger block" style="margin-top:10px" id="s-reset">Tout effacer</button>
    </div>
    <div class="card">
      <h3>🔄 Mise à jour</h3>
      <p class="muted small">Version installée : <b style="color:var(--text)">${APP_VERSION}</b></p>
      <button class="btn block" id="s-update">🔄 Mettre à jour l’app</button>
    </div>
    <p class="muted small" style="text-align:center">Astuce : sur iPhone, Partager → « Sur l’écran d’accueil » pour l’utiliser comme une app.</p>`;

  $('#s-save', v).addEventListener('click', () => {
    st.apiKey = $('#s-key', v).value.trim(); st.model = $('#s-model', v).value; save(); toast('Réglages enregistrés');
  });
  $('#s-export', v).addEventListener('click', () => {
    const data = { ...state, settings: { ...state.settings, apiKey: '' } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nibrass-${todayISO()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#s-import', v).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!confirm('Remplacer les données actuelles par celles du fichier ?')) return;
      const key = state.settings.apiKey;
      localStorage.setItem(STORE_KEY, JSON.stringify(data)); state = load();
      if (!state.settings.apiKey) state.settings.apiKey = key;
      save(); render(); toast('Données importées');
    } catch { toast('Fichier invalide'); }
  });
  $('#s-update', v).addEventListener('click', async e => {
    e.target.disabled = true; e.target.textContent = 'Téléchargement…';
    // Force le téléchargement des derniers fichiers (sans toucher aux données enregistrées).
    try { await Promise.all(['./', 'index.html', 'app.js', 'style.css', 'manifest.webmanifest'].map(f => fetch(f, { cache: 'reload' }))); } catch { /* hors ligne */ }
    location.reload();
  });
  $('#s-photos', v).addEventListener('click', () => { state.meals.forEach(m => delete m.thumb); save(); render(); toast('Miniatures supprimées'); });
  $('#s-reset', v).addEventListener('click', () => {
    if (!confirm('Effacer TOUTES les données (séances, repas, budget) ?')) return;
    const key = state.settings.apiKey; state = defaultState(); state.settings.apiKey = key; save(); render(); toast('Données effacées');
  });
}

render();
