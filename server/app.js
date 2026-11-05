import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { today } from './db.js';
import { aiEnabled, analyzeSong, generateQuiz } from './ai.js';
import { musicKitConfigured, developerToken } from './musickit.js';
import {
  dueWords,
  streak,
  pickQuizWords,
  isCorrect,
  localQuiz,
  reviewWord,
} from './learning.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function createApp(db, options = {}) {
  const ai = options.ai || { enabled: aiEnabled, analyzeSong, generateQuiz };
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Mot de passe optionnel pour protéger l'app (et ta clé API) si elle est en ligne.
  const password = process.env.APP_PASSWORD;
  app.use('/api', (req, res, next) => {
    if (!password || req.path === '/status') return next();
    if (req.get('x-app-password') === password) return next();
    res.status(401).json({ error: 'Mot de passe requis' });
  });

  const d = () => db.data;
  const log = (type, extra = {}) => {
    d().activity.push({ id: db.id(), date: today(), at: new Date().toISOString(), type, ...extra });
  };
  const findSong = (id) => d().songs.find((s) => s.id === id);

  app.get('/api/status', (req, res) => {
    res.json({
      ai: ai.enabled(),
      musickit: musicKitConfigured(),
      passwordRequired: Boolean(password),
      storefront: process.env.APPLE_STOREFRONT || 'fr',
      today: today(),
    });
  });

  app.get('/api/musickit/token', (req, res) => {
    const token = developerToken();
    if (!token) return res.status(404).json({ error: 'MusicKit non configuré' });
    res.json({ token });
  });

  // Recherche dans le catalogue Apple (iTunes Search API, gratuite, sans clé).
  app.get('/api/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const url = new URL('https://itunes.apple.com/search');
    url.search = new URLSearchParams({
      term: q,
      entity: 'song',
      limit: '15',
      country: process.env.APPLE_STOREFRONT || 'fr',
    });
    try {
      const r = await fetch(url);
      const json = await r.json();
      res.json(
        (json.results || []).map((t) => ({
          appleId: String(t.trackId),
          title: t.trackName,
          artist: t.artistName,
          album: t.collectionName,
          artwork: t.artworkUrl100?.replace('100x100', '300x300'),
          previewUrl: t.previewUrl,
          appleUrl: t.trackViewUrl,
        })),
      );
    } catch (err) {
      res.status(502).json({ error: 'Recherche Apple indisponible : ' + err.message });
    }
  });

  // ---- Chansons ----
  app.get('/api/songs', (req, res) => {
    res.json([...d().songs].sort((a, b) => b.addedAt.localeCompare(a.addedAt)));
  });

  app.post('/api/songs', (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const added = [];
    for (const item of items) {
      const title = String(item.title || '').trim();
      const artist = String(item.artist || '').trim();
      if (!title || !artist) continue;
      const dup = d().songs.find(
        (s) =>
          (item.appleId && s.appleId === String(item.appleId)) ||
          (s.title.toLowerCase() === title.toLowerCase() &&
            s.artist.toLowerCase() === artist.toLowerCase()),
      );
      if (dup) continue;
      const song = {
        id: db.id(),
        title,
        artist,
        album: item.album || '',
        artwork: item.artwork || '',
        previewUrl: item.previewUrl || '',
        appleUrl: item.appleUrl || '',
        appleId: item.appleId ? String(item.appleId) : '',
        playlist: item.playlist || '',
        addedAt: new Date().toISOString(),
        lesson: null,
      };
      d().songs.push(song);
      added.push(song);
    }
    if (added.length) log('songs_added', { count: added.length });
    db.save();
    res.status(201).json(added);
  });

  app.patch('/api/songs/:id', (req, res) => {
    const song = findSong(req.params.id);
    if (!song) return res.status(404).json({ error: 'Chanson introuvable' });
    for (const k of ['artwork', 'previewUrl', 'appleUrl', 'appleId', 'album']) {
      if (typeof req.body?.[k] === 'string') song[k] = req.body[k];
    }
    db.save();
    res.json(song);
  });

  app.delete('/api/songs/:id', (req, res) => {
    const before = d().songs.length;
    d().songs = d().songs.filter((s) => s.id !== req.params.id);
    d().grammar = d().grammar.filter((g) => g.songId !== req.params.id);
    db.save();
    res.json({ deleted: before - d().songs.length });
  });

  app.post('/api/songs/:id/listen', (req, res) => {
    const song = findSong(req.params.id);
    if (!song) return res.status(404).json({ error: 'Chanson introuvable' });
    log('listen', { songId: song.id, title: song.title, artist: song.artist });
    db.save();
    res.json({ ok: true });
  });

  app.post('/api/songs/:id/analyze', async (req, res) => {
    const song = findSong(req.params.id);
    if (!song) return res.status(404).json({ error: 'Chanson introuvable' });
    if (!ai.enabled()) {
      return res.status(503).json({ error: "L'IA n'est pas configurée (ANTHROPIC_API_KEY manquante)." });
    }
    try {
      const lesson = await ai.analyzeSong({
        title: song.title,
        artist: song.artist,
        lyrics: req.body?.lyrics,
      });
      song.lesson = { ...lesson, createdAt: new Date().toISOString() };
      d().grammar = d().grammar.filter((g) => g.songId !== song.id);
      for (const g of lesson.grammar) {
        d().grammar.push({ id: db.id(), songId: song.id, songTitle: song.title, artist: song.artist, ...g });
      }
      let newWords = 0;
      for (const v of lesson.vocabulary) {
        const exists = d().vocab.find((w) => w.word.toLowerCase() === v.word.toLowerCase());
        if (exists) continue;
        d().vocab.push({
          id: db.id(),
          ...v,
          songId: song.id,
          songTitle: song.title,
          box: 1,
          nextReview: today(),
          addedAt: new Date().toISOString(),
        });
        newWords++;
      }
      log('lesson', { songId: song.id, title: song.title, artist: song.artist, newWords });
      db.save();
      res.json(song);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Vocabulaire ----
  app.get('/api/vocab', (req, res) => {
    const due = new Set(dueWords(d().vocab).map((w) => w.id));
    res.json(d().vocab.map((w) => ({ ...w, due: due.has(w.id) })));
  });

  app.post('/api/vocab', (req, res) => {
    const { word, translation, example = '', note = '', type = '' } = req.body || {};
    if (!word || !translation) return res.status(400).json({ error: 'Mot et traduction requis' });
    const w = {
      id: db.id(),
      word: String(word).trim(),
      translation: String(translation).trim(),
      example,
      note,
      type,
      songId: '',
      songTitle: '',
      box: 1,
      nextReview: today(),
      addedAt: new Date().toISOString(),
    };
    d().vocab.push(w);
    log('word_added', { vocabId: w.id, word: w.word });
    db.save();
    res.status(201).json(w);
  });

  app.post('/api/vocab/:id/review', (req, res) => {
    const w = d().vocab.find((x) => x.id === req.params.id);
    if (!w) return res.status(404).json({ error: 'Mot introuvable' });
    reviewWord(w, Boolean(req.body?.correct));
    log('review', { vocabId: w.id, word: w.word, correct: Boolean(req.body?.correct) });
    db.save();
    res.json(w);
  });

  app.delete('/api/vocab/:id', (req, res) => {
    d().vocab = d().vocab.filter((w) => w.id !== req.params.id);
    db.save();
    res.json({ ok: true });
  });

  // ---- Grammaire ----
  app.get('/api/grammar', (req, res) => res.json(d().grammar));

  // ---- Journal du jour ----
  app.get('/api/journal/:date', (req, res) => {
    res.json({ date: req.params.date, text: d().journal[req.params.date] || '' });
  });
  app.put('/api/journal/:date', (req, res) => {
    const text = String(req.body?.text || '');
    const had = Boolean(d().journal[req.params.date]);
    d().journal[req.params.date] = text;
    if (!had && text.trim() && req.params.date === today()) log('journal');
    db.save();
    res.json({ date: req.params.date, text });
  });

  // ---- Tableau de bord ----
  app.get('/api/today', (req, res) => {
    const date = today();
    const todays = d().activity.filter((a) => a.date === date);
    const quiz = d().quizzes[date];
    res.json({
      date,
      streak: streak(d().activity, date),
      songs: d().songs.length,
      lessons: d().songs.filter((s) => s.lesson).length,
      words: d().vocab.length,
      mastered: d().vocab.filter((w) => w.box >= 5).length,
      due: dueWords(d().vocab, date).length,
      activity: todays,
      quiz: quiz
        ? { done: quiz.answers.filter(Boolean).length, total: quiz.questions.length, score: quiz.score }
        : null,
      history: lastDays(d(), date, 14),
    });
  });

  // ---- Quiz quotidien ----
  async function buildQuiz(date) {
    const todays = d().activity.filter((a) => a.date === date);
    const words = pickQuizWords(d().vocab, d().activity, date, 15);
    if (ai.enabled()) {
      const songIds = new Set(todays.filter((a) => a.songId).map((a) => a.songId));
      const context = {
        date,
        today_songs: d()
          .songs.filter((s) => songIds.has(s.id))
          .map((s) => ({ title: s.title, artist: s.artist })),
        today_activity: todays.map((a) => ({ type: a.type, title: a.title, word: a.word })),
        journal_of_the_day: d().journal[date] || '',
        words_to_practice: words.map((w) => ({
          word: w.word,
          translation: w.translation,
          example: w.example,
          from_song: w.songTitle,
        })),
        recent_grammar: d()
          .grammar.slice(-8)
          .map((g) => ({ topic: g.topic, rule_fr: g.rule_fr, song: g.songTitle })),
        recent_mistakes: recentMistakes(d(), 8),
      };
      if (context.words_to_practice.length || context.recent_grammar.length || context.journal_of_the_day) {
        return { ...(await ai.generateQuiz(context)), source: 'ai' };
      }
    }
    return localQuiz(d().vocab, d().activity, date);
  }

  async function getQuiz(date, force = false) {
    if (!force && d().quizzes[date]) return d().quizzes[date];
    const quiz = await buildQuiz(date);
    if (!quiz) return null;
    d().quizzes[date] = {
      ...quiz,
      date,
      createdAt: new Date().toISOString(),
      answers: quiz.questions.map(() => null),
      score: 0,
    };
    db.save();
    return d().quizzes[date];
  }

  app.get('/api/quiz/today', async (req, res) => {
    try {
      const quiz = await getQuiz(today());
      if (!quiz) return res.status(404).json({ error: 'Ajoute et étudie une chanson pour débloquer ton quiz.' });
      res.json(quiz);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/quiz/today/regenerate', async (req, res) => {
    try {
      const quiz = await getQuiz(today(), true);
      if (!quiz) return res.status(404).json({ error: 'Pas encore assez de contenu pour un quiz.' });
      res.json(quiz);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/quiz/today/answer', (req, res) => {
    const date = today();
    const quiz = d().quizzes[date];
    if (!quiz) return res.status(404).json({ error: 'Aucun quiz aujourd’hui' });
    const i = Number(req.body?.index);
    const q = quiz.questions[i];
    if (!q) return res.status(400).json({ error: 'Question invalide' });
    if (quiz.answers[i]) return res.json({ ...quiz.answers[i], quiz });
    const given = String(req.body?.answer ?? '');
    const correct = isCorrect(q, given);
    quiz.answers[i] = { given, correct };
    quiz.score = quiz.answers.filter((a) => a?.correct).length;
    if (q.vocab_word) {
      const w = d().vocab.find((x) => x.word.toLowerCase() === q.vocab_word.toLowerCase());
      if (w) reviewWord(w, correct, date);
    }
    log('quiz_answer', { correct, question: q.question, answer: q.answer, given });
    if (quiz.answers.every(Boolean)) log('quiz_done', { score: quiz.score, total: quiz.questions.length });
    db.save();
    res.json({ given, correct, quiz });
  });

  app.use(express.static(PUBLIC_DIR));
  return app;
}

function lastDays(data, date, n) {
  const out = [];
  const [y, m, dd] = date.split('-').map(Number);
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(y, m - 1, dd - i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const acts = data.activity.filter((a) => a.date === key);
    out.push({
      date: key,
      count: acts.length,
      quiz: data.quizzes[key] ? `${data.quizzes[key].score}/${data.quizzes[key].questions.length}` : null,
    });
  }
  return out;
}

function recentMistakes(data, n) {
  return data.activity
    .filter((a) => a.type === 'quiz_answer' && !a.correct)
    .slice(-n)
    .map((a) => ({ question: a.question, expected: a.answer, given: a.given }));
}
