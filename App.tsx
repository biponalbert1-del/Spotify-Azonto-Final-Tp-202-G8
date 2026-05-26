import React, {useCallback, useRef, useState} from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  FlatList,
  GestureResponderEvent,
  Image,
  ImageBackground,
  ImageSourcePropType,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Sound from 'react-native-sound';

import {
  AuthProfileInput,
  AuthSession,
  RemoteSong,
  getRemoteSongs,
  signInWithEmail,
  signUpWithEmail,
} from './src/services/supabase';

declare const jest: unknown;

type TabKey = 'home' | 'explore' | 'search' | 'library' | 'profile';

type Track = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  region: string;
  cover: ImageSourcePropType | string;
  audio?: number | string;
  duration: string;
  plays: string;
  liked?: boolean;
};

type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
};

type AuthStatus = 'guest' | 'signed-in' | 'registered';

type AuthSubmitPayload = AuthProfileInput & {
  email: string;
  password: string;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function durationToSeconds(duration: string): number {
  const [minutes = '0', seconds = '0'] = duration.split(':');
  return Number(minutes) * 60 + Number(seconds);
}

function mapRemoteSong(song: RemoteSong): Track {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    genre: song.genre,
    region: song.region,
    cover: song.cover_url ?? '',
    audio: song.audio_url ?? undefined,
    duration: song.duration,
    plays: song.plays_label,
    liked: song.is_featured,
  };
}

try {
  Sound.setCategory('Playback');
} catch {
  // The native module is available after rebuilding the app.
}

const fallbackTracks: Track[] = [
  {
    id: 'fally-likolo',
    title: 'Likolo',
    artist: 'Fally Ipupa feat. Ninho',
    genre: 'Afro-pop',
    region: 'RDC',
    cover: require('./musics test/fally ipupa.jpg'),
    audio: require('./musics test/Fally_Ipupa_-__Likolo_feat._Ninho_(Clip_officiel)(128k).mp3'),
    duration: '3:13',
    plays: 'Test',
    liked: true,
  },
  {
    id: 'fally-afsana',
    title: 'Afsana',
    artist: 'Fally Ipupa',
    genre: 'Afro-pop',
    region: 'RDC',
    cover: require('./musics test/fally ipupa 1.jpg'),
    audio: require('./musics test/Fally_Ipupa_-_Afsana_(Clip_Officiel)(128k).mp3'),
    duration: '4:47',
    plays: 'Test',
  },
  {
    id: 'amour-mere',
    title: "L'amour d'une mere",
    artist: 'Selection test',
    genre: 'Variete',
    region: 'Afrique',
    cover: require("./musics test/L_amour_d_une_mère.jpg"),
    audio: require("./musics test/L_amour_d_une_mère(128k).mp3"),
    duration: '4:00',
    plays: 'Test',
    liked: true,
  },
  {
    id: 'michael-bad',
    title: 'Bad',
    artist: 'Michael Jackson',
    genre: 'Pop',
    region: 'USA',
    cover: require('./musics test/michael jackson.jpg'),
    audio: require('./musics test/Michael_Jackson_-_Bad__Shortened_Version_(128k).mp3'),
    duration: '4:19',
    plays: 'Test',
  },
  {
    id: 'nelly-dream',
    title: 'Just A Dream',
    artist: 'Nelly',
    genre: 'R&B',
    region: 'USA',
    cover: require('./musics test/Nelly.jpg'),
    audio: require('./musics test/Nelly_-_Just_A_Dream__Official_Music_Video_(256k).mp3'),
    duration: '4:01',
    plays: 'Test',
    liked: true,
  },
  {
    id: 'rio-roma-vino',
    title: 'Vino el Amor',
    artist: 'Rio Roma',
    genre: 'Latin',
    region: 'Mexique',
    cover: require("./musics test/Río_Roma.jpg"),
    audio: require("./musics test/Río_Roma_-_Vino_el_Amor__Cover_Audio_(128k).mp3"),
    duration: '3:14',
    plays: 'Test',
  },
  {
    id: 'serge-lopangwe',
    title: 'Lopangwe',
    artist: 'Serge Beynaud feat. Eddy Kenzo',
    genre: 'Coupe Decale',
    region: "Cote d'Ivoire",
    cover: require('./musics test/sege beynaud.jpg'),
    audio: require('./musics test/Serge_Beynaud_feat_Eddy_Kenzo_-_Lopangwe_-_Clip_officiel(128k).m4a'),
    duration: '3:49',
    plays: 'Test',
  },
  {
    id: 'sergeo-amour',
    title: 'Amour a Deux',
    artist: 'Sergeo Polo',
    genre: 'Makossa',
    region: 'Cameroun',
    cover: require('./musics test/sergo polo.jpg'),
    audio: require('./musics test/Sergeo_POLO___Amour_a_Deux(128k).mp3'),
    duration: '7:53',
    plays: 'Test',
    liked: true,
  },
  {
    id: '1',
    title: 'Love Nwantiti',
    artist: 'CKay',
    genre: 'Afrobeats',
    region: 'Nigeria',
    cover:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80',
    duration: '2:25',
    plays: '1.2B',
    liked: true,
  },
  {
    id: '2',
    title: 'Jerusalema',
    artist: 'Master KG',
    genre: 'Amapiano',
    region: 'Afrique du Sud',
    cover:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
    duration: '5:43',
    plays: '824M',
  },
  {
    id: '3',
    title: 'Coller la petite',
    artist: 'Franko',
    genre: 'Makossa',
    region: 'Cameroun',
    cover:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80',
    duration: '3:37',
    plays: '96M',
    liked: true,
  },
  {
    id: '4',
    title: 'Premier Gaou',
    artist: 'Magic System',
    genre: 'Coupe Decale',
    region: "Cote d'Ivoire",
    cover:
      'https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?auto=format&fit=crop&w=500&q=80',
    duration: '4:51',
    plays: '301M',
  },
  {
    id: '5',
    title: 'Ye',
    artist: 'Burna Boy',
    genre: 'Afro-Fusion',
    region: 'Nigeria',
    cover:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
    duration: '3:51',
    plays: '441M',
  },
  {
    id: '6',
    title: 'Tchapeu Tchapeu',
    artist: 'Toofan',
    genre: 'Afropop',
    region: 'Togo',
    cover:
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80',
    duration: '3:14',
    plays: '72M',
  },
];

function coverSource(cover?: ImageSourcePropType | string): ImageSourcePropType {
  if (!cover) {
    return require('./musics test/fally ipupa.jpg');
  }
  return typeof cover === 'string' ? {uri: cover} : cover;
}

function audioSource(audio?: number | string): string | null {
  if (!audio) {
    return null;
  }
  if (typeof audio === 'string') {
    return audio;
  }
  return Image.resolveAssetSource(audio)?.uri ?? null;
}

const visualizerBars = [
  22, 44, 58, 49, 43, 28, 61, 72, 79, 38, 21, 42, 75, 34, 45, 64, 28, 22, 51,
  67, 69, 19, 48, 56, 64, 73,
];

const genres = [
  ['Afrobeat', '#ff7a08'],
  ['Amapiano', '#ffb11b'],
  ['Gospel', '#8a2be2'],
  ['Makossa', '#c44536'],
  ['Drill Africa', '#0b0b0f'],
  ['Coupe Decale', '#00a86b'],
  ['Nouveautes', '#f00446'],
  ['Decouverte', '#0877f2'],
];

const starterPlaylists: Playlist[] = [
  {id: 'made-in-africa', name: 'Made in Africa', trackIds: [], createdAt: 'local'},
  {id: 'azonto-night', name: 'Azonto Night', trackIds: [], createdAt: 'local'},
  {id: 'amapiano-sunset', name: 'Amapiano Sunset', trackIds: [], createdAt: 'local'},
];
const shouldShowSplash = typeof jest === 'undefined';

const regions = ['Nigeria', 'Cameroun', "Cote d'Ivoire", 'Afrique du Sud'];

function LogoMark() {
  return (
    <View style={styles.logo}>
      <View style={styles.logoDisc}>
        <View style={styles.logoDot} />
      </View>
      <View style={styles.logoWaveOne} />
      <View style={styles.logoWaveTwo} />
    </View>
  );
}

function TrackRow({
  track,
  active,
  onPress,
  onToggleLike,
}: {
  track: Track;
  active?: boolean;
  onPress: (track: Track) => void;
  onToggleLike: (track: Track) => void;
}) {
  const handleLikePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onToggleLike(track);
  };

  return (
    <Pressable
      onPress={() => onPress(track)}
      style={[styles.trackRow, active && styles.trackRowActive]}>
      <ImageBackground
        source={coverSource(track.cover)}
        imageStyle={styles.trackCoverImage}
        style={styles.trackCover}
      />
      <View style={styles.trackMeta}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.artist} • {track.genre}
        </Text>
      </View>
      <Pressable
        onPress={handleLikePress}
        hitSlop={10}
        style={styles.likeButton}>
        <Text style={styles.like}>{track.liked ? '♥' : '♡'}</Text>
      </Pressable>
      <View style={styles.playButton}>
        <Text style={styles.playIcon}>▶</Text>
      </View>
    </Pressable>
  );
}

function HomeScreen({
  tracks,
  current,
  onPlay,
  onToggleLike,
  searchQuery,
  onSearchQueryChange,
  onOpenSearch,
  onBrowseAll,
  onBrowseFilter,
}: {
  tracks: Track[];
  current: Track;
  onPlay: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onOpenSearch: () => void;
  onBrowseAll: () => void;
  onBrowseFilter: (query: string) => void;
}) {
  const playableTrack = tracks.find(track => track.audio) ?? current;

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heroTitle}>Bonjour Bipon 👋</Text>
          <Text style={styles.heroSub}>Le rythme continue</Text>
        </View>
        <LogoMark />
      </View>
      <Pressable style={styles.searchPill} onPress={onOpenSearch}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          onFocus={onOpenSearch}
          onSubmitEditing={onOpenSearch}
          placeholder="Que veux-tu ecouter ?"
          placeholderTextColor="#c6c0c9"
          returnKeyType="search"
          style={styles.homeSearchInput}
        />
      </Pressable>

      <SectionTitle title="En tendance" action="Tout voir" onActionPress={onBrowseAll} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {['Afrobeat', 'Amapiano', 'Afro-Fusion'].map((name, index) => (
          <Pressable
            key={name}
            onPress={() => onBrowseFilter(name)}
            style={styles.trendCard}>
            <ImageBackground
              source={coverSource(tracks[index]?.cover)}
              imageStyle={styles.trendImage}
              style={styles.trendImageWrap}
            />
            <Text style={styles.trendTitle}>{name}</Text>
            <Text style={styles.trendSub}>
              {index === 0 ? 'Hot hits' : index === 1 ? 'Vibes' : 'Compilation'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionTitle title="Pour toi" />
      <Pressable style={styles.featuredCard} onPress={() => onPlay(playableTrack)}>
        <ImageBackground
          source={coverSource(playableTrack.cover)}
          imageStyle={styles.featuredImage}
          style={styles.featuredImageWrap}
        />
        <View style={styles.featuredText}>
          <Text style={styles.kicker}>Made in Africa</Text>
          <Text style={styles.featuredTitle}>Playlist • 50 titres exclusifs</Text>
        </View>
        <View style={styles.bigPlay}>
          <Text style={styles.bigPlayIcon}>▶</Text>
        </View>
      </Pressable>

      <SectionTitle title="Decouverte regionale" />
      <View style={styles.regionRow}>
        {regions.map(region => (
          <Pressable
            key={region}
            onPress={() => onBrowseFilter(region)}
            style={styles.regionItem}>
            <View style={styles.regionBadge}>
              <Text style={styles.regionFlag}>{region.slice(0, 2)}</Text>
            </View>
            <Text style={styles.regionLabel}>{region}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Choix de la redac" />
      {tracks.slice(0, 4).map(track => (
        <TrackRow
          key={track.id}
          track={track}
          active={track.id === current.id}
          onPress={onPlay}
          onToggleLike={onToggleLike}
        />
      ))}
    </ScrollView>
  );
}

function ExploreScreen({
  tracks,
  onPlay,
  onToggleLike,
  onBrowseFilter,
}: {
  tracks: Track[];
  onPlay: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onBrowseFilter: (query: string) => void;
}) {
  const sessionTrack = tracks.find(track => track.audio) ?? tracks[0];

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.pageTitle}>Explorer</Text>
      <Text style={styles.heroSub}>Decouvre. Ecoute. Ressens.</Text>
      <View style={styles.sessionCard}>
        <Text style={styles.sessionTitle}>★ Azonto Session de la semaine</Text>
        <Text style={styles.sessionText}>
          Plongez dans l'Afrobeats Mix 2026 edite par nos curateurs a Bamako,
          Yaounde et Lagos.
        </Text>
        <Pressable style={styles.ctaButton} onPress={() => onPlay(sessionTrack)}>
          <Text style={styles.ctaText}>Ecouter l'album de l'annee</Text>
        </Pressable>
      </View>

      <SectionTitle title="Parcourir par genre" />
      <View style={styles.genreGrid}>
        {genres.map(([name, color], index) => (
          <Pressable
            key={name}
            onPress={() => onBrowseFilter(name)}
            style={[styles.genreTile, {backgroundColor: color}]}>
            <Text style={styles.genreText}>{name}</Text>
            <View style={[styles.genreArt, {transform: [{rotate: `${index * 7 - 18}deg`}]}]} />
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Parcourir par ambiance" />
      {tracks.slice(1, 6).map(track => (
        <TrackRow
          key={track.id}
          track={track}
          onPress={onPlay}
          onToggleLike={onToggleLike}
        />
      ))}
    </ScrollView>
  );
}

function SearchScreen({
  tracks,
  query,
  onQueryChange,
  onPlay,
  onToggleLike,
}: {
  tracks: Track[];
  query: string;
  onQueryChange: (query: string) => void;
  onPlay: (track: Track) => void;
  onToggleLike: (track: Track) => void;
}) {
  const results = tracks.filter(track =>
    `${track.title} ${track.artist} ${track.genre} ${track.region}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <View style={styles.screenContent}>
      <Text style={styles.pageTitle}>Rechercher</Text>
      <View style={styles.inputWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Titre, artiste, genre ou pays"
          placeholderTextColor="#8d8a94"
          autoFocus
          style={styles.input}
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <TrackRow track={item} onPress={onPlay} onToggleLike={onToggleLike} />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun resultat pour le moment.</Text>}
      />
    </View>
  );
}

function LibraryScreen({
  tracks,
  playlists,
  onPlay,
  onToggleLike,
  onCreatePlaylist,
}: {
  tracks: Track[];
  playlists: Playlist[];
  onPlay: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onCreatePlaylist: (name: string) => void;
}) {
  const liked = tracks.filter(track => track.liked);
  const [playlistName, setPlaylistName] = useState('');
  const createPlaylist = () => {
    onCreatePlaylist(playlistName);
    setPlaylistName('');
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.pageTitle}>Bibliotheque</Text>
      <View style={styles.libraryHero}>
        <Text style={styles.libraryCount}>{liked.length}</Text>
        <Text style={styles.libraryLabel}>titres favoris</Text>
      </View>
      <SectionTitle title="Playlists" />
      <View style={styles.playlistCreateCard}>
        <TextInput
          value={playlistName}
          onChangeText={setPlaylistName}
          placeholder="Nom de la playlist"
          placeholderTextColor="#8d8a94"
          style={styles.playlistInput}
        />
        <Pressable style={styles.playlistCreateButton} onPress={createPlaylist}>
          <Text style={styles.playlistCreateText}>Creer</Text>
        </Pressable>
      </View>
      {playlists.map((playlist, index) => {
        const playlistTracks = playlist.trackIds
          .map(id => tracks.find(track => track.id === id))
          .filter((track): track is Track => Boolean(track));
        const previewTracks = playlistTracks.length
          ? playlistTracks
          : tracks.slice(index, index + 3);
        const firstTrack = previewTracks[0] ?? tracks[0];

        return (
          <Pressable
            key={playlist.id}
            onPress={() => firstTrack && onPlay(firstTrack)}
            style={styles.playlistCard}>
            <View
              style={[
                styles.playlistCover,
                {backgroundColor: genres[index % genres.length][1]},
              ]}
            />
            <View style={styles.playlistTextBlock}>
              <Text style={styles.trackTitle}>{playlist.name}</Text>
              <Text style={styles.trackArtist}>
                {previewTracks.length} titre{previewTracks.length > 1 ? 's' : ''}
              </Text>
            </View>
          </Pressable>
        );
      })}
      <SectionTitle title="Favoris" />
      {liked.map(track => (
        <TrackRow
          key={track.id}
          track={track}
          onPress={onPlay}
          onToggleLike={onToggleLike}
        />
      ))}
    </ScrollView>
  );
}

function ProfileScreen({
  tracks,
  playlistCount,
  authStatus,
  authSession,
  isAuthLoading,
  authError,
  onSignIn,
  onSignUp,
  onSignOut,
}: {
  tracks: Track[];
  playlistCount: number;
  authStatus: AuthStatus;
  authSession: AuthSession | null;
  isAuthLoading: boolean;
  authError: string;
  onSignIn: (payload: AuthSubmitPayload) => void;
  onSignUp: (payload: AuthSubmitPayload) => void;
  onSignOut: () => void;
}) {
  const isLoggedIn = authStatus !== 'guest';
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Cameroun');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submitAuth = () => {
    const payload = {
      fullName: fullName.trim(),
      username: username.trim(),
      phone: phone.trim(),
      country: country.trim(),
      email: email.trim(),
      password,
    };

    if (authMode === 'signin') {
      onSignIn(payload);
      return;
    }

    onSignUp(payload);
  };

  const displayName =
    authSession?.profile.fullName || authSession?.user.email || 'Bipon';

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.pageTitle}>Profil</Text>
      <View style={styles.profileCard}>
        <LogoMark />
        <Text style={styles.profileName}>{isLoggedIn ? displayName : 'Invite'}</Text>
        <Text style={styles.profileMeta}>
          {isLoggedIn
            ? authStatus === 'registered'
              ? 'Compte cree avec Supabase'
              : 'Connecte avec Supabase'
            : 'Connecte-toi pour sauvegarder tes favoris'}
        </Text>
        {isLoggedIn ? (
          <View style={styles.authRow}>
            <Pressable style={styles.authSecondaryButton} onPress={onSignOut}>
              <Text style={styles.authSecondaryText}>Deconnexion</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.authForm}>
            <View style={styles.authSwitch}>
              <Pressable
                style={[
                  styles.authSwitchButton,
                  authMode === 'signup' && styles.authSwitchButtonActive,
                ]}
                onPress={() => setAuthMode('signup')}>
                <Text
                  style={[
                    styles.authSwitchText,
                    authMode === 'signup' && styles.authSwitchTextActive,
                  ]}>
                  Inscription
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.authSwitchButton,
                  authMode === 'signin' && styles.authSwitchButtonActive,
                ]}
                onPress={() => setAuthMode('signin')}>
                <Text
                  style={[
                    styles.authSwitchText,
                    authMode === 'signin' && styles.authSwitchTextActive,
                  ]}>
                  Connexion
                </Text>
              </Pressable>
            </View>
            {authMode === 'signup' ? (
              <>
                <AuthInput
                  label="Nom complet"
                  value={fullName}
                  onChangeText={setFullName}
                />
                <AuthInput label="Pseudo" value={username} onChangeText={setUsername} />
                <AuthInput
                  label="Telephone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <AuthInput label="Pays" value={country} onChangeText={setCountry} />
              </>
            ) : null}
            <AuthInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuthInput
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            <Pressable
              style={[
                styles.authPrimaryButton,
                styles.authSubmitButton,
                isAuthLoading && styles.authButtonDisabled,
              ]}
              onPress={submitAuth}
              disabled={isAuthLoading}>
              <Text style={styles.authPrimaryText}>
                {isAuthLoading
                  ? 'Patiente...'
                  : authMode === 'signup'
                    ? 'Creer le compte'
                    : 'Se connecter'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      <View style={styles.statsRow}>
        <Stat value={`${tracks.length}`} label="Titres" />
        <Stat value={`${playlistCount}`} label="Playlists" />
        <Stat value="4" label="Pays" />
      </View>
      <SectionTitle title="Activite recente" />
      {tracks.slice(0, 3).map(track => (
        <View key={track.id} style={styles.activityRow}>
          <Text style={styles.activityDot}>●</Text>
          <Text style={styles.activityText}>
            Tu as ecoute {track.title} de {track.artist}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function AuthInput({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.authInputWrap}>
      <Text style={styles.authInputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="#8f8794"
        style={styles.authInput}
      />
    </View>
  );
}

function SplashScreen({
  logoScale,
  logoOpacity,
}: {
  logoScale: Animated.Value;
  logoOpacity: Animated.Value;
}) {
  return (
    <View style={styles.splashScreen}>
      <Animated.View
        style={[
          styles.splashLogoWrap,
          {
            opacity: logoOpacity,
            transform: [{scale: logoScale}],
          },
        ]}>
        <LogoMark />
      </Animated.View>
      <Text style={styles.splashTitle}>Azonto</Text>
      <Text style={styles.splashSub}>Afrique urbaine</Text>
    </View>
  );
}

function Stat({value, label}: {value: string; label: string}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({
  title,
  action,
  onActionPress,
}: {
  title: string;
  action?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onActionPress} hitSlop={10}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PlayerSheet({
  track,
  isPlaying,
  position,
  duration,
  onToggle,
  onOpen,
}: {
  track: Track;
  isPlaying: boolean;
  position: number;
  duration: number;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const hasAudio = Boolean(track.audio);
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;
  const handleTogglePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onToggle();
  };

  return (
    <Pressable style={styles.player} onPress={onOpen}>
      <ImageBackground
        source={coverSource(track.cover)}
        imageStyle={styles.playerCoverImage}
        style={styles.playerCover}
      />
      <View style={styles.playerMeta}>
        <Text style={styles.playerTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.playerArtist} numberOfLines={1}>
          {track.artist}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {width: `${progress * 100}%`}]} />
        </View>
        <View style={styles.timerRow}>
          <Text style={styles.timerText}>{formatTime(position)}</Text>
          <Text style={styles.timerText}>{formatTime(duration)}</Text>
        </View>
      </View>
      <Pressable
        onPress={handleTogglePress}
        disabled={!hasAudio}
        style={[styles.playerMainButton, !hasAudio && styles.playerButtonDisabled]}>
        <Text style={styles.bigPlayIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
      </Pressable>
    </Pressable>
  );
}

function FullPlayerScreen({
  track,
  isPlaying,
  position,
  duration,
  isRepeat,
  isAdded,
  isCasting,
  onClose,
  onToggle,
  onPrevious,
  onNext,
  onSeek,
  onToggleLike,
  onToggleAdd,
  onShare,
  onToggleCast,
  onToggleRepeat,
}: {
  track: Track;
  isPlaying: boolean;
  position: number;
  duration: number;
  isRepeat: boolean;
  isAdded: boolean;
  isCasting: boolean;
  onClose: () => void;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onToggleLike: (track: Track) => void;
  onToggleAdd: (track: Track) => void;
  onShare: () => void;
  onToggleCast: () => void;
  onToggleRepeat: () => void;
}) {
  const [progressWidth, setProgressWidth] = useState(1);
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;
  const beat = Math.floor(position * 4);

  const handleSeekPress = (event: GestureResponderEvent) => {
    const nextProgress = Math.max(
      0,
      Math.min(event.nativeEvent.locationX / progressWidth, 1),
    );
    onSeek(nextProgress * duration);
  };

  return (
    <View style={styles.fullPlayer}>
      <View style={styles.fullPlayerPattern} />
      <View style={styles.fullTopBar}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.fullTopIcon}>⌄</Text>
        </Pressable>
        <Text style={styles.fullBrand}>Azonto</Text>
        <Text style={styles.fullTopIcon}>⋮</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.fullContent}>
        <ImageBackground
          source={coverSource(track.cover)}
          imageStyle={styles.fullCoverImage}
          style={styles.fullCover}
        />

        <Text style={styles.fullTitle} numberOfLines={2}>
          {track.title}
        </Text>
        <Text style={styles.fullArtist} numberOfLines={1}>
          {track.artist} • {track.genre}
        </Text>

        <View style={styles.visualizer}>
          {visualizerBars.map((height, index) => {
            const boost = isPlaying ? ((beat + index * 3) % 18) * 1.4 : 0;
            const activeHeight = Math.min(92, height + boost);
            return (
              <View
                key={`${height}-${index}`}
                style={[styles.visualizerBar, {height: activeHeight}]}
              />
            );
          })}
        </View>

        <View style={styles.fullTimerRow}>
          <Text style={styles.fullTimerText}>{formatTime(position)}</Text>
          <Text style={styles.fullTimerText}>
            {formatTime(duration || durationToSeconds(track.duration))}
          </Text>
        </View>
        <Pressable
          onPress={handleSeekPress}
          onLayout={event => setProgressWidth(event.nativeEvent.layout.width)}
          style={styles.fullProgressTrack}>
          <View style={[styles.fullProgressFill, {width: `${progress * 100}%`}]} />
          <View style={[styles.fullProgressThumb, {left: `${progress * 100}%`}]} />
        </Pressable>

        <View style={styles.fullControls}>
          <Pressable onPress={onToggleRepeat} style={styles.fullIconButton}>
            <Text style={[styles.fullControlIcon, isRepeat && styles.fullControlActive]}>
              ↹
            </Text>
          </Pressable>
          <Pressable onPress={onPrevious} style={styles.fullIconButton}>
            <Text style={styles.fullControlIcon}>I◀</Text>
          </Pressable>
          <Pressable onPress={onToggle} style={styles.fullPlayButton}>
            <Text style={styles.fullPlayText}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
          </Pressable>
          <Pressable onPress={onNext} style={styles.fullIconButton}>
            <Text style={styles.fullControlIcon}>▶I</Text>
          </Pressable>
          <Pressable onPress={onToggleRepeat} style={styles.fullIconButton}>
            <Text style={[styles.fullControlIcon, isRepeat && styles.fullControlActive]}>
              ↻
            </Text>
          </Pressable>
        </View>

        <View style={styles.fullActionPanel}>
          <FullAction
            icon={track.liked ? '♥' : '♡'}
            label="Like"
            active={Boolean(track.liked)}
            onPress={() => onToggleLike(track)}
          />
          <FullAction
            icon={isAdded ? '≡✓' : '≡+'}
            label="Add"
            active={isAdded}
            onPress={() => onToggleAdd(track)}
          />
          <FullAction icon="⌯" label="Share" onPress={onShare} />
          <FullAction
            icon={isCasting ? '▣' : '▢'}
            label="Cast"
            active={isCasting}
            onPress={onToggleCast}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function FullAction({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.fullActionButton}>
      <Text style={[styles.fullActionIcon, active && styles.fullActionActive]}>{icon}</Text>
      <Text style={styles.fullActionText}>{label}</Text>
    </Pressable>
  );
}

function TabBar({active, setActive}: {active: TabKey; setActive: (tab: TabKey) => void}) {
  const tabs: Array<[TabKey, string, string]> = [
    ['home', '⌂', 'Accueil'],
    ['explore', '◉', 'Explorer'],
    ['search', '⌕', 'Rechercher'],
    ['library', '▥', 'Bibliotheque'],
    ['profile', '♙', 'Profil'],
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map(([key, icon, label]) => (
        <Pressable key={key} onPress={() => setActive(key)} style={styles.tabItem}>
          <Text style={[styles.tabIcon, active === key && styles.tabActive]}>{icon}</Text>
          <Text style={[styles.tabLabel, active === key && styles.tabActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [tracks, setTracks] = useState<Track[]>(fallbackTracks);
  const [playlists, setPlaylists] = useState<Playlist[]>(starterPlaylists);
  const [current, setCurrent] = useState<Track>(fallbackTracks[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [addedTrackIds, setAddedTrackIds] = useState<string[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('guest');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSplashVisible, setIsSplashVisible] = useState(shouldShowSplash);
  const splashScale = useRef(new Animated.Value(0.72)).current;
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Sound | null>(null);
  const soundTrackIdRef = useRef<string | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repeatRef = useRef(false);

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startProgressTimer = useCallback(() => {
    clearProgressTimer();
    progressTimerRef.current = setInterval(() => {
      const sound = soundRef.current;
      if (!sound) {
        return;
      }

      sound.getCurrentTime(seconds => {
        setPosition(seconds);
      });
    }, 500);
  }, [clearProgressTimer]);

  const releaseSound = useCallback(() => {
    clearProgressTimer();
    const sound = soundRef.current;
    soundRef.current = null;
    soundTrackIdRef.current = null;
    sound?.stop(() => sound.release());
  }, [clearProgressTimer]);

  const startTrack = (track: Track) => {
    const source = audioSource(track.audio);
    setCurrent(track);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);

    releaseSound();

    if (!source) {
      setIsPlaying(false);
      return;
    }

    let sound: Sound;
    try {
      sound = new Sound(source, '', (error, props) => {
        if (soundRef.current !== sound) {
          sound.release();
          return;
        }

        if (error) {
          setIsPlaying(false);
          sound.release();
          if (soundRef.current === sound) {
            soundRef.current = null;
            soundTrackIdRef.current = null;
          }
          return;
        }

        setDuration(props?.duration ?? sound.getDuration());
        const playLoadedSound = () => {
          sound.play(success => {
            if (soundRef.current === sound) {
              if (success && repeatRef.current) {
                sound.setCurrentTime(0);
                setPosition(0);
                setIsPlaying(true);
                startProgressTimer();
                playLoadedSound();
                return;
              }

              setIsPlaying(false);
              clearProgressTimer();
              if (success) {
                sound.setCurrentTime(0);
                setPosition(0);
              }
            }
          });
        };

        playLoadedSound();
        setIsPlaying(true);
        startProgressTimer();
      });
    } catch {
      setIsPlaying(false);
      return;
    }

    soundRef.current = sound;
    soundTrackIdRef.current = track.id;
  };

  const seekTo = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.min(seconds, duration || seconds));
    setPosition(safeSeconds);
    soundRef.current?.setCurrentTime(safeSeconds);
  };

  const playTrackByOffset = (offset: number) => {
    const playableTracks = tracks.filter(track => track.audio);
    const queue = playableTracks.length ? playableTracks : tracks;
    const currentIndex = queue.findIndex(track => track.id === current.id);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + offset + queue.length) % queue.length;
    startTrack(queue[nextIndex]);
  };

  const playPreviousTrack = () => {
    playTrackByOffset(-1);
  };

  const playNextTrack = () => {
    playTrackByOffset(1);
  };

  const shareCurrentTrack = () => {
    Share.share({
      title: current.title,
      message: `Ecoute ${current.title} de ${current.artist} sur Azonto.`,
    }).catch(() => undefined);
  };

  const toggleRepeat = () => {
    setIsRepeat(previous => {
      const next = !previous;
      repeatRef.current = next;
      return next;
    });
  };

  const toggleAddedTrack = (track: Track) => {
    setAddedTrackIds(previousIds =>
      previousIds.includes(track.id)
        ? previousIds.filter(id => id !== track.id)
        : [...previousIds, track.id],
    );
  };

  const toggleCurrentTrack = () => {
    if (!current.audio) {
      return;
    }

    const sound = soundRef.current;
    if (!sound || soundTrackIdRef.current !== current.id) {
      startTrack(current);
      return;
    }

    if (isPlaying) {
      sound.pause(() => {
        clearProgressTimer();
        setIsPlaying(false);
      });
    } else {
      sound.play(success => {
        if (success && repeatRef.current) {
          sound.setCurrentTime(0);
          setPosition(0);
          setIsPlaying(true);
          sound.play(() => setIsPlaying(false));
          return;
        }
        clearProgressTimer();
        setIsPlaying(false);
        setPosition(0);
      });
      setIsPlaying(true);
      startProgressTimer();
    }
  };

  const openSearch = () => {
    setActiveTab('search');
  };

  const browseAll = () => {
    setSearchQuery('');
    setActiveTab('search');
  };

  const browseFilter = (query: string) => {
    setSearchQuery(query);
    setActiveTab('search');
  };

  const toggleLike = (track: Track) => {
    setTracks(previousTracks =>
      previousTracks.map(item =>
        item.id === track.id ? {...item, liked: !item.liked} : item,
      ),
    );
    if (current.id === track.id) {
      setCurrent(previousCurrent => ({
        ...previousCurrent,
        liked: !previousCurrent.liked,
      }));
    }
  };

  const createPlaylist = (name: string) => {
    const safeName = name.trim();
    if (!safeName) {
      return;
    }

    const selectedTracks = tracks.filter(track => track.liked);
    const trackIds = (selectedTracks.length ? selectedTracks : tracks.slice(0, 3)).map(
      track => track.id,
    );

    setPlaylists(previousPlaylists => [
      {
        id: `playlist-${Date.now()}`,
        name: safeName,
        trackIds,
        createdAt: new Date().toISOString(),
      },
      ...previousPlaylists,
    ]);
  };

  const validateAuthPayload = (payload: AuthSubmitPayload, mode: AuthStatus) => {
    if (!payload.email || !payload.password) {
      return 'Email et mot de passe sont obligatoires.';
    }

    if (mode === 'registered' && !payload.fullName) {
      return 'Le nom complet est obligatoire pour creer le compte.';
    }

    if (payload.password.length < 6) {
      return 'Le mot de passe doit avoir au moins 6 caracteres.';
    }

    return '';
  };

  const signIn = async (payload: AuthSubmitPayload) => {
    const validationError = validateAuthPayload(payload, 'signed-in');
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    setIsAuthLoading(true);
    setAuthError('');
    try {
      const session = await signInWithEmail(payload.email, payload.password, {
        fullName: payload.fullName,
        username: payload.username,
        phone: payload.phone,
        country: payload.country,
      });
      setAuthSession(session);
      setAuthStatus('signed-in');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Connexion impossible.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signUp = async (payload: AuthSubmitPayload) => {
    const validationError = validateAuthPayload(payload, 'registered');
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    setIsAuthLoading(true);
    setAuthError('');
    try {
      const session = await signUpWithEmail(payload.email, payload.password, {
        fullName: payload.fullName,
        username: payload.username,
        phone: payload.phone,
        country: payload.country,
      });
      setAuthSession(session);
      setAuthStatus('registered');
      if (!session.accessToken) {
        setAuthError('Compte cree. Verifie ton email avant la connexion.');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Inscription impossible.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signOut = () => {
    setAuthSession(null);
    setAuthStatus('guest');
    setAuthError('');
  };

  React.useEffect(() => {
    if (!shouldShowSplash) {
      return;
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(splashScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(780),
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 1.08,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => setIsSplashVisible(false));
  }, [splashOpacity, splashScale]);

  React.useEffect(() => {
    return () => {
      clearProgressTimer();
      soundRef.current?.release();
    };
  }, [clearProgressTimer]);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFullPlayerOpen) {
        setIsFullPlayerOpen(false);
        return true;
      }

      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [activeTab, isFullPlayerOpen]);

  React.useEffect(() => {
    getRemoteSongs()
      .then(remoteSongs => {
        if (remoteSongs.length) {
          const remoteTracks = remoteSongs.map(mapRemoteSong);
          releaseSound();
          setTracks(remoteTracks);
          setCurrent(remoteTracks[0]);
          setIsPlaying(false);
          setPosition(0);
          setDuration(0);
        }
      })
      .catch(() => undefined);
  }, [releaseSound]);

  const screen = (() => {
    switch (activeTab) {
      case 'explore':
        return (
          <ExploreScreen
            tracks={tracks}
            onPlay={startTrack}
            onToggleLike={toggleLike}
            onBrowseFilter={browseFilter}
          />
        );
      case 'search':
        return (
          <SearchScreen
            tracks={tracks}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onPlay={startTrack}
            onToggleLike={toggleLike}
          />
        );
      case 'library':
        return (
          <LibraryScreen
            tracks={tracks}
            playlists={playlists}
            onPlay={startTrack}
            onToggleLike={toggleLike}
            onCreatePlaylist={createPlaylist}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            tracks={tracks}
            playlistCount={playlists.length}
            authStatus={authStatus}
            authSession={authSession}
            isAuthLoading={isAuthLoading}
            authError={authError}
            onSignIn={signIn}
            onSignUp={signUp}
            onSignOut={signOut}
          />
        );
      default:
        return (
          <HomeScreen
            tracks={tracks}
            current={current}
            onPlay={startTrack}
            onToggleLike={toggleLike}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onOpenSearch={openSearch}
            onBrowseAll={browseAll}
            onBrowseFilter={browseFilter}
          />
        );
    }
  })();

  if (isSplashVisible) {
    return <SplashScreen logoScale={splashScale} logoOpacity={splashOpacity} />;
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar barStyle="light-content" backgroundColor="#050509" />
      {isFullPlayerOpen ? (
        <FullPlayerScreen
          track={current}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          isRepeat={isRepeat}
          isAdded={addedTrackIds.includes(current.id)}
          isCasting={isCasting}
          onClose={() => setIsFullPlayerOpen(false)}
          onToggle={toggleCurrentTrack}
          onPrevious={playPreviousTrack}
          onNext={playNextTrack}
          onSeek={seekTo}
          onToggleLike={toggleLike}
          onToggleAdd={toggleAddedTrack}
          onShare={shareCurrentTrack}
          onToggleCast={() => setIsCasting(previous => !previous)}
          onToggleRepeat={toggleRepeat}
        />
      ) : (
        <>
          <View style={styles.backgroundGlow} />
          <View style={styles.appFrame}>
            {screen}
            <PlayerSheet
              track={current}
              isPlaying={isPlaying}
              position={position}
              duration={duration}
              onToggle={toggleCurrentTrack}
              onOpen={() => setIsFullPlayerOpen(true)}
            />
            <TabBar active={activeTab} setActive={setActiveTab} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#050509',
  },
  splashScreen: {
    flex: 1,
    backgroundColor: '#050509',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#15151d',
    borderWidth: 1,
    borderColor: '#624019',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 18,
  },
  splashSub: {
    color: '#d69d44',
    fontWeight: '800',
    marginTop: 5,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  backgroundGlow: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,122,8,0.16)',
  },
  appFrame: {
    flex: 1,
    paddingBottom: 152,
  },
  screenContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    color: '#f8f4ec',
    fontSize: 22,
    fontWeight: '800',
  },
  heroSub: {
    color: '#d69d44',
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#15151d',
    borderWidth: 1,
    borderColor: '#624019',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#ff7a08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffc247',
  },
  logoWaveOne: {
    position: 'absolute',
    width: 42,
    height: 10,
    borderRadius: 10,
    backgroundColor: '#00a86b',
    transform: [{rotate: '-24deg'}],
    bottom: 12,
    right: -10,
  },
  logoWaveTwo: {
    position: 'absolute',
    width: 32,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#ffc247',
    transform: [{rotate: '-24deg'}],
    bottom: 21,
    right: -6,
  },
  searchPill: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#12121a',
    borderWidth: 1,
    borderColor: '#24212a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
  },
  searchIcon: {
    color: '#ff7a08',
    fontSize: 20,
    marginRight: 10,
  },
  searchPlaceholder: {
    color: '#c6c0c9',
    fontWeight: '700',
    fontSize: 13,
  },
  homeSearchInput: {
    flex: 1,
    color: '#f5f1ec',
    fontWeight: '700',
    fontSize: 13,
    paddingVertical: 0,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#f5f1ec',
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
    fontSize: 15,
  },
  sectionAction: {
    color: '#ffb11b',
    fontWeight: '800',
    fontSize: 12,
  },
  trendCard: {
    width: 104,
    minHeight: 140,
    borderRadius: 8,
    backgroundColor: '#13131b',
    padding: 9,
    marginRight: 12,
  },
  trendImageWrap: {
    height: 78,
    borderRadius: 6,
    overflow: 'hidden',
  },
  trendImage: {
    borderRadius: 6,
  },
  trendTitle: {
    color: '#ffffff',
    fontWeight: '800',
    marginTop: 9,
    fontSize: 12,
  },
  trendSub: {
    color: '#d69d44',
    fontSize: 10,
    marginTop: 2,
  },
  featuredCard: {
    minHeight: 86,
    borderRadius: 8,
    backgroundColor: '#15151d',
    borderWidth: 1,
    borderColor: '#24212a',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  featuredImageWrap: {
    width: 58,
    height: 58,
  },
  featuredImage: {
    borderRadius: 8,
  },
  featuredText: {
    flex: 1,
    marginLeft: 13,
  },
  kicker: {
    color: '#ffb11b',
    textTransform: 'uppercase',
    fontWeight: '900',
    fontSize: 12,
  },
  featuredTitle: {
    color: '#f3eee7',
    marginTop: 5,
    fontWeight: '700',
  },
  bigPlay: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ff7a08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlayIcon: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
    marginLeft: 2,
  },
  regionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  regionItem: {
    alignItems: 'center',
    width: 76,
  },
  regionBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#f5f1ec',
    backgroundColor: '#111118',
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionFlag: {
    color: '#00a86b',
    fontWeight: '900',
  },
  regionLabel: {
    color: '#97939d',
    marginTop: 8,
    fontSize: 10,
    textAlign: 'center',
  },
  trackRow: {
    minHeight: 70,
    borderRadius: 8,
    backgroundColor: '#14141c',
    borderWidth: 1,
    borderColor: '#23202a',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
  },
  trackRowActive: {
    borderColor: '#ff7a08',
    backgroundColor: '#1c1718',
  },
  trackCover: {
    width: 48,
    height: 48,
  },
  trackCoverImage: {
    borderRadius: 7,
  },
  trackMeta: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    color: '#f5f1ec',
    fontWeight: '800',
    fontSize: 14,
  },
  trackArtist: {
    color: '#9e98a3',
    fontSize: 12,
    marginTop: 3,
  },
  like: {
    color: '#ff7a08',
    fontSize: 22,
  },
  likeButton: {
    width: 34,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#08080d',
    marginLeft: 2,
    fontWeight: '900',
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  sessionCard: {
    marginTop: 22,
    borderRadius: 12,
    backgroundColor: '#2a1a11',
    borderWidth: 1,
    borderColor: '#663b1c',
    padding: 18,
  },
  sessionTitle: {
    color: '#f7d28b',
    fontWeight: '900',
    fontSize: 15,
  },
  sessionText: {
    color: '#d8c8b7',
    lineHeight: 20,
    marginTop: 12,
    fontSize: 13,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    backgroundColor: '#ff7a08',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: {
    color: '#120d09',
    fontWeight: '900',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  genreTile: {
    width: '48%',
    height: 72,
    borderRadius: 8,
    marginBottom: 12,
    padding: 13,
    overflow: 'hidden',
  },
  genreText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  genreArt: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  inputWrap: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#f2f0ed',
    marginTop: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: '#08080d',
    fontWeight: '700',
  },
  emptyText: {
    color: '#a9a4ad',
    marginTop: 30,
    textAlign: 'center',
  },
  libraryHero: {
    height: 120,
    borderRadius: 12,
    marginTop: 20,
    backgroundColor: '#0f5f43',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryCount: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
  },
  libraryLabel: {
    color: '#d8f4df',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  playlistCard: {
    height: 66,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  playlistCreateCard: {
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor: '#24212a',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 12,
  },
  playlistInput: {
    flex: 1,
    color: '#ffffff',
    fontWeight: '700',
    paddingHorizontal: 10,
  },
  playlistCreateButton: {
    minWidth: 78,
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: '#ff7a08',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  playlistCreateText: {
    color: '#120d09',
    fontWeight: '900',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  playlistCover: {
    width: 52,
    height: 52,
    borderRadius: 6,
    marginRight: 12,
  },
  playlistTextBlock: {
    flex: 1,
  },
  profileCard: {
    borderRadius: 12,
    marginTop: 20,
    backgroundColor: '#15151d',
    borderWidth: 1,
    borderColor: '#24212a',
    alignItems: 'center',
    padding: 24,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 14,
  },
  profileMeta: {
    color: '#a9a4ad',
    marginTop: 4,
  },
  authRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  authForm: {
    width: '100%',
    marginTop: 18,
  },
  authSwitch: {
    flexDirection: 'row',
    backgroundColor: '#0f0f16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2530',
    padding: 4,
    marginBottom: 12,
  },
  authSwitchButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authSwitchButtonActive: {
    backgroundColor: '#ff7a08',
  },
  authSwitchText: {
    color: '#b8b0bd',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  authSwitchTextActive: {
    color: '#120d09',
  },
  authInputWrap: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: '#0f0f16',
    borderWidth: 1,
    borderColor: '#2a2530',
    paddingHorizontal: 12,
    paddingTop: 7,
    marginBottom: 10,
  },
  authInputLabel: {
    color: '#d69d44',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  authInput: {
    color: '#ffffff',
    fontWeight: '700',
    paddingVertical: 5,
    fontSize: 14,
  },
  authError: {
    color: '#ff9f85',
    fontWeight: '700',
    marginBottom: 10,
  },
  authPrimaryButton: {
    minWidth: 116,
    borderRadius: 22,
    backgroundColor: '#ff7a08',
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
  },
  authSubmitButton: {
    width: '100%',
    minHeight: 46,
    justifyContent: 'center',
    marginTop: 2,
  },
  authButtonDisabled: {
    opacity: 0.62,
  },
  authPrimaryText: {
    color: '#120d09',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  authSecondaryButton: {
    minWidth: 116,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ff7a08',
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
  },
  authSecondaryText: {
    color: '#ffb11b',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statBox: {
    width: '31%',
    borderRadius: 8,
    backgroundColor: '#111118',
    alignItems: 'center',
    padding: 14,
  },
  statValue: {
    color: '#ffb11b',
    fontWeight: '900',
    fontSize: 22,
  },
  statLabel: {
    color: '#98939e',
    fontSize: 12,
    marginTop: 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  activityDot: {
    color: '#00a86b',
    marginRight: 10,
  },
  activityText: {
    color: '#d7d1da',
    flex: 1,
  },
  player: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 72,
    height: 82,
    borderRadius: 8,
    backgroundColor: '#23212c',
    borderWidth: 1,
    borderColor: '#403845',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 9,
  },
  playerCover: {
    width: 54,
    height: 54,
  },
  playerCoverImage: {
    borderRadius: 6,
  },
  playerMeta: {
    flex: 1,
    marginLeft: 12,
  },
  playerTitle: {
    color: '#ffffff',
    fontWeight: '900',
  },
  playerArtist: {
    color: '#b5adb9',
    marginTop: 3,
    fontSize: 12,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#4a4652',
    marginTop: 8,
  },
  progressFill: {
    width: '44%',
    height: 3,
    borderRadius: 2,
    backgroundColor: '#00a86b',
  },
  timerRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timerText: {
    color: '#98939e',
    fontSize: 10,
    fontWeight: '700',
  },
  playerHeart: {
    color: '#ff7a08',
    fontSize: 22,
    marginHorizontal: 10,
  },
  playerMainButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerButtonDisabled: {
    opacity: 0.45,
  },
  fullPlayer: {
    flex: 1,
    backgroundColor: '#151315',
  },
  fullPlayerPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#1b1719',
    opacity: 0.92,
  },
  fullTopBar: {
    height: 62,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#262126',
    backgroundColor: '#161315',
  },
  fullTopIcon: {
    color: '#d7c7bd',
    fontSize: 26,
    fontWeight: '900',
    width: 34,
    textAlign: 'center',
  },
  fullBrand: {
    color: '#f3b077',
    fontSize: 16,
    fontWeight: '800',
  },
  fullContent: {
    paddingHorizontal: 17,
    paddingTop: 48,
    paddingBottom: 22,
    alignItems: 'center',
  },
  fullCover: {
    width: '92%',
    aspectRatio: 1.45,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#2b2424',
  },
  fullCoverImage: {
    borderRadius: 10,
  },
  fullTitle: {
    color: '#f3ebe6',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    marginTop: 36,
    textAlign: 'center',
  },
  fullArtist: {
    color: '#f19a5a',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  visualizer: {
    width: '100%',
    height: 112,
    marginTop: 38,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  visualizerBar: {
    width: 6,
    borderRadius: 5,
    backgroundColor: '#ff7812',
  },
  fullTimerRow: {
    width: '100%',
    marginTop: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fullTimerText: {
    color: '#a79b97',
    fontSize: 12,
    fontWeight: '800',
  },
  fullProgressTrack: {
    width: '100%',
    height: 18,
    justifyContent: 'center',
  },
  fullProgressFill: {
    height: 5,
    borderRadius: 5,
    backgroundColor: '#ff7812',
  },
  fullProgressThumb: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    marginLeft: -6,
    backgroundColor: '#ffa15a',
  },
  fullControls: {
    width: '100%',
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  fullIconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullControlIcon: {
    color: '#ded7d3',
    fontSize: 23,
    fontWeight: '900',
  },
  fullControlActive: {
    color: '#ff7812',
  },
  fullPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff7812',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPlayText: {
    color: '#1c1717',
    fontSize: 32,
    fontWeight: '900',
  },
  fullActionPanel: {
    width: '100%',
    minHeight: 74,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#302832',
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(18,16,20,0.86)',
  },
  fullActionButton: {
    width: '24%',
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullActionIcon: {
    color: '#f1dfd7',
    fontSize: 24,
    fontWeight: '900',
  },
  fullActionActive: {
    color: '#ff7812',
  },
  fullActionText: {
    color: '#b8aaa5',
    marginTop: 5,
    fontSize: 11,
    fontWeight: '800',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    backgroundColor: '#101016',
    borderTopWidth: 1,
    borderTopColor: '#23202a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    width: '20%',
    alignItems: 'center',
  },
  tabIcon: {
    color: '#8d8993',
    fontSize: 19,
    fontWeight: '900',
  },
  tabLabel: {
    color: '#8d8993',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  tabActive: {
    color: '#ff7a08',
  },
});
