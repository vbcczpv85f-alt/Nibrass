// Logique d'apprentissage : répétition espacée (boîtes de Leitner), série de jours, quiz local.
import { today, addDays } from './db.js';

// Intervalle (en jours) avant la prochaine révision selon la boîte.
export const BOX_INTERVALS = [0, 1, 2, 4, 8, 16];

export function reviewWord(word, correct, date = today()) {
  if (correct) word.box = Math.min((word.box || 1) + 1, 5);
  else word.box = 1;
  word.nextReview = addDays(date, BOX_INTERVALS[word.box]);
  word.reviews = (word.reviews || 0) + 1;
  word.lastReview = date;
  return word;
}

export function dueWords(vocab, date = today()) {
  return vocab.filter((w) => !w.nextReview || w.nextReview <= date);
}

export function activeDays(activity) {
  return new Set(activity.map((a) => a.date));
}

// Nombre de jours consécutifs avec au moins une activité (aujourd'hui ou hier inclus).
export function streak(activity, date = today()) {
  const days = activeDays(activity);
  let cursor = days.has(date) ? date : addDays(date, -1);
  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Choisit les mots du quiz : d'abord ceux vus aujourd'hui, puis ceux à réviser, puis le reste.
export function pickQuizWords(vocab, activity, date = today(), max = 10) {
  const todayIds = new Set(
    activity.filter((a) => a.date === date && a.vocabId).map((a) => a.vocabId),
  );
  const todaySongs = new Set(
    activity.filter((a) => a.date === date && a.songId).map((a) => a.songId),
  );
  const fromToday = vocab.filter((w) => todayIds.has(w.id) || todaySongs.has(w.songId));
  const due = dueWords(vocab, date).filter((w) => !fromToday.includes(w));
  const rest = vocab.filter((w) => !fromToday.includes(w) && !due.includes(w));
  return [...shuffle(fromToday), ...shuffle(due), ...shuffle(rest)].slice(0, max);
}

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCorrect(question, given) {
  const g = normalize(given);
  if (!g) return false;
  const accepted = [question.answer, ...(question.accepted_answers || [])].map(normalize);
  return accepted.includes(g);
}

// Quiz généré sans IA, à partir du vocabulaire enregistré.
export function localQuiz(vocab, activity, date = today()) {
  const words = pickQuizWords(vocab, activity, date, 10);
  if (words.length === 0) return null;
  const questions = words.map((w, i) => {
    const others = shuffle(vocab.filter((o) => o.id !== w.id)).slice(0, 3);
    const blankable =
      w.example && new RegExp(`\\b${escapeRe(w.word)}\\b`, 'i').test(w.example);
    if (i % 3 === 2 && blankable) {
      return {
        type: 'fill',
        prompt_fr: `Complète la phrase (indice : « ${w.translation} »)`,
        question: w.example.replace(new RegExp(`\\b${escapeRe(w.word)}\\b`, 'i'), '_____'),
        options: [],
        answer: w.word,
        accepted_answers: [],
        explanation_fr: w.note || `« ${w.word} » = ${w.translation}`,
        vocab_word: w.word,
      };
    }
    if (i % 3 === 1 || others.length < 3) {
      return {
        type: 'translate',
        prompt_fr: 'Traduis ce mot en anglais',
        question: w.translation,
        options: [],
        answer: w.word,
        accepted_answers: [],
        explanation_fr: w.example ? `Exemple : ${w.example}` : '',
        vocab_word: w.word,
      };
    }
    return {
      type: 'mcq',
      prompt_fr: 'Que signifie ce mot ?',
      question: w.word,
      options: shuffle([w.translation, ...others.map((o) => o.translation)]),
      answer: w.translation,
      accepted_answers: [],
      explanation_fr: w.example ? `Exemple : ${w.example}` : '',
      vocab_word: w.word,
    };
  });
  return {
    intro_fr: 'Quiz du jour basé sur ton vocabulaire (mode hors IA).',
    questions,
    source: 'local',
  };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
