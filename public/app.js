// Nibrass – application d'apprentissage de l'anglais en musique.
const view = document.getElementById('view');
let status = { ai: false, musickit: false };

// ---------- Utilitaires ----------
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function getPassword() {
  try { return localStorage.getItem('nibrass-password') || ''; } catch { return ''; }
}

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-app-password': getPassword(), ...(opts.headers || {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    const pwd = prompt('Mot de passe de Nibrass :');
    if (pwd) {
      try { localStorage.setItem('nibrass-password', pwd); } catch {}
      return api(path, opts);
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

function speak(text) {
  if (!('speechSynthesis' in window)) return toast('Synthèse vocale non disponible');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}
window.speak = speak;

const boxes = (n) => `<span class="boxes" title="Niveau ${n}/5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const artwork = (s, cls = '') => (s.artwork ? `<img class="${cls}" src="${esc(s.artwork)}" alt="" loading="lazy">` : `<div class="ph ${cls}">🎵</div>`);
const loading = (msg = 'Chargement…') => `<div class="empty"><span class="spinner"></span> ${esc(msg)}</div>`;

async function refreshStreak() {
  try {
    const t = await api('/today');
    document.getElementById('streak').textContent = `🔥 ${t.streak}`;
    return t;
  } catch { return null; }
}

// ---------- Routeur ----------
const routes = {
  '': renderHome,
  playlist: renderPlaylist,
  song: renderSong,
  grammar: renderGrammar,
  vocab: renderVocab,
  quiz: renderQuiz,
  journal: renderJournal,
};

async function router() {
  const [, name = '', arg] = location.hash.split('/');
  document.querySelectorAll('.tabs a').forEach((a) => {
    const tab = a.dataset.tab;
    a.classList.toggle('active', tab === (name || 'home') || (name === 'song' && tab === 'playlist'));
  });
  view.innerHTML = loading();
  try {
    await (routes[name] || renderHome)(arg && decodeURIComponent(arg));
  } catch (err) {
    view.innerHTML = `<div class="card"><h2>Oups</h2><p>${esc(err.message)}</p></div>`;
  }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', router);

// ---------- Accueil ----------
async function renderHome() {
  const t = await refreshStreak();
  const songs = await api('/songs');
  const max = Math.max(1, ...t.history.map((d) => d.count));
  const quizLabel = t.quiz
    ? t.quiz.done === t.quiz.total ? `Terminé : ${t.quiz.score}/${t.quiz.total} ✅` : `En cours : ${t.quiz.done}/${t.quiz.total}`
    : 'Prêt à être généré';
  const next = songs.find((s) => !s.lesson);
  view.innerHTML = `
    <section class="card hero">
      <h1>Hello! 👋</h1>
      <p>Apprends l'anglais avec les chansons que tu aimes. Chaque jour : une chanson, quelques mots, un quiz.</p>
      <div class="row">
        <a class="btn secondary" href="#/quiz">⭐ Quiz du jour</a>
        <a class="btn secondary" href="#/playlist">🎧 Ma playlist</a>
      </div>
    </section>
    ${!status.ai ? `<div class="card"><b>ℹ️ IA non configurée.</b> <span class="muted">Ajoute ta clé <code>ANTHROPIC_API_KEY</code> dans le fichier <code>.env</code> pour générer les cours et les quiz personnalisés.</span></div>` : ''}
    <section class="card stats">
      <div class="stat"><b>${t.streak}</b><span class="muted small">jours d'affilée</span></div>
      <div class="stat"><b>${t.lessons}/${t.songs}</b><span class="muted small">chansons étudiées</span></div>
      <div class="stat"><b>${t.words}</b><span class="muted small">mots appris</span></div>
      <div class="stat"><b>${t.due}</b><span class="muted small">mots à réviser</span></div>
    </section>
    <section class="card">
      <div class="row spread"><h3>⭐ Quiz du jour</h3><span class="badge accent">${esc(quizLabel)}</span></div>
      <p class="muted small">Il est construit à partir de ce que tu as fait aujourd'hui : chansons écoutées, mots appris et ton journal.</p>
      <a class="btn" href="#/quiz">Faire mon quiz</a>
    </section>
    ${next ? `
    <section class="card">
      <h3>🎯 Prochaine chanson à étudier</h3>
      <div class="result">${next.artwork ? `<img src="${esc(next.artwork)}" alt="">` : ''}
        <div class="grow"><b>${esc(next.title)}</b><div class="muted small">${esc(next.artist)}</div></div>
        <a class="btn small" href="#/song/${next.id}">Étudier</a></div>
    </section>` : ''}
    <section class="card">
      <h3>📈 Tes 14 derniers jours</h3>
      <div class="days">${t.history.map((d) => `<div class="${d.count ? '' : 'zero'}" style="height:${Math.max(4, (d.count / max) * 100)}%" title="${d.date} : ${d.count} activité(s)${d.quiz ? ' · quiz ' + d.quiz : ''}"></div>`).join('')}</div>
    </section>`;
}

// ---------- Playlist ----------
async function renderPlaylist() {
  const songs = await api('/songs');
  view.innerHTML = `
    <h1>🎧 Ma playlist</h1>
    <section class="card">
      <h3>Importer depuis Apple Music</h3>
      ${status.musickit
        ? `<p class="muted small">Connecte ton compte pour importer une de tes playlists.</p><button class="btn" id="connect">🍎 Connecter Apple Music</button><div id="playlists"></div>`
        : `<p class="muted small">La connexion directe à Apple Music demande une clé MusicKit (voir le README). En attendant, cherche tes chansons ci-dessous ou colle la liste de ta playlist.</p>`}
      <details style="margin-top:10px"><summary>Coller une liste de chansons</summary>
        <p class="muted small">Une chanson par ligne : <code>Titre - Artiste</code>. Depuis l'app Musique sur Mac, tu peux aussi sélectionner les morceaux d'une playlist (⌘A), les copier (⌘C) et les coller ici.</p>
        <textarea id="paste" placeholder="Blinding Lights - The Weeknd&#10;Someone Like You - Adele"></textarea>
        <button class="btn" id="importPaste" style="margin-top:8px">Importer</button>
      </details>
    </section>
    <section class="card">
      <h3>Ajouter une chanson</h3>
      <form id="searchForm" class="row"><input id="q" placeholder="Titre ou artiste (ex. Adele Hello)" style="flex:1"><button class="btn">Chercher</button></form>
      <div id="results"></div>
    </section>
    <h2>${songs.length} chanson${songs.length > 1 ? 's' : ''}</h2>
    ${songs.length ? `<div class="grid">${songs.map(songCard).join('')}</div>` : `<div class="empty">Ta playlist est vide. Ajoute ta première chanson ! 🎶</div>`}`;

  document.getElementById('searchForm').onsubmit = async (e) => {
    e.preventDefault();
    const q = document.getElementById('q').value.trim();
    const box = document.getElementById('results');
    if (!q) return;
    box.innerHTML = loading('Recherche…');
    try {
      const results = await api('/search?q=' + encodeURIComponent(q));
      box.innerHTML = results.length ? results.map((r, i) => `
        <div class="result">${r.artwork ? `<img src="${esc(r.artwork)}" alt="">` : ''}
          <div class="grow"><b>${esc(r.title)}</b><div class="muted small">${esc(r.artist)} · ${esc(r.album)}</div></div>
          <button class="btn small" data-add="${i}">＋</button></div>`).join('') : '<p class="muted">Aucun résultat.</p>';
      box.querySelectorAll('[data-add]').forEach((b) => (b.onclick = async () => {
        await api('/songs', { method: 'POST', body: results[b.dataset.add] });
        toast('Ajoutée à ta playlist ✅');
        renderPlaylist();
      }));
    } catch (err) { box.innerHTML = `<p>${esc(err.message)}</p>`; }
  };

  document.getElementById('importPaste').onclick = async () => {
    const items = parsePastedList(document.getElementById('paste').value);
    if (!items.length) return toast('Aucune chanson reconnue');
    const added = await api('/songs', { method: 'POST', body: items });
    toast(`${added.length} chanson(s) importée(s)`);
    enrichArtwork(added);
    renderPlaylist();
  };

  const connect = document.getElementById('connect');
  if (connect) connect.onclick = connectAppleMusic;
}

function songCard(s) {
  return `<a class="song" href="#/song/${s.id}">${artwork(s)}
    <div class="meta"><div class="t">${esc(s.title)}</div><div class="a">${esc(s.artist)}</div>
    ${s.lesson ? `<span class="badge ok">Leçon prête · ${esc(s.lesson.level)}</span>` : `<span class="badge">À étudier</span>`}</div></a>`;
}

// Reconnaît « Titre - Artiste » ou les lignes copiées depuis l’app Musique (séparées par des tabulations).
function parsePastedList(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim()).filter((p) => p && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(p) && !/^\d+$/.test(p));
      if (parts.length >= 2) out.push({ title: parts[0], artist: parts[1], album: parts[2] || '' });
      continue;
    }
    const m = line.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (m) out.push({ title: m[1].trim(), artist: m[2].trim() });
  }
  return out;
}

// Ajoute pochettes et extraits aux chansons importées par copier-coller.
async function enrichArtwork(songs) {
  for (const s of songs.slice(0, 30)) {
    try {
      const r = await api('/search?q=' + encodeURIComponent(`${s.title} ${s.artist}`));
      const { artwork, previewUrl, appleUrl, appleId, album } = r[0] || {};
      if (r[0]) await api('/songs/' + s.id, { method: 'PATCH', body: { artwork, previewUrl, appleUrl, appleId, album: s.album || album } });
    } catch {}
  }
  if (location.hash.startsWith('#/playlist')) renderPlaylist();
}

// ---------- Apple Music (MusicKit JS) ----------
async function loadMusicKit() {
  if (window.MusicKit) return window.MusicKit;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
    s.async = true;
    s.onerror = () => reject(new Error('Impossible de charger MusicKit'));
    document.addEventListener('musickitloaded', resolve, { once: true });
    document.head.appendChild(s);
  });
  return window.MusicKit;
}

async function getMusic() {
  const MK = await loadMusicKit();
  if (!getMusic.instance) {
    const { token } = await api('/musickit/token');
    await MK.configure({ developerToken: token, app: { name: 'Nibrass', build: '1.0.0' } });
    getMusic.instance = MK.getInstance();
  }
  return getMusic.instance;
}

async function fetchAll(music, path) {
  const items = [];
  let next = path;
  while (next && items.length < 1000) {
    const r = await music.api.music(next, next === path ? { limit: 100 } : undefined);
    items.push(...(r.data.data || []));
    next = r.data.next;
  }
  return items;
}

async function connectAppleMusic() {
  const box = document.getElementById('playlists');
  box.innerHTML = loading('Connexion à Apple Music…');
  try {
    const music = await getMusic();
    await music.authorize();
    const playlists = await fetchAll(music, '/v1/me/library/playlists');
    box.innerHTML = `<p class="muted small">Choisis une playlist à importer :</p>` + playlists.map((p, i) => `
      <div class="result"><div class="grow"><b>${esc(p.attributes?.name)}</b></div>
      <button class="btn small" data-pl="${i}">Importer</button></div>`).join('');
    box.querySelectorAll('[data-pl]').forEach((b) => (b.onclick = async () => {
      const p = playlists[b.dataset.pl];
      b.disabled = true;
      b.innerHTML = '<span class="spinner"></span>';
      const tracks = await fetchAll(music, `/v1/me/library/playlists/${p.id}/tracks`);
      const items = tracks.map((t) => ({
        title: t.attributes?.name,
        artist: t.attributes?.artistName,
        album: t.attributes?.albumName,
        artwork: t.attributes?.artwork?.url?.replace('{w}', '300').replace('{h}', '300'),
        previewUrl: t.attributes?.previews?.[0]?.url || '',
        appleId: t.attributes?.playParams?.catalogId || t.id,
        playlist: p.attributes?.name,
      }));
      const added = await api('/songs', { method: 'POST', body: items });
      toast(`${added.length} chanson(s) importée(s) depuis « ${p.attributes?.name} »`);
      renderPlaylist();
    }));
  } catch (err) {
    box.innerHTML = `<p>${esc(err.message || err)}</p>`;
  }
}

// ---------- Page chanson / leçon ----------
async function renderSong(id) {
  const songs = await api('/songs');
  const s = songs.find((x) => x.id === id);
  if (!s) throw new Error('Chanson introuvable');
  const L = s.lesson;
  view.innerHTML = `
    <section class="card">
      <div class="song-head">${s.artwork ? `<img src="${esc(s.artwork)}" alt="">` : ''}
        <div><h1>${esc(s.title)}</h1><div class="muted">${esc(s.artist)}${s.album ? ' · ' + esc(s.album) : ''}</div>
        ${L ? `<div class="chips" style="margin-top:6px"><span class="badge accent">Niveau ${esc(L.level)}</span>${(L.themes || []).map((t) => `<span class="badge">${esc(t)}</span>`).join('')}</div>` : ''}</div></div>
      ${s.previewUrl ? `<audio controls preload="none" src="${esc(s.previewUrl)}" id="audio"></audio>` : ''}
      <div class="row" style="margin-top:10px">
        ${s.appleUrl || s.appleId ? `<a class="btn secondary small" target="_blank" rel="noopener" href="${esc(s.appleUrl || 'https://music.apple.com/song/' + s.appleId)}" id="openApple">🍎 Écouter sur Apple Music</a>` : ''}
        <button class="btn ghost small" id="del">Retirer</button>
      </div>
    </section>
    <section class="card">
      <h3>${L ? '🔄 Refaire la leçon' : "✨ Créer ma leçon avec l'IA"}</h3>
      <details ${L ? '' : 'open'}><summary>Coller les paroles (facultatif, pour une analyse plus précise)</summary>
        <p class="muted small">Tu peux copier les paroles depuis Apple Music (onglet Paroles). Elles servent seulement à l'analyse et ne sont pas enregistrées.</p>
        <textarea id="lyrics" placeholder="Colle les paroles ici…"></textarea>
      </details>
      <button class="btn" id="analyze" style="margin-top:10px" ${status.ai ? '' : 'disabled'}>${L ? 'Régénérer' : 'Générer la leçon'}</button>
      ${status.ai ? '' : '<p class="muted small">Configure ANTHROPIC_API_KEY pour activer l’IA.</p>'}
    </section>
    <div id="lesson">${L ? lessonHtml(L) : ''}</div>`;

  const audio = document.getElementById('audio');
  let logged = false;
  const logListen = () => { if (!logged) { logged = true; api(`/songs/${s.id}/listen`, { method: 'POST' }).then(refreshStreak); } };
  if (audio) audio.addEventListener('play', logListen);
  document.getElementById('openApple')?.addEventListener('click', logListen);

  document.getElementById('del').onclick = async () => {
    if (!confirm('Retirer cette chanson de ta playlist ?')) return;
    await api('/songs/' + s.id, { method: 'DELETE' });
    location.hash = '#/playlist';
  };
  document.getElementById('analyze').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> L’IA écoute la chanson…';
    try {
      const updated = await api(`/songs/${s.id}/analyze`, { method: 'POST', body: { lyrics: document.getElementById('lyrics').value } });
      document.getElementById('lesson').innerHTML = lessonHtml(updated.lesson);
      bindLesson();
      toast('Leçon prête ! Les mots ont été ajoutés à ton vocabulaire.');
      btn.textContent = 'Régénérer';
      refreshStreak();
    } catch (err) {
      toast(err.message);
      btn.textContent = 'Réessayer';
    }
    btn.disabled = false;
  };
  bindLesson();
}

function lessonHtml(L) {
  return `
    <section class="card"><h2 style="margin-top:0">🎭 Interprétation</h2><p>${esc(L.interpretation_fr)}</p>
      ${L.mood ? `<p class="muted small">Ambiance : ${esc(L.mood)}</p>` : ''}
      ${L.fun_fact_fr ? `<p class="small">💡 ${esc(L.fun_fact_fr)}</p>` : ''}</section>
    <section class="card"><h2 style="margin-top:0">📘 Grammaire</h2>
      ${L.grammar.map(grammarHtml).join('<hr style="border:none;border-top:1px solid var(--border)">')}</section>
    <section class="card"><h2 style="margin-top:0">🗂️ Vocabulaire</h2>
      ${L.vocabulary.map((v) => `<div class="vocab-item"><button class="btn ghost small" data-say="${esc(v.word)}" aria-label="Prononcer">🔊</button>
        <div class="grow"><span class="word">${esc(v.word)}</span> <span class="badge">${esc(v.type)}</span> → ${esc(v.translation)}
        <div class="muted small"><i>${esc(v.example)}</i></div>${v.note ? `<div class="small">${esc(v.note)}</div>` : ''}</div></div>`).join('')}</section>
    ${L.expressions?.length ? `<section class="card"><h2 style="margin-top:0">🗣️ Expressions & argot</h2>
      ${L.expressions.map((x) => `<div class="vocab-item"><button class="btn ghost small" data-say="${esc(x.expression)}">🔊</button><div class="grow"><span class="word">${esc(x.expression)}</span> → ${esc(x.meaning_fr)}<div class="muted small">${esc(x.usage_fr)}</div></div></div>`).join('')}</section>` : ''}
    ${L.pronunciation_tip_fr ? `<section class="card"><h3>👄 Prononciation</h3><p>${esc(L.pronunciation_tip_fr)}</p></section>` : ''}`;
}

function grammarHtml(g) {
  return `<div><h3>${esc(g.topic)}</h3>
    <p>${esc(g.rule_fr)}</p>
    ${g.song_example ? `<p>🎵 <i>« ${esc(g.song_example)} »</i> <button class="btn ghost small" data-say="${esc(g.song_example)}">🔊</button></p>` : ''}
    <p class="small">${esc(g.explanation_fr)}</p>
    ${g.more_examples?.length ? `<ul class="small">${g.more_examples.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
    ${g.exercise_question ? `<details><summary>✍️ Exercice : ${esc(g.exercise_question)}</summary><p><b>Réponse :</b> ${esc(g.exercise_answer)}</p></details>` : ''}</div>`;
}

function bindLesson() {
  view.querySelectorAll('[data-say]').forEach((b) => (b.onclick = () => speak(b.dataset.say)));
}

// ---------- Grammaire ----------
async function renderGrammar() {
  const items = await api('/grammar');
  const byTopic = {};
  for (const g of items) (byTopic[g.topic.toLowerCase()] ||= { topic: g.topic, list: [] }).list.push(g);
  const groups = Object.values(byTopic).sort((a, b) => b.list.length - a.list.length);
  view.innerHTML = `<h1>📘 Grammaire</h1>
    <p class="muted">Toutes les règles découvertes dans tes chansons, regroupées par thème.</p>
    ${groups.length ? groups.map((gr) => `
      <section class="card"><div class="row spread"><h3>${esc(gr.topic)}</h3><span class="badge">${gr.list.length} chanson(s)</span></div>
      ${gr.list.map((g) => `<details><summary>🎵 ${esc(g.songTitle)} – ${esc(g.artist)}</summary>${grammarHtml(g)}<a class="small" href="#/song/${g.songId}">Voir la leçon</a></details>`).join('')}
      </section>`).join('') : `<div class="empty">Étudie une chanson pour voir apparaître tes premiers cours de grammaire.</div>`}`;
  bindLesson();
}

// ---------- Vocabulaire ----------
async function renderVocab() {
  const words = await api('/vocab');
  const due = words.filter((w) => w.due);
  view.innerHTML = `<h1>🗂️ Vocabulaire</h1>
    <section class="card hero">
      <h3>${due.length} mot(s) à réviser aujourd'hui</h3>
      <p class="muted">Révision espacée : plus tu connais un mot, moins il revient souvent.</p>
      <button class="btn secondary" id="flash" ${due.length ? '' : 'disabled'}>Réviser avec les flashcards</button>
    </section>
    <div id="flashzone"></div>
    <section class="card">
      <div class="row"><input id="filter" placeholder="Filtrer…" style="flex:1">
      <select id="sort" style="width:auto"><option value="recent">Récents</option><option value="az">A → Z</option><option value="weak">À travailler</option></select></div>
      <div id="vlist"></div>
    </section>
    <section class="card"><details><summary>＋ Ajouter un mot moi-même</summary>
      <form id="addWord"><label>Mot anglais</label><input name="word" required><label>Traduction</label><input name="translation" required>
      <label>Exemple (facultatif)</label><input name="example"><button class="btn" style="margin-top:10px">Ajouter</button></form></details></section>`;

  const list = document.getElementById('vlist');
  const draw = () => {
    const f = document.getElementById('filter').value.toLowerCase();
    const sort = document.getElementById('sort').value;
    let ws = words.filter((w) => !f || w.word.toLowerCase().includes(f) || w.translation.toLowerCase().includes(f) || (w.songTitle || '').toLowerCase().includes(f));
    if (sort === 'az') ws.sort((a, b) => a.word.localeCompare(b.word));
    else if (sort === 'weak') ws.sort((a, b) => (a.box || 1) - (b.box || 1));
    else ws.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    list.innerHTML = ws.length ? ws.map((w) => `<div class="vocab-item"><button class="btn ghost small" data-say="${esc(w.word)}">🔊</button>
      <div class="grow"><span class="word">${esc(w.word)}</span> → ${esc(w.translation)} ${boxes(w.box || 1)} ${w.due ? '<span class="badge accent">à réviser</span>' : ''}
      ${w.example ? `<div class="muted small"><i>${esc(w.example)}</i></div>` : ''}
      ${w.songTitle ? `<div class="small muted">🎵 ${esc(w.songTitle)}</div>` : ''}</div>
      <button class="btn ghost small" data-del="${w.id}" aria-label="Supprimer">✕</button></div>`).join('') : '<div class="empty">Aucun mot pour l’instant.</div>';
    bindLesson();
    list.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      await api('/vocab/' + b.dataset.del, { method: 'DELETE' });
      words.splice(words.findIndex((w) => w.id === b.dataset.del), 1);
      draw();
    }));
  };
  document.getElementById('filter').oninput = draw;
  document.getElementById('sort').onchange = draw;
  draw();

  document.getElementById('addWord').onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    await api('/vocab', { method: 'POST', body: fd });
    toast('Mot ajouté ✅');
    renderVocab();
  };
  document.getElementById('flash').onclick = () => flashcards(due);
}

function flashcards(queue) {
  const zone = document.getElementById('flashzone');
  let i = 0, flipped = false, good = 0;
  const show = () => {
    if (i >= queue.length) {
      zone.innerHTML = `<section class="card empty"><h3>Bravo ! 🎉</h3><p>${good}/${queue.length} mots retenus.</p></section>`;
      refreshStreak();
      return;
    }
    const w = queue[i];
    zone.innerHTML = `<section class="card">
      <div class="progress"><div style="width:${(i / queue.length) * 100}%"></div></div>
      <div class="flashcard" id="card">${flipped
        ? `<div>${esc(w.translation)}<div class="sub">${esc(w.example || '')}</div></div>`
        : `<div>${esc(w.word)}<div class="sub">Touche pour voir la traduction</div></div>`}</div>
      ${flipped ? `<div class="row" style="justify-content:center"><button class="btn secondary" id="ko">😕 Pas encore</button><button class="btn" id="ok">😎 Je savais</button></div>` : ''}
    </section>`;
    document.getElementById('card').onclick = () => { if (!flipped) speak(w.word); flipped = !flipped; show(); };
    const answer = async (correct) => {
      await api(`/vocab/${w.id}/review`, { method: 'POST', body: { correct } });
      if (correct) good++;
      i++; flipped = false; show();
    };
    document.getElementById('ok')?.addEventListener('click', () => answer(true));
    document.getElementById('ko')?.addEventListener('click', () => answer(false));
  };
  show();
  zone.scrollIntoView({ behavior: 'smooth' });
}

// ---------- Quiz quotidien ----------
async function renderQuiz() {
  view.innerHTML = loading('Je prépare ton quiz à partir de ta journée…');
  let quiz;
  try {
    quiz = await api('/quiz/today');
  } catch (err) {
    view.innerHTML = `<h1>⭐ Quiz du jour</h1><div class="card empty"><p>${esc(err.message)}</p><a class="btn" href="#/playlist">Aller à ma playlist</a></div>`;
    return;
  }
  const drawQuestion = () => {
    const i = quiz.answers.findIndex((a) => !a);
    if (i === -1) return drawEnd();
    const q = quiz.questions[i];
    view.innerHTML = `<h1>⭐ Quiz du jour</h1>
      <p class="muted">${esc(quiz.intro_fr)}</p>
      <section class="card">
        <div class="row spread small muted"><span>Question ${i + 1}/${quiz.questions.length}</span><span>Score : ${quiz.score}</span></div>
        <div class="progress"><div style="width:${(i / quiz.questions.length) * 100}%"></div></div>
        <p class="small muted" style="margin-top:12px">${esc(q.prompt_fr)}</p>
        <div class="quiz-q">${esc(q.question)} <button class="btn ghost small" id="say">🔊</button></div>
        ${q.type === 'mcq' && q.options.length
          ? `<div class="options">${q.options.map((o, k) => `<button class="btn option" data-opt="${k}">${esc(o)}</button>`).join('')}</div>`
          : `<form id="free" class="row"><input id="ans" autocomplete="off" autocapitalize="off" placeholder="Ta réponse…" style="flex:1"><button class="btn">Valider</button></form>`}
        <div id="fb"></div>
      </section>`;
    document.getElementById('say').onclick = () => speak(q.question.replace(/_+/g, 'blank'));
    const submit = async (given, btn) => {
      const r = await api('/quiz/today/answer', { method: 'POST', body: { index: i, answer: given } });
      quiz = r.quiz;
      view.querySelectorAll('.option').forEach((b) => {
        b.disabled = true;
        if (b.textContent === q.answer) b.classList.add('right');
      });
      if (btn && !r.correct) btn.classList.add('wrong');
      document.getElementById('fb').innerHTML = `<div class="feedback ${r.correct ? 'right' : 'wrong'}">
        <b>${r.correct ? 'Bravo ! 🎉' : 'Pas tout à fait…'}</b> ${r.correct ? '' : `Réponse : <b>${esc(q.answer)}</b>`}
        <div class="small">${esc(q.explanation_fr)}</div></div>
        <button class="btn" id="next" style="margin-top:10px">Continuer →</button>`;
      document.getElementById('next').onclick = drawQuestion;
      document.getElementById('next').focus();
    };
    view.querySelectorAll('[data-opt]').forEach((b) => (b.onclick = () => submit(q.options[b.dataset.opt], b)));
    const form = document.getElementById('free');
    if (form) {
      document.getElementById('ans').focus();
      form.onsubmit = (e) => {
        e.preventDefault();
        form.querySelector('button').disabled = true;
        submit(document.getElementById('ans').value);
      };
    }
  };
  const drawEnd = () => {
    const total = quiz.questions.length;
    const pct = Math.round((quiz.score / total) * 100);
    view.innerHTML = `<h1>⭐ Quiz du jour</h1>
      <section class="card hero" style="text-align:center"><h2 style="margin-top:0">${pct >= 80 ? 'Excellent ! 🏆' : pct >= 50 ? 'Bien joué ! 💪' : 'Continue comme ça ! 🌱'}</h2>
      <p style="font-size:2rem;font-weight:800;margin:0">${quiz.score}/${total}</p>
      <p class="muted">Reviens demain pour un nouveau quiz basé sur ta journée.</p></section>
      <section class="card"><h3>Récapitulatif</h3>${quiz.questions.map((q, k) => `
        <div class="vocab-item"><span>${quiz.answers[k]?.correct ? '✅' : '❌'}</span><div class="grow"><b>${esc(q.question)}</b>
        <div class="small">Réponse : ${esc(q.answer)}${quiz.answers[k]?.correct ? '' : ` · toi : ${esc(quiz.answers[k]?.given || '—')}`}</div>
        <div class="small muted">${esc(q.explanation_fr)}</div></div></div>`).join('')}</section>
      <div class="row"><a class="btn secondary" href="#/journal">📓 Écrire mon journal</a>
      <button class="btn ghost" id="regen">Générer un nouveau quiz</button></div>`;
    document.getElementById('regen').onclick = async (e) => {
      if (!confirm('Remplacer le quiz du jour par un nouveau ?')) return;
      e.target.disabled = true;
      e.target.innerHTML = '<span class="spinner"></span>';
      quiz = await api('/quiz/today/regenerate', { method: 'POST' });
      drawQuestion();
    };
    refreshStreak();
  };
  drawQuestion();
}

// ---------- Journal ----------
const ACTIVITY_LABELS = {
  songs_added: (a) => `🎧 ${a.count} chanson(s) ajoutée(s)`,
  listen: (a) => `▶️ Écouté « ${a.title} » – ${a.artist}`,
  lesson: (a) => `✨ Leçon sur « ${a.title} » (+${a.newWords} mots)`,
  review: (a) => `${a.correct ? '😎' : '😕'} Révisé « ${a.word} »`,
  word_added: (a) => `＋ Mot ajouté : ${a.word}`,
  quiz_answer: (a) => `${a.correct ? '✅' : '❌'} Quiz : ${a.question}`,
  quiz_done: (a) => `🏁 Quiz terminé : ${a.score}/${a.total}`,
  journal: () => '📓 Journal écrit',
};

async function renderJournal() {
  const t = await api('/today');
  const j = await api('/journal/' + t.date);
  view.innerHTML = `<h1>📓 Mon journal</h1>
    <section class="card">
      <label for="jtext">Raconte ta journée en anglais ✍️</label>
      <p class="muted small">Même quelques phrases ! Ton quiz du jour s’en servira pour corriger tes erreurs.</p>
      <textarea id="jtext" placeholder="Today I listened to… I learned the word…">${esc(j.text)}</textarea>
      <button class="btn" id="save" style="margin-top:8px">Enregistrer</button>
    </section>
    <section class="card"><h3>Ce que tu as fait aujourd'hui</h3>
      ${t.activity.length ? `<ul class="timeline">${[...t.activity].reverse().map((a) => `<li><span class="muted small">${new Date(a.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span> ${esc((ACTIVITY_LABELS[a.type] || (() => a.type))(a))}</li>`).join('')}</ul>` : '<p class="muted">Rien pour l’instant — écoute une chanson pour commencer !</p>'}
    </section>`;
  document.getElementById('save').onclick = async () => {
    await api('/journal/' + t.date, { method: 'PUT', body: { text: document.getElementById('jtext').value } });
    toast('Journal enregistré 📓');
    refreshStreak();
  };
}

// ---------- Démarrage ----------
(async () => {
  try { status = await api('/status'); } catch {}
  refreshStreak();
  router();
})();
