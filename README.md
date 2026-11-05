# Nibrass · Suivi sport, nutrition & budget

Application web mobile (HTML/CSS/JS, sans serveur) — toutes les données restent dans le navigateur.

## Sections
- **Sport** : Haut du corps focus pecs, Haut du corps focus dos, Bras, Dos, Cardio, Hyrox.
  Chrono de séance, minuteur de repos, perfs de la séance précédente, historique, records (1RM estimé, meilleur Hyrox).
- **Nutrition** : photo du repas (appareil photo ou galerie) + précisions → l’IA (Claude) estime calories,
  protéines, glucides, sucres, lipides, fibres et pose des questions si besoin. Objectifs avec calculateur,
  suivi de l’eau, graphique 7 jours, ajout manuel.
- **Budget** : revenus par type, dépenses par catégorie (essence, restauration rapide, restaurant, plaisir,
  Red Bull, courses, charges fixes, autres), solde et taux d’épargne mensuels.
- **Red Bull** : compteur de jours sans, limite hebdo, série record, dépenses, projection annuelle.

## Utilisation
Ouvrir `index.html` via un hébergement statique (GitHub Pages, Netlify…) ou en local :
`python3 -m http.server` puis http://localhost:8000.
Pour l’analyse photo, coller une clé API Anthropic dans **Réglages** (stockée uniquement sur l’appareil).
