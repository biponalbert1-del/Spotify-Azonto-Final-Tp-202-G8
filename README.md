# Azonto - Documentation du projet

Azonto est une application mobile React Native de lecture musicale. Elle propose une expérience proche d'une application de streaming : accueil, exploration par genre ou région, recherche, bibliothèque, favoris, playlists locales, profil utilisateur et lecteur audio complet.

## Installation et Configuration

1. Installez les dépendances :
   ```bash
   npm install
   ```

2. Effectuez les migrations Supabase si nécessaire (voir dossier `supabase/migrations`).

3. Lancez l'application :
   ```bash
   npm run android  # Pour Android
   npm run ios      # Pour iOS
   ```

## Structure du Projet

L'organisation des fichiers suit les conventions React Native standards, avec une séparation claire entre la logique métier et l'interface utilisateur :

```text
.
├── android/                # Code natif Android (Kotlin/Java)
├── ios/                    # Code natif iOS (Swift)
├── src/                    # Code source principal
│   ├── components/         # Composants UI réutilisables (ex: Player)
│   ├── services/           # Logique métier et appels API
│   │   ├── firebaseCatalog.ts
│   │   ├── localSongs.ts   # Gestion des musiques locales
│   │   ├── supabase.ts     # Configuration de la base de données
│   │   └── ringtone.ts     # Gestion des sonneries
│   ├── mediaAssets.ts      # Gestion des ressources multimédias
│   ├── playerUtils.ts      # Utilitaires pour le lecteur audio
│   ├── screens.tsx         # Définition des écrans de l'application
│   ├── styles.ts           # Styles globaux
│   └── types.ts            # Définitions des types TypeScript
├── supabase/               # Migrations et configuration Supabase
│   └── migrations/         # Scripts SQL d'initialisation de la DB
├── musics test/            # Ressources de test (MP3 et images)
├── App.tsx                 # Point d'entrée de l'application
└── package.json            # Dépendances et scripts
```

## Fonctionnalités


- Accueil avec recommandations musicales.
- Exploration par genre ou région.
- Recherche de titres.
- Bibliothèque personnelle et favoris.
- Gestion de playlists locales.
- Profil utilisateur.
- Lecteur audio complet (Play/Pause, Suivant/Précédent, Barre de progression).
