import 'dotenv/config';
import path from 'node:path';
import { createDb } from './db.js';
import { createApp } from './app.js';

const db = createDb(process.env.DATA_FILE || path.resolve('data', 'db.json'));
const app = createApp(db);
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`🎧 Nibrass est prêt : http://localhost:${port}`);
});
