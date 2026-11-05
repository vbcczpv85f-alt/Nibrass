import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, today } from '../server/db.js';
import { createApp } from '../server/app.js';
import { reviewWord, streak, isCorrect, localQuiz } from '../server/learning.js';

const fakeLesson = {
  known_song: true,
  level: 'B1',
  interpretation_fr: 'Une chanson sur la nostalgie.',
  themes: ['amour'],
  mood: 'mélancolique',
  grammar: [{ topic: 'Present perfect', rule_fr: 'have + participe', song_example: "I've been waiting", explanation_fr: '...', more_examples: [], exercise_question: 'q', exercise_answer: 'a' }],
  vocabulary: [
    { word: 'heart', translation: 'cœur', type: 'nom', example: 'My heart is broken.', note: '' },
    { word: 'lonely', translation: 'seul', type: 'adjectif', example: 'I feel lonely tonight.', note: '' },
    { word: 'light', translation: 'lumière', type: 'nom', example: 'Turn on the light.', note: '' },
    { word: 'dance', translation: 'danser', type: 'verbe', example: 'Let us dance.', note: '' },
  ],
  expressions: [],
  pronunciation_tip_fr: '',
  fun_fact_fr: '',
};

async function setup(aiOn = true) {
  const db = createDb(null);
  const app = createApp(db, {
    ai: { enabled: () => aiOn, analyzeSong: async () => fakeLesson, generateQuiz: async () => ({ intro_fr: 'Go', questions: [{ type: 'mcq', prompt_fr: 'p', question: 'heart', options: ['cœur', 'main', 'pied', 'tête'], answer: 'cœur', accepted_answers: [], explanation_fr: '', vocab_word: 'heart' }] }) },
  });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, method = 'GET', body) => {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    return { status: r.status, json: await r.json() };
  };
  return { db, server, call };
}

test('flux complet : chanson → leçon → vocabulaire → quiz', async () => {
  const { server, call } = await setup();
  try {
    const add = await call('/songs', 'POST', [{ title: 'Hello', artist: 'Adele' }, { title: 'Hello', artist: 'adele' }]);
    assert.equal(add.json.length, 1, 'les doublons sont ignorés');
    const id = add.json[0].id;
    const lesson = await call(`/songs/${id}/analyze`, 'POST', {});
    assert.equal(lesson.json.lesson.level, 'B1');
    const vocab = await call('/vocab');
    assert.equal(vocab.json.length, 4);
    const grammar = await call('/grammar');
    assert.equal(grammar.json[0].songTitle, 'Hello');
    const quiz = await call('/quiz/today');
    assert.equal(quiz.json.source, 'ai');
    const ans = await call('/quiz/today/answer', 'POST', { index: 0, answer: 'Cœur' });
    assert.equal(ans.json.correct, true);
    const heart = (await call('/vocab')).json.find((w) => w.word === 'heart');
    assert.equal(heart.box, 2);
    const t = await call('/today');
    assert.equal(t.json.streak, 1);
    assert.equal(t.json.quiz.score, 1);
  } finally {
    server.close();
  }
});

test('quiz local sans IA', async () => {
  const { server, call } = await setup(false);
  try {
    assert.equal((await call('/quiz/today')).status, 404);
    for (const w of fakeLesson.vocabulary) await call('/vocab', 'POST', w);
    const quiz = await call('/quiz/today');
    assert.equal(quiz.json.source, 'local');
    assert.equal(quiz.json.questions.length, 4);
  } finally {
    server.close();
  }
});

test('répétition espacée et série', () => {
  const w = { box: 1 };
  reviewWord(w, true, '2026-01-01');
  assert.equal(w.box, 2);
  assert.equal(w.nextReview, '2026-01-03');
  reviewWord(w, false, '2026-01-03');
  assert.equal(w.box, 1);
  const acts = ['2026-01-01', '2026-01-02', '2026-01-03'].map((date) => ({ date }));
  assert.equal(streak(acts, '2026-01-03'), 3);
  assert.equal(streak(acts, '2026-01-04'), 3);
  assert.equal(streak(acts, '2026-01-05'), 0);
});

test('correction tolérante', () => {
  assert.ok(isCorrect({ answer: "I'm gonna", accepted_answers: [] }, 'i’m  GONNA!'));
  assert.ok(!isCorrect({ answer: 'heart', accepted_answers: [] }, ''));
  assert.ok(localQuiz([], [], today()) === null);
});
