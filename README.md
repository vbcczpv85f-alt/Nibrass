# 🎧 Nibrass — l'anglais en musique

Apprends l'anglais rapidement et avec plaisir grâce aux chansons de ta playlist Apple Music.

## Ce que fait l'application

| Rubrique | Contenu |
|---|---|
| 🎧 **Playlist** | Importe ta playlist Apple Music (connexion directe, copier-coller ou recherche dans le catalogue Apple). Extrait de 30 s et lien vers Apple Music pour chaque chanson. |
| ✨ **Leçon IA** | Pour chaque chanson, l'IA (Claude) **interprète** le sens des paroles en français, en tire **3 à 5 cours de grammaire** (règle, extrait de la chanson, exemples, mini-exercice), le **vocabulaire** utile, l'**argot/expressions** et un conseil de **prononciation**. Tu peux coller les paroles pour une analyse plus précise. |
| 📘 **Grammaire** | Tous les points de grammaire découverts, regroupés par thème (present perfect, modaux, conditionnel…). |
| 🗂️ **Vocabulaire** | Tous tes mots, avec prononciation audio, flashcards et **répétition espacée** (les mots que tu connais reviennent moins souvent). |
| ⭐ **Quiz du jour** | Chaque jour, un quiz de 10 questions (QCM, phrases à compléter, traductions) construit à partir **de ce que tu as fait dans la journée** : chansons écoutées et étudiées, mots appris, révisions, erreurs passées et ton journal. |
| 📓 **Journal** | Écris quelques phrases en anglais sur ta journée ; le quiz les utilise pour corriger tes erreurs. Historique de tes activités et série de jours 🔥. |

Fonctionne sur ordinateur et sur iPhone (ajoute-la à l'écran d'accueil depuis Safari).

## Version en ligne (GitHub Pages) — la plus simple

Le dossier `docs/` contient une version du site qui marche sans serveur :
tu écris le titre d'une chanson en anglais, et l'IA te donne la traduction, la grammaire, le vocabulaire et ton quiz du jour.

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch**.
2. Choisis la branche `claude/english-learning-music-app-nyx5lj` et le dossier **`/docs`**, puis **Save**.
3. Après une minute, le site est à l'adresse `https://vbcczpv85f-alt.github.io/Nibrass/`.
4. Sur le site, ouvre **⚙︎ Réglages** et colle ta clé API Claude (créée sur [console.anthropic.com](https://console.anthropic.com/settings/keys)). Elle reste dans ton navigateur.

Tes données restent dans le navigateur : utilise « Télécharger une sauvegarde » dans les Réglages pour les garder ou les passer sur un autre appareil.

## Version complète avec serveur (Node.js)

Prérequis : [Node.js](https://nodejs.org) 20 ou plus.

```bash
npm install
cp .env.example .env      # puis colle ta clé ANTHROPIC_API_KEY dans .env
npm start                 # ouvre http://localhost:3000
```

Sans clé API, l'application marche quand même (playlist, vocabulaire, flashcards, quiz simple), mais sans leçons ni quiz personnalisés par l'IA.

## Connecter ta playlist Apple Music

Trois façons :

1. **Recherche** (aucune configuration) : onglet Playlist → tape le titre → ＋.
2. **Copier-coller** (aucune configuration) : dans l'app Musique sur Mac, ouvre ta playlist, sélectionne tout (⌘A), copie (⌘C) et colle dans « Coller une liste de chansons ». Tu peux aussi écrire `Titre - Artiste`, une chanson par ligne.
3. **Connexion directe** : Apple exige une clé MusicKit, disponible avec un compte [Apple Developer](https://developer.apple.com) :
   - Certificates, Identifiers & Profiles → **Keys** → crée une clé avec **Media Services (MusicKit)** ;
   - télécharge le fichier `AuthKey_XXXX.p8` et place-le dans le dossier du projet ;
   - remplis `APPLE_TEAM_ID`, `APPLE_KEY_ID` et `APPLE_PRIVATE_KEY_PATH` dans `.env`.
   Un bouton « Connecter Apple Music » apparaît alors pour importer n'importe laquelle de tes playlists.

## Mettre l'app en ligne

N'importe quel hébergeur Node (Render, Railway, Fly.io…) : commande `npm start`, variables d'environnement de `.env`. **Définis `APP_PASSWORD`** pour que personne d'autre n'utilise ta clé API. Les données sont dans `data/db.json` (prévois un disque persistant).

## Droits d'auteur

L'application ne stocke pas les paroles. Les leçons ne citent que de courts extraits (10 mots maximum).

## Développement

```bash
npm run dev   # redémarre à chaque modification
npm test
```

- `server/app.js` : API (chansons, leçons, vocabulaire, journal, quiz)
- `server/ai.js` : appels à Claude (sorties JSON structurées)
- `server/learning.js` : répétition espacée, série de jours, quiz hors IA
- `server/musickit.js` : jeton développeur Apple Music
- `public/` : interface (HTML/CSS/JS sans build)
