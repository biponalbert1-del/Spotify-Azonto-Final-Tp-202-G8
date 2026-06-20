# Azonto

Azonto est une application mobile React Native de lecture musicale. Elle gere les musiques locales du telephone, les playlists, les playlists de groupe, les comptes Supabase, l'upload de songs artiste et la synchronisation Supabase.

## Installation

```bash
npm install
```

## Lancer l'app

```bash
npm run android
```

## Generer l'APK

```powershell
.\android\gradlew.bat -p android assembleRelease
```

APK genere :

```text
android/app/build/outputs/apk/release/app-release.apk
```

## Supabase

Projet utilise par l'app :

```text
https://xvuwzzjsynihjttwryah.supabase.co
```

Les migrations sont dans :

```text
supabase/migrations/
```

Tables principales :

- `profiles` : profils utilisateurs.
- `artists` : artistes.
- `songs` : songs artistes et catalogue.
- `group_playlists` : playlists de groupe.
- `group_playlist_songs` : songs dans les playlists de groupe.
- `group_playlist_members` : membres des playlists de groupe.

Storage :

- `song-covers` : images des songs artistes.
- `song-audio` : audios artistes et audios locaux envoyes dans les groupes.

Appliquer les migrations :

```powershell
$encodedPassword = [uri]::EscapeDataString('<DB_PASSWORD>')
supabase.cmd db push --db-url "postgresql://postgres.xvuwzzjsynihjttwryah:$encodedPassword@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
```

Verifier l'etat :

```powershell
supabase.cmd db push --dry-run --db-url "postgresql://postgres.xvuwzzjsynihjttwryah:<PASSWORD_ENCODED>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
```

## Firebase / Google Verification

Le fichier `google-services.json` est utilise pour lire la cle API Firebase.

Important : l'envoi du mail de verification via Google/Firebase exige que le provider Email/Password soit active dans Firebase Console :

```text
Firebase Console -> Authentication -> Sign-in method -> Email/Password -> Enable
```

Etat actuel teste : Firebase accepte `accounts:signUp` et `accounts:sendOobCode` avec le `google-services.json`.

Note : Firebase Email/Password envoie un email de verification avec un lien. Le code interne `oobCode` est contenu dans le lien envoye par email ; il n'est pas affiche dans l'application.

## Structure finale

```text
.
|-- App.tsx
|-- android/
|   |-- app/
|   |   |-- build.gradle
|   |   |-- src/main/java/com/azonto/
|   |   |   |-- LocalSongsModule.kt
|   |   |   |-- PlayerNotificationModule.kt
|   |   |   |-- RingtoneModule.kt
|-- ios/
|-- musics test/
|-- src/
|   |-- components/
|   |   |-- Player.tsx
|   |-- mediaAssets.ts
|   |-- playerUtils.ts
|   |-- screens.tsx
|   |-- styles.ts
|   |-- types.ts
|   |-- services/
|   |   |-- firebaseVerification.ts
|   |   |-- localSongs.ts
|   |   |-- playerNotification.ts
|   |   |-- ringtone.ts
|   |   |-- supabase.ts
|-- supabase/
|   |-- config.toml
|   |-- migrations/
|-- google-services.json
|-- package.json
```

## Fonctionnalites

- Lecture audio avec mini-player et lecteur complet.
- Musiques locales depuis le telephone.
- Upload artiste : image et audio depuis le telephone vers Supabase.
- Type musical artiste : Afro-pop, Variete, Pop, Afrobeat, Amapiano, Makossa.
- Playlists locales avec page detail.
- Playlists de groupe avec code, membres, suppression par createur.
- Upload des songs locales vers Supabase avant ajout dans une playlist de groupe.
- Barre de progression pendant l'envoi Supabase des songs de groupe.
- Resynchronisation Supabase pour les groupes restes locaux.
- Notifications locales.
- Connexion/inscription Supabase.
- Creation automatique de profil Supabase via trigger `auth.users`.
- Bouton oeil pour afficher/cacher le mot de passe.
