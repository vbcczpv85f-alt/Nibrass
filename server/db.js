// Stockage simple dans un fichier JSON (application personnelle, un seul utilisateur).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_DATA = () => ({
  songs: [],
  vocab: [],
  grammar: [],
  activity: [],
  journal: {},
  quizzes: {},
});

export function createDb(file) {
  let data = DEFAULT_DATA();
  if (file && fs.existsSync(file)) {
    try {
      data = { ...DEFAULT_DATA(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch (err) {
      console.error('Impossible de lire la base, démarrage à vide :', err.message);
    }
  }

  let timer = null;
  function save() {
    if (!file) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, file);
    }, 50);
  }

  return {
    get data() {
      return data;
    },
    save,
    id: () => crypto.randomUUID(),
  };
}

// Date locale au format AAAA-MM-JJ (fuseau configurable via TZ).
export function today(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return today(new Date(y, m - 1, d + n));
}
