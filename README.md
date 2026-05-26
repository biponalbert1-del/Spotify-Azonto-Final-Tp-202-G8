# Azonto - Documentation du projet

Azonto est une application mobile React Native de lecture musicale. Elle propose une experience proche d'une application de streaming: accueil, exploration par genre ou region, recherche, bibliotheque, favoris, playlists locales, profil utilisateur et lecteur audio complet.

Le projet cible principalement Android. Il utilise React Native pour l'interface, `react-native-sound` pour la lecture audio, des fichiers audio locaux comme solution de secours, et Supabase pour l'authentification ainsi que le catalogue distant de chansons.

## Fonctionnement general

1. L'application demarre depuis `index.js`.
2. React Native enregistre le composant principal `App` defini dans `App.tsx`.
3. `App.tsx` initialise les donnees locales avec `fallbackTracks`.
4. Au lancement, l'application tente de charger les chansons actives depuis Supabase avec `getRemoteSongs()`.
5. Si Supabase renvoie des chansons, elles remplacent le catalogue local.
6. Si Supabase ne repond pas ou ne contient aucune chanson, l'application continue avec les musiques locales du dossier `musics test`.
7. L'utilisateur peut naviguer entre les onglets Accueil, Explorer, Recherche, Bibliotheque et Profil.
8. Le lecteur audio gere lecture, pause, piste suivante, piste precedente, repetition, partage, progression et recherche dans la piste.

## Technologies utilisees

- React Native `0.85.3`: framework mobile.
- React `19.2.3`: construction des composants.
- TypeScript: typage du code applicatif.
- `react-native-sound`: lecture des fichiers audio locaux ou distants.
- Supabase Auth: inscription et connexion par email/mot de passe.
- Supabase REST: recuperation des chansons.
- Supabase Storage: stockage public des pochettes et fichiers audio.
- Jest: tests unitaires React Native.
- Metro: bundler React Native, configure pour accepter `mp3` et `m4a`.
- Gradle/Android: compilation de l'APK Android.

## Structure du projet

```text
spotity/
|-- App.tsx
|-- index.js
|-- app.json
|-- package.json
|-- metro.config.js
|-- jest.config.js
|-- tsconfig.json
|-- android/
|-- src/
|   `-- services/
|       |-- supabase.ts
|       `-- firebaseCatalog.ts
|-- supabase/
|   `-- migrations/
|-- musics test/
|-- assets/
|-- __tests__/
|-- __mocks__/
`-- node_modules/
```

## Dossiers importants

### `App.tsx`

Fichier principal de l'application. Il contient les types, les donnees de secours, les ecrans, le lecteur audio, l'etat global et la logique metier.

Ce fichier gere notamment:

- la navigation par onglets;
- le catalogue des chansons;
- la lecture audio;
- les favoris;
- les playlists locales;
- la recherche;
- l'inscription et la connexion;
- l'affichage du lecteur reduit et du lecteur plein ecran;
- le chargement des chansons distantes depuis Supabase.

### `src/services/supabase.ts`

Service de communication avec Supabase.

Il contient:

- l'URL du projet Supabase;
- la cle publique Supabase;
- les types de session et de chanson distante;
- les fonctions d'inscription, connexion, creation/mise a jour de profil et recuperation des chansons.

### `src/services/firebaseCatalog.ts`

Service prevu pour lire un catalogue depuis Firestore. Dans l'etat actuel, les identifiants Firebase sont vides, donc `getRemoteCatalog()` retourne `null`. Ce fichier est une base possible pour une integration Firebase future, mais il n'est pas central dans le fonctionnement actuel.

### `supabase/migrations/`

Contient les scripts SQL pour creer et alimenter la base Supabase.

- `202605260001_create_profiles_and_songs.sql`: cree les tables principales, les index, les triggers et les politiques RLS.
- `202605260002_create_song_storage_buckets.sql`: cree les buckets publics `song-covers` et `song-audio`.
- `202605260003_seed_test_songs.sql`: insere des artistes et chansons de test.

### `musics test/`

Contient les fichiers audio et pochettes utilises comme catalogue local. Ces fichiers permettent a l'application de fonctionner meme sans connexion Supabase.

### `android/`

Projet Android natif genere par React Native. C'est ici que Gradle compile l'application Android et produit l'APK.

Fichiers importants:

- `android/app/src/main/AndroidManifest.xml`: declare l'application Android, l'activite principale et la permission `INTERNET`.
- `android/build.gradle`: configuration Gradle globale.
- `android/app/build.gradle`: configuration de l'application Android.
- `android/gradlew.bat`: commande Windows pour compiler l'application.

### `assets/`

Dossier reserve aux ressources statiques. Selon l'evolution du projet, il peut contenir images, logos ou autres medias.

### `__tests__/`

Contient les tests Jest. Le test principal est `__tests__/App.test.tsx`.

### `__mocks__/`

Contient les mocks de tests. `fileMock.js` permet a Jest de simuler les imports de fichiers audio comme `mp3` et `m4a`.

### `node_modules/`

Dependencies installees par npm. Ce dossier est genere automatiquement par `npm install` et ne doit pas etre modifie manuellement.

### `android/build/`

Fichiers generes par Gradle pendant la compilation Android. Exemple: `android/build/generated/autolinking/autolinking.json`. Ce fichier liste les modules natifs lies automatiquement par React Native. Il est genere, donc il ne faut normalement pas le modifier directement.

## Fichiers de configuration

### `package.json`

Declare le nom du projet, les scripts npm et les dependances.

Scripts principaux:

```bash
npm run start
npm run android
npm run ios
npm run test
npm run lint
```

Dependances principales:

- `react`
- `react-native`
- `react-native-sound`

### `metro.config.js`

Ajoute les extensions audio `mp3` et `m4a` aux assets reconnus par Metro. Sans cette configuration, les imports audio locaux peuvent echouer.

### `jest.config.js`

Configure Jest avec le preset React Native et mappe les fichiers `mp3`/`m4a` vers `__mocks__/fileMock.js`.

### `tsconfig.json`

Configure TypeScript pour le projet React Native.

### `babel.config.js`

Configure Babel avec le preset React Native.

### `app.json`

Contient le nom de l'application utilise par `index.js` pour enregistrer le composant React Native.

## Donnees principales

### `Track`

Type representant une chanson dans l'application.

Champs principaux:

- `id`: identifiant unique.
- `title`: titre de la chanson.
- `artist`: artiste.
- `genre`: genre musical.
- `region`: pays ou region.
- `cover`: image de couverture locale ou URL distante.
- `audio`: fichier audio local ou URL distante.
- `duration`: duree affichee.
- `plays`: nombre d'ecoutes ou label.
- `liked`: indique si la chanson est favorite.

### `Playlist`

Type representant une playlist locale.

Champs principaux:

- `id`: identifiant de la playlist.
- `name`: nom de la playlist.
- `trackIds`: liste des identifiants de chansons.
- `createdAt`: date de creation.

### `AuthSession`

Type representant une session utilisateur Supabase.

Champs principaux:

- `accessToken`: jeton d'acces.
- `refreshToken`: jeton de rafraichissement optionnel.
- `user`: utilisateur Supabase.
- `profile`: informations de profil saisies dans l'app.

## Fonctions importantes dans `App.tsx`

### `formatTime(seconds)`

Convertit un nombre de secondes en format `minutes:secondes`, par exemple `65` devient `1:05`.

### `durationToSeconds(duration)`

Convertit une duree texte comme `3:14` en nombre de secondes.

### `mapRemoteSong(song)`

Convertit une chanson recue depuis Supabase (`RemoteSong`) en chanson utilisable par l'interface (`Track`).

### `coverSource(cover)`

Normalise une image de couverture. Si la couverture est locale, elle est utilisee directement. Si c'est une URL, elle est transformee en source compatible React Native.

### `audioSource(audio)`

Normalise la source audio. Elle permet au lecteur de travailler avec un fichier local ou une URL distante.

### `startTrack(track)`

Fonction centrale de lecture. Elle:

- selectionne la chanson courante;
- arrete et libere le son precedent;
- charge la nouvelle source audio;
- demarre la lecture;
- met a jour la duree;
- lance le timer de progression;
- gere la fin de lecture et la repetition.

### `toggleCurrentTrack()`

Gere le bouton lecture/pause. Si la piste n'est pas chargee, elle lance `startTrack(current)`. Si elle est deja chargee, elle alterne entre pause et reprise.

### `playTrackByOffset(offset)`

Permet de passer a la piste suivante ou precedente. `offset = 1` avance, `offset = -1` recule.

### `playPreviousTrack()` et `playNextTrack()`

Appellent `playTrackByOffset()` pour naviguer dans la file de lecture.

### `seekTo(seconds)`

Deplace la lecture a une position precise de la chanson.

### `toggleRepeat()`

Active ou desactive la repetition de la piste courante.

### `toggleLike(track)`

Ajoute ou retire une chanson des favoris. Met aussi a jour la piste courante si c'est elle qui est modifiee.

### `toggleAddedTrack(track)`

Ajoute ou retire une chanson de la liste temporaire des titres ajoutes.

### `createPlaylist(name)`

Cree une playlist locale. Si des titres sont favoris, ils sont ajoutes a la playlist; sinon les trois premieres chansons du catalogue sont utilisees.

### `browseFilter(query)`

Ouvre l'ecran de recherche avec une requete pre-remplie, par exemple un genre ou une region.

### `validateAuthPayload(payload, mode)`

Verifie les champs obligatoires de connexion ou inscription:

- email;
- mot de passe;
- nom complet pour l'inscription;
- longueur minimale du mot de passe.

### `signIn(payload)`

Valide les champs puis appelle `signInWithEmail()` dans le service Supabase.

### `signUp(payload)`

Valide les champs puis appelle `signUpWithEmail()` dans le service Supabase.

### `signOut()`

Supprime la session locale et remet l'utilisateur en mode invite.

## Composants d'interface importants

### `HomeScreen`

Ecran d'accueil. Il affiche:

- le message de bienvenue;
- la barre de recherche;
- les tendances;
- une playlist mise en avant;
- les regions;
- une selection editoriale.

### `ExploreScreen`

Ecran d'exploration. Il affiche:

- une session mise en avant;
- une grille de genres;
- une liste de chansons a parcourir.

### `SearchScreen`

Ecran de recherche. Il filtre les chansons par titre, artiste, genre ou region.

### `LibraryScreen`

Ecran bibliotheque. Il affiche:

- le nombre de favoris;
- la creation de playlists locales;
- la liste des playlists;
- la liste des titres favoris.

### `ProfileScreen`

Ecran profil. Il gere:

- l'inscription;
- la connexion;
- l'affichage des informations utilisateur;
- la deconnexion;
- quelques statistiques du compte.

### `PlayerSheet`

Lecteur reduit affiche en bas de l'application. Il montre la chanson courante, l'artiste, la progression et le bouton lecture/pause.

### `FullPlayerScreen`

Lecteur plein ecran. Il affiche la pochette, les controles complets, la barre de progression, les actions like/add/share/cast et l'effet visualiseur.

### `TabBar`

Barre de navigation principale entre les onglets `home`, `explore`, `search`, `library` et `profile`.

### `SplashScreen`

Ecran d'introduction anime affiche au demarrage, sauf pendant les tests.

## Fonctions importantes dans `src/services/supabase.ts`

### `authHeaders(accessToken?)`

Construit les headers necessaires pour appeler Supabase Auth ou Supabase REST.

### `requestAuth(path, body)`

Envoie une requete POST vers Supabase Auth et transforme les erreurs Supabase en exceptions JavaScript.

### `signInWithEmail(email, password, profile)`

Connecte un utilisateur avec email et mot de passe, puis retourne une session exploitable par l'application.

### `signUpWithEmail(email, password, profile)`

Cree un compte Supabase avec les informations utilisateur. Si Supabase retourne directement un `access_token`, la fonction cree ou met a jour le profil dans la table `profiles`.

### `upsertProfile(accessToken, userId, email, profile)`

Insere ou met a jour le profil utilisateur dans Supabase. La politique `Prefer: resolution=merge-duplicates` evite de creer un doublon lorsque le profil existe deja.

### `getRemoteSongs()`

Recupere les chansons actives depuis la table `songs` de Supabase, triees par date de creation decroissante. En cas d'erreur, retourne une liste vide pour laisser l'application utiliser le catalogue local.

## Base de donnees Supabase

La migration principale cree les tables suivantes:

- `profiles`: profils utilisateurs lies a `auth.users`.
- `artists`: artistes.
- `songs`: chansons disponibles dans l'application.
- `user_favorite_songs`: favoris utilisateurs.
- `playlists`: playlists utilisateur.
- `playlist_songs`: relation entre playlists et chansons.

Des index sont crees sur artiste, genre, region, chansons actives et playlists utilisateur pour accelerer les recherches courantes.

Les triggers importants:

- `set_updated_at()`: met a jour automatiquement `updated_at`.
- `create_profile_for_new_user()`: cree un profil apres l'inscription d'un nouvel utilisateur Supabase.

Les politiques RLS limitent l'acces:

- les profils sont visibles/modifiables par leur proprietaire;
- les artistes et chansons actives sont lisibles publiquement;
- les favoris et playlists privees sont geres par leur proprietaire;
- les playlists publiques peuvent etre lues par tous.

## Stockage Supabase

Deux buckets sont crees:

- `song-covers`: images de couverture, limite 5 Mo.
- `song-audio`: fichiers audio, limite 20 Mo.

Les politiques actuelles autorisent la lecture, l'upload et la mise a jour publics sur ces buckets. Pour une application en production, il serait preferable de restreindre l'upload aux administrateurs ou utilisateurs autorises.

## Flux de lecture audio

1. L'utilisateur appuie sur une chanson.
2. `startTrack(track)` recupere la source audio.
3. L'ancien son est arrete avec `releaseSound()`.
4. `react-native-sound` charge la nouvelle piste.
5. La lecture commence automatiquement.
6. `startProgressTimer()` met a jour la position toutes les 500 ms.
7. `PlayerSheet` et `FullPlayerScreen` recoivent `position` et `duration` pour afficher la progression.
8. A la fin de la piste, la lecture s'arrete ou recommence si la repetition est active.

## Flux d'authentification

1. L'utilisateur ouvre l'onglet Profil.
2. Il choisit inscription ou connexion.
3. `validateAuthPayload()` verifie les champs.
4. `signIn()` ou `signUp()` appelle le service Supabase.
5. Si Supabase repond correctement, `authSession` et `authStatus` sont mis a jour.
6. L'ecran Profil affiche les informations du compte.
7. `signOut()` remet l'application en mode invite.

## Flux de recherche

1. L'utilisateur saisit un texte dans la recherche.
2. `SearchScreen` compare la requete au titre, artiste, genre et region de chaque chanson.
3. Les resultats sont affiches avec `FlatList`.
4. Un appui sur une chanson appelle `startTrack()`.

## Flux des favoris et playlists

Les favoris sont stockes dans l'etat local `tracks` avec le champ `liked`. Quand l'utilisateur appuie sur le coeur, `toggleLike()` inverse cette valeur.

Les playlists sont locales dans l'etat `playlists`. `createPlaylist()` cree une playlist avec les chansons favorites, ou avec les trois premieres chansons si aucun favori n'existe.

Important: les favoris et playlists ne sont pas encore synchronises avec Supabase dans l'application. La base de donnees contient deja les tables necessaires, mais le code mobile utilise actuellement un stockage local en memoire.

## Commandes utiles

Installer les dependances:

```bash
npm install
```

Lancer Metro:

```bash
npm run start
```

Lancer sur Android:

```bash
npm run android
```

Lancer les tests:

```bash
npm run test
```

Compiler un APK release sur Windows:

```bash
.\android\gradlew.bat assembleRelease
```

APK genere habituellement:

```text
android/app/build/outputs/apk/release/app-release.apk
```

## Points d'attention

- Les cles Supabase presentes dans `src/services/supabase.ts` sont publiques, mais il faut quand meme eviter d'y mettre une cle service role.
- Les fichiers audio locaux peuvent alourdir le depot.
- `android/build/` et `node_modules/` sont generes et ne doivent pas etre modifies manuellement.
- Les playlists et favoris sont actuellement perdus au redemarrage de l'application.
- Le service Firebase est present mais non configure.
- Les politiques de Storage autorisent l'upload public; c'est pratique pour les tests, mais pas ideal pour la production.

## Ameliorations possibles

- Synchroniser favoris et playlists avec Supabase.
- Ajouter un systeme d'administration pour uploader chansons, pochettes et artistes.
- Ajouter la persistance locale avec AsyncStorage.
- Masquer les constantes Supabase dans une configuration d'environnement.
- Ajouter plus de tests sur les fonctions de lecture, recherche et authentification.
- Ajouter une gestion plus complete des erreurs reseau.
- Ajouter une vraie file d'attente de lecture.

## Resume rapide

Le coeur du projet est `App.tsx`. Il orchestre l'interface, la navigation, les donnees, le lecteur et l'authentification. `src/services/supabase.ts` connecte l'application au backend. Les migrations dans `supabase/migrations/` definissent la structure de la base. Les dossiers `node_modules/` et `android/build/` sont generes automatiquement et ne sont pas des fichiers metier a modifier.
