// Jeton développeur Apple MusicKit (nécessite un compte Apple Developer).
import fs from 'node:fs';
import jwt from 'jsonwebtoken';

let cached = null;

export function musicKitConfigured() {
  return Boolean(
    process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      (process.env.APPLE_PRIVATE_KEY || process.env.APPLE_PRIVATE_KEY_PATH),
  );
}

export function developerToken() {
  if (!musicKitConfigured()) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - now > 3600) return cached.token;
  const key =
    process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n') ||
    fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH, 'utf8');
  const exp = now + 60 * 60 * 24 * 30; // 30 jours (max 6 mois)
  const token = jwt.sign({ iss: process.env.APPLE_TEAM_ID, iat: now, exp }, key, {
    algorithm: 'ES256',
    keyid: process.env.APPLE_KEY_ID,
  });
  cached = { token, exp };
  return token;
}
