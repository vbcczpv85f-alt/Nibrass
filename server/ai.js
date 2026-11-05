// Appels à Claude : analyse d'une chanson et génération du quiz quotidien.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

let client = null;
export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const str = { type: 'string' };
const strArr = { type: 'array', items: str };
const obj = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const LESSON_SCHEMA = obj({
  known_song: { type: 'boolean' },
  level: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
  interpretation_fr: str,
  themes: strArr,
  mood: str,
  grammar: {
    type: 'array',
    items: obj({
      topic: str,
      rule_fr: str,
      song_example: str,
      explanation_fr: str,
      more_examples: strArr,
      exercise_question: str,
      exercise_answer: str,
    }),
  },
  vocabulary: {
    type: 'array',
    items: obj({
      word: str,
      translation: str,
      type: str,
      example: str,
      note: str,
    }),
  },
  expressions: {
    type: 'array',
    items: obj({ expression: str, meaning_fr: str, usage_fr: str }),
  },
  pronunciation_tip_fr: str,
  fun_fact_fr: str,
});

export const QUIZ_SCHEMA = obj({
  intro_fr: str,
  questions: {
    type: 'array',
    items: obj({
      type: { type: 'string', enum: ['mcq', 'fill', 'translate'] },
      prompt_fr: str,
      question: str,
      options: strArr,
      answer: str,
      accepted_answers: strArr,
      explanation_fr: str,
      vocab_word: str,
    }),
  },
});

const LESSON_SYSTEM = `Tu es un professeur d'anglais chaleureux et motivant pour un francophone qui apprend l'anglais grâce aux chansons qu'il aime.
À partir d'une chanson (titre + artiste, et éventuellement des paroles fournies par l'élève), tu crées une leçon en JSON :
- interpretation_fr : explique en français le sens de la chanson, l'histoire qu'elle raconte, les émotions, le contexte (4 à 8 phrases).
- grammar : 3 à 5 points de grammaire réellement illustrés par la chanson (temps verbaux, modaux, contractions, conditionnel, phrasal verbs, etc.). rule_fr explique la règle simplement, song_example cite un court extrait, more_examples donne 2-3 phrases originales, et un mini exercice avec sa réponse.
- vocabulary : 8 à 15 mots ou expressions utiles de la chanson, traduction française, type (nom, verbe, adjectif, expression...), une phrase d'exemple courte et une note (registre, piège, prononciation).
- expressions : argot, idiomes ou formes orales (gonna, ain't, etc.) avec leur sens.
- level : niveau CECR estimé des paroles.
Droit d'auteur : ne reproduis jamais les paroles complètes ; chaque citation de la chanson doit faire au maximum 10 mots.
Si tu ne connais pas la chanson et qu'aucune parole n'est fournie, mets known_song à false et base la leçon sur le titre, l'artiste et ses thèmes habituels, sans inventer de paroles ; dis-le dans interpretation_fr.`;

const QUIZ_SYSTEM = `Tu es un professeur d'anglais qui prépare le quiz quotidien d'un élève francophone.
Tu reçois ce que l'élève a fait aujourd'hui (chansons étudiées, mots appris, son journal du jour) et les mots à réviser.
Crée 10 questions variées et progressives, en priorité sur ce qu'il a fait aujourd'hui, puis sur les révisions :
- "mcq" : 4 options dans options, answer est exactement l'une des options.
- "fill" : phrase anglaise avec "_____" à compléter ; options vide.
- "translate" : phrase ou mot à traduire (du français vers l'anglais ou l'inverse) ; options vide ; mets les variantes acceptables dans accepted_answers.
Mélange vocabulaire et grammaire. Si l'élève a écrit un journal en anglais, ajoute une question liée à une erreur qu'il y a faite (s'il y en a).
vocab_word contient le mot de vocabulaire concerné tel qu'il est écrit dans la liste fournie, ou une chaîne vide.
explanation_fr explique brièvement la bonne réponse. intro_fr est une phrase d'encouragement personnalisée qui mentionne sa journée.
Ne cite jamais plus de 10 mots consécutifs des paroles d'une chanson.`;

async function askJson(system, userText, schema, maxTokens = 16000) {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema },
    },
    system,
    messages: [{ role: 'user', content: userText }],
  });
  if (response.stop_reason === 'refusal') {
    throw new Error("L'IA a refusé de traiter cette demande.");
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error("La réponse de l'IA a été coupée, réessaie.");
  }
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return JSON.parse(text);
}

export async function analyzeSong({ title, artist, lyrics }) {
  let prompt = `Chanson : "${title}" de ${artist}.`;
  if (lyrics && lyrics.trim()) {
    prompt += `\n\nParoles fournies par l'élève (pour ton analyse uniquement, ne les recopie pas) :\n<lyrics>\n${lyrics.trim()}\n</lyrics>`;
  }
  return askJson(LESSON_SYSTEM, prompt, LESSON_SCHEMA);
}

export async function generateQuiz(context) {
  return askJson(QUIZ_SYSTEM, JSON.stringify(context, null, 2), QUIZ_SCHEMA);
}
