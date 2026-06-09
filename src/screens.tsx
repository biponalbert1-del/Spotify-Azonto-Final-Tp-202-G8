import React, {useState} from 'react';
import {
  Animated,
  FlatList,
  GestureResponderEvent,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {genres} from './mediaAssets';
import {coverSource} from './playerUtils';
import {AuthSession} from './services/supabase';
import {styles} from './styles';
import {
  AuthStatus,
  AuthSubmitPayload,
  GroupPlaylist,
  Playlist,
  TabKey,
  Track,
} from './types';

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

export function HomeScreen({
  tracks,
  current,
  displayName,
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
  displayName: string;
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
          <Text style={styles.heroTitle}>Bonjour {displayName}</Text>
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

export function ExploreScreen({
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

export function SearchScreen({
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

export function LibraryScreen({
  tracks,
  playlists,
  groupPlaylists,
  unlockedGroupIds,
  isLocalLoading,
  localSongCount,
  onPlay,
  onToggleLike,
  onCreatePlaylist,
  onCreateGroupPlaylist,
  onJoinGroupPlaylist,
  onAddSongsToGroup,
  onLoadLocalSongs,
}: {
  tracks: Track[];
  playlists: Playlist[];
  groupPlaylists: GroupPlaylist[];
  unlockedGroupIds: string[];
  isLocalLoading: boolean;
  localSongCount: number;
  onPlay: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onCreatePlaylist: (name: string) => void;
  onCreateGroupPlaylist: (name: string, code: string, trackIds: string[]) => void;
  onJoinGroupPlaylist: (groupId: string, code: string) => boolean;
  onAddSongsToGroup: (groupId: string, trackIds: string[]) => void;
  onLoadLocalSongs: () => void;
}) {
  const liked = tracks.filter(track => track.liked);
  const localTracks = tracks.filter(track => track.genre === 'Local');
  const [playlistName, setPlaylistName] = useState('');
  const [showGroups, setShowGroups] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [selectedGroupTrackIds, setSelectedGroupTrackIds] = useState<string[]>([]);
  const [joinCodes, setJoinCodes] = useState<Record<string, string>>({});
  const [groupMessage, setGroupMessage] = useState('');
  const createPlaylist = () => {
    onCreatePlaylist(playlistName);
    setPlaylistName('');
  };
  const toggleGroupTrack = (trackId: string) => {
    setSelectedGroupTrackIds(previousIds =>
      previousIds.includes(trackId)
        ? previousIds.filter(id => id !== trackId)
        : [...previousIds, trackId],
    );
  };
  const createGroupPlaylist = () => {
    const safeCode = groupCode.replace(/\D/g, '').slice(0, 5);
    if (!groupName.trim() || safeCode.length !== 5 || !selectedGroupTrackIds.length) {
      setGroupMessage('Nom, code a 5 chiffres et au moins un son sont obligatoires.');
      return;
    }

    onCreateGroupPlaylist(groupName.trim(), safeCode, selectedGroupTrackIds);
    setGroupName('');
    setGroupCode('');
    setSelectedGroupTrackIds([]);
    setGroupMessage('Playlist de groupe creee.');
  };
  const joinGroup = (groupId: string) => {
    const success = onJoinGroupPlaylist(groupId, joinCodes[groupId] ?? '');
    setGroupMessage(success ? 'Groupe ouvert.' : 'Code incorrect.');
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.pageTitle}>Bibliotheque</Text>
      <View style={styles.libraryHero}>
        <Text style={styles.libraryCount}>{liked.length}</Text>
        <Text style={styles.libraryLabel}>titres favoris</Text>
      </View>
      <Pressable
        style={[styles.localSongsButton, isLocalLoading && styles.authButtonDisabled]}
        onPress={onLoadLocalSongs}
        disabled={isLocalLoading}>
        <Text style={styles.localSongsIcon}>♪</Text>
        <View style={styles.localSongsTextBlock}>
          <Text style={styles.localSongsTitle}>
            {isLocalLoading ? 'Lecture du telephone...' : 'Songs du telephone'}
          </Text>
          <Text style={styles.localSongsMeta}>
            {localSongCount || localTracks.length} titre
            {(localSongCount || localTracks.length) > 1 ? 's' : ''} local
            {(localSongCount || localTracks.length) > 1 ? 's' : ''}
          </Text>
        </View>
      </Pressable>
      {localTracks.length ? (
        <>
          <SectionTitle title="Telephone" />
          {localTracks.map(track => (
            <TrackRow
              key={track.id}
              track={track}
              onPress={onPlay}
              onToggleLike={onToggleLike}
            />
          ))}
        </>
      ) : null}
      <SectionTitle title="Groupes" />
      <Pressable
        style={styles.groupToggleButton}
        onPress={() => setShowGroups(previous => !previous)}>
        <Text style={styles.groupToggleText}>
          {showGroups ? 'Masquer les playlists de groupe' : 'Afficher les playlists de groupe'}
        </Text>
      </Pressable>
      {showGroups ? (
        <View style={styles.groupPanel}>
          <Text style={styles.groupPanelTitle}>Creer une playlist de groupe</Text>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Nom du groupe"
            placeholderTextColor="#8d8a94"
            style={styles.playlistInput}
          />
          <TextInput
            value={groupCode}
            onChangeText={value => setGroupCode(value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Code a 5 chiffres"
            placeholderTextColor="#8d8a94"
            keyboardType="number-pad"
            maxLength={5}
            style={styles.playlistInput}
          />
          <Text style={styles.groupSubTitle}>Choisir les songs</Text>
          {tracks.slice(0, 12).map(track => {
            const selected = selectedGroupTrackIds.includes(track.id);
            return (
              <Pressable
                key={`group-select-${track.id}`}
                style={[styles.groupSongRow, selected && styles.groupSongRowActive]}
                onPress={() => toggleGroupTrack(track.id)}>
                <Text style={styles.groupSongCheck}>{selected ? '✓' : '+'}</Text>
                <Text style={styles.groupSongTitle} numberOfLines={1}>
                  {track.title} - {track.artist}
                </Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.playlistCreateButton} onPress={createGroupPlaylist}>
            <Text style={styles.playlistCreateText}>Creer groupe</Text>
          </Pressable>
          {groupMessage ? <Text style={styles.groupMessage}>{groupMessage}</Text> : null}
          <Text style={styles.groupPanelTitle}>Playlists presentes</Text>
          {groupPlaylists.map(group => {
            const unlocked = unlockedGroupIds.includes(group.id);
            const groupTracks = group.tracks?.length
              ? group.tracks
              : group.trackIds
                  .map(id => tracks.find(track => track.id === id))
                  .filter((track): track is Track => Boolean(track));

            return (
              <View key={group.id} style={styles.groupCard}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMeta}>
                  {groupTracks.length} song{groupTracks.length > 1 ? 's' : ''} • {group.memberCount} membre
                  {group.memberCount > 1 ? 's' : ''}
                </Text>
                {unlocked ? (
                  <>
                    {groupTracks.slice(0, 4).map(track => (
                      <TrackRow
                        key={`${group.id}-${track.id}`}
                        track={track}
                        onPress={onPlay}
                        onToggleLike={onToggleLike}
                      />
                    ))}
                    <Pressable
                      style={styles.groupAddButton}
                      onPress={() => onAddSongsToGroup(group.id, selectedGroupTrackIds)}>
                      <Text style={styles.groupAddText}>Ajouter les songs cochees</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.groupJoinRow}>
                    <TextInput
                      value={joinCodes[group.id] ?? ''}
                      onChangeText={value =>
                        setJoinCodes(previous => ({
                          ...previous,
                          [group.id]: value.replace(/\D/g, '').slice(0, 5),
                        }))
                      }
                      placeholder="Entrer le code"
                      placeholderTextColor="#8d8a94"
                      keyboardType="number-pad"
                      maxLength={5}
                      style={styles.groupCodeInput}
                    />
                    <Pressable style={styles.groupJoinButton} onPress={() => joinGroup(group.id)}>
                      <Text style={styles.groupJoinText}>Ouvrir</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : null}
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

export function ProfileScreen({
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

export function SplashScreen({
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

export function TabBar({active, setActive}: {active: TabKey; setActive: (tab: TabKey) => void}) {
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
