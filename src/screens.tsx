import React, {useMemo, useState} from 'react';
import {
  Animated,
  FlatList,
  GestureResponderEvent,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {genres} from './mediaAssets';
import {coverSource} from './playerUtils';
import {pickPhoneFile, uploadPhoneFileToSupabase} from './services/localSongs';
import {AuthSession} from './services/supabase';
import {styles} from './styles';
import {
  AuthStatus,
  AuthSubmitPayload,
  AppNotification,
  ArtistSongPayload,
  GroupPlaylist,
  GroupSyncProgress,
  Playlist,
  PhoneFile,
  TabKey,
  Track,
} from './types';

const regions = ['Nigeria', 'Cameroun', "Cote d'Ivoire", 'Afrique du Sud'];
const artistTypes = ['Afro-pop', 'Variete', 'Pop', 'Afrobeat', 'Amapiano', 'Makossa'];
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
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.heroGreeting}>Bonjour</Text>
            <Text style={styles.heroName}>{displayName}</Text>
          </View>
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
  const results = useMemo(
    () =>
      tracks.filter(track =>
        `${track.title} ${track.artist} ${track.genre} ${track.region} ${track.album ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, tracks],
  );

  const searchGoogle = () => {
    const searchText = query.trim() || 'Azonto music';
    Linking.openURL(
      `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
    ).catch(() => undefined);
  };

  return (
    <View style={styles.screenContent}>
      <Text style={styles.pageTitle}>Rechercher</Text>
      <View style={styles.inputWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Titre, artiste, album ou pays"
          placeholderTextColor="#8d8a94"
          autoFocus
          style={styles.input}
        />
      </View>
      <Pressable style={styles.googleButton} onPress={searchGoogle}>
        <Text style={styles.googleText}>
          <Text style={styles.googleBlue}>G</Text>
          <Text style={styles.googleRed}>o</Text>
          <Text style={styles.googleYellow}>o</Text>
          <Text style={styles.googleBlue}>g</Text>
          <Text style={styles.googleGreen}>l</Text>
          <Text style={styles.googleRed}>e</Text>
        </Text>
        <Text style={styles.googleSubText}>Recherche web</Text>
      </Pressable>
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <TrackRow track={item} onPress={onPlay} onToggleLike={onToggleLike} />
        )}
        initialNumToRender={12}
        windowSize={8}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun resultat pour le moment.</Text>}
      />
    </View>
  );
}

export function LegacyLibraryScreen({
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
  onCreateGroupPlaylist: (
    name: string,
    code: string,
    trackIds: string[],
  ) => Promise<boolean>;
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
  const createGroupPlaylist = async () => {
    const safeCode = groupCode.replace(/\D/g, '').slice(0, 5);
    if (!groupName.trim() || safeCode.length !== 5 || !selectedGroupTrackIds.length) {
      setGroupMessage('Nom, code a 5 chiffres et au moins un son sont obligatoires.');
      return;
    }

    const success = await onCreateGroupPlaylist(
      groupName.trim(),
      safeCode,
      selectedGroupTrackIds,
    );
    setGroupName('');
    setGroupCode('');
    setSelectedGroupTrackIds([]);
    setGroupMessage(
      success ? 'Playlist de groupe creee.' : 'Impossible de creer la playlist de groupe.',
    );
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

type LibraryView =
  | 'home'
  | 'local'
  | 'create-playlist'
  | 'create-playlist-songs'
  | 'playlist-detail'
  | 'edit-playlist-songs'
  | 'create-group'
  | 'create-group-songs'
  | 'group-detail'
  | 'group-members'
  | 'group-add-songs';

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
  onUpdatePlaylistTracks,
  onCreateGroupPlaylist,
  onJoinGroupPlaylist,
  onAddSongsToGroup,
  onDeleteGroupPlaylist,
  onResyncGroupPlaylist,
  onLoadLocalSongs,
  currentUserId,
}: {
  tracks: Track[];
  playlists: Playlist[];
  groupPlaylists: GroupPlaylist[];
  unlockedGroupIds: string[];
  isLocalLoading: boolean;
  localSongCount: number;
  onPlay: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onCreatePlaylist: (name: string, trackIds?: string[]) => void;
  onUpdatePlaylistTracks: (playlistId: string, trackIds: string[]) => void;
  onCreateGroupPlaylist: (
    name: string,
    code: string,
    trackIds: string[],
    onProgress?: (progress: GroupSyncProgress) => void,
  ) => Promise<boolean>;
  onJoinGroupPlaylist: (groupId: string, code: string) => Promise<boolean>;
  onAddSongsToGroup: (
    groupId: string,
    trackIds: string[],
    onProgress?: (progress: GroupSyncProgress) => void,
  ) => Promise<boolean>;
  onDeleteGroupPlaylist: (groupId: string) => Promise<boolean>;
  onResyncGroupPlaylist: (
    groupId: string,
    onProgress?: (progress: GroupSyncProgress) => void,
  ) => Promise<boolean>;
  onLoadLocalSongs: () => void;
  currentUserId: string | null;
}) {
  const liked = useMemo(() => tracks.filter(track => track.liked), [tracks]);
  const localTracks = useMemo(
    () => tracks.filter(track => track.genre === 'Local'),
    [tracks],
  );
  const trackById = useMemo(
    () => new Map(tracks.map(track => [track.id, track])),
    [tracks],
  );
  const [view, setView] = useState<LibraryView>('home');
  const [playlistName, setPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistTrackIds, setPlaylistTrackIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupTrackIds, setGroupTrackIds] = useState<string[]>([]);
  const [groupAddTrackIds, setGroupAddTrackIds] = useState<string[]>([]);
  const [joinCodes, setJoinCodes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [showLocalSelection, setShowLocalSelection] = useState(false);
  const [isGroupSaving, setIsGroupSaving] = useState(false);
  const [groupSyncProgress, setGroupSyncProgress] = useState<GroupSyncProgress>({
    active: false,
    sent: 0,
    total: 0,
    message: '',
  });

  const selectedPlaylist = playlists.find(item => item.id === selectedPlaylistId);
  const selectedGroup = groupPlaylists.find(item => item.id === selectedGroupId);
  const groupTracks = selectedGroup
    ? selectedGroup.tracks?.length
      ? selectedGroup.tracks
      : selectedGroup.trackIds
          .map(id => trackById.get(id))
          .filter((track): track is Track => Boolean(track))
    : [];
  const selectedPlaylistTracks = selectedPlaylist
    ? selectedPlaylist.trackIds
        .map(id => trackById.get(id))
        .filter((track): track is Track => Boolean(track))
    : [];

  const toggleId = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter(previous =>
      previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id],
    );
  };

  const renderBackButton = () => (
    <Pressable style={styles.backButton} onPress={() => setView('home')}>
      <Text style={styles.backButtonText}>Retour</Text>
    </Pressable>
  );

  const renderSelectableTrack = (
    item: Track,
    selectedIds: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    const selected = selectedIds.includes(item.id);
    return (
      <Pressable
        style={[styles.groupSongRow, selected && styles.groupSongRowActive]}
        onPress={() => toggleId(item.id, setter)}>
        <Text style={styles.groupSongCheck}>{selected ? '✓' : '+'}</Text>
        <Text style={styles.groupSongTitle} numberOfLines={1}>
          {item.title} - {item.artist}
        </Text>
      </Pressable>
    );
  };

  const selectableTracks = showLocalSelection ? localTracks : tracks;

  const showLocalMusic = () => {
    if (!localTracks.length) {
      onLoadLocalSongs();
    }
    setShowLocalSelection(previous => !previous);
  };

  const renderLocalMusicButton = () => (
    <Pressable style={styles.localMusicSelectButton} onPress={showLocalMusic}>
      <Text style={styles.localMusicSelectText}>
        {showLocalSelection ? 'Toutes les musiques' : 'Musiques locales'}
      </Text>
    </Pressable>
  );

  const renderGroupProgress = () => {
    if (!groupSyncProgress.active && !groupSyncProgress.message) {
      return null;
    }

    const progressPercent =
      groupSyncProgress.total > 0
        ? Math.min(100, Math.round((groupSyncProgress.sent / groupSyncProgress.total) * 100))
        : 8;
    const width = `${progressPercent}%` as `${number}%`;

    return (
      <View style={styles.syncProgressCard}>
        <Text style={styles.syncProgressText}>{groupSyncProgress.message}</Text>
        <View style={styles.syncProgressTrack}>
          <View style={[styles.syncProgressFill, {width}]} />
        </View>
      </View>
    );
  };

  const openCreatePlaylist = () => {
    setPlaylistName('');
    setPlaylistTrackIds([]);
    setMessage('');
    setShowLocalSelection(false);
    setView('create-playlist');
  };

  const openPlaylist = (playlist: Playlist) => {
    setSelectedPlaylistId(playlist.id);
    setPlaylistName(playlist.name);
    setPlaylistTrackIds(playlist.trackIds);
    setMessage('');
    setShowLocalSelection(false);
    setView('playlist-detail');
  };

  const openPlaylistSongEditor = () => {
    if (!selectedPlaylist) {
      return;
    }

    setPlaylistTrackIds(selectedPlaylist.trackIds);
    setMessage('');
    setShowLocalSelection(false);
    setView('edit-playlist-songs');
  };

  const nextPlaylistStep = () => {
    const name = playlistName.trim();
    if (!name) {
      setMessage('Donne un nom a ta playlist.');
      return;
    }

    setMessage('');
    setView('create-playlist-songs');
  };

  const savePlaylist = () => {
    const name = playlistName.trim();

    if (view === 'create-playlist-songs') {
      onCreatePlaylist(name, playlistTrackIds);
      setView('home');
      return;
    }

    if (view === 'edit-playlist-songs' && selectedPlaylist) {
      onUpdatePlaylistTracks(selectedPlaylist.id, playlistTrackIds);
      setMessage('Playlist mise a jour.');
      setView('playlist-detail');
    }
  };

  const openCreateGroup = () => {
    setGroupName('');
    setGroupCode('');
    setGroupTrackIds([]);
    setMessage('');
    setShowLocalSelection(false);
    setView('create-group');
  };

  const openGroup = (group: GroupPlaylist) => {
    setSelectedGroupId(group.id);
    setGroupAddTrackIds([]);
    setMessage('');
    setShowLocalSelection(false);
    setView('group-detail');
  };

  const openGroupSongAdder = () => {
    setGroupAddTrackIds([]);
    setMessage('');
    setShowLocalSelection(false);
    setView('group-add-songs');
  };

  const openGroupMembers = () => {
    setMessage('');
    setView('group-members');
  };

  const nextGroupStep = () => {
    const safeCode = groupCode.replace(/\D/g, '').slice(0, 5);
    if (!groupName.trim() || safeCode.length !== 5) {
      setMessage('Nom et code a 5 chiffres sont obligatoires.');
      return;
    }

    setMessage('');
    setView('create-group-songs');
  };

  const createGroup = async () => {
    const safeCode = groupCode.replace(/\D/g, '').slice(0, 5);
    if (!groupTrackIds.length) {
      setMessage('Choisis au moins un son.');
      return;
    }

    setIsGroupSaving(true);
    setMessage('Enregistrement du groupe...');
    const synced = await onCreateGroupPlaylist(
      groupName.trim(),
      safeCode,
      groupTrackIds,
      setGroupSyncProgress,
    );
    setIsGroupSaving(false);
    if (!synced) {
      setMessage('Groupe garde localement. Synchronisation Supabase a reessayer.');
      return;
    }

    setView('home');
  };

  const joinGroup = async () => {
    if (!selectedGroup) {
      return;
    }

    const success = await onJoinGroupPlaylist(
      selectedGroup.id,
      joinCodes[selectedGroup.id] ?? '',
    );
    setMessage(success ? 'Groupe ouvert.' : 'Code incorrect.');
  };

  const addSongsToSelectedGroup = async () => {
    if (!selectedGroup || !groupAddTrackIds.length) {
      setMessage('Choisis au moins un son.');
      return;
    }

    setIsGroupSaving(true);
    setMessage('Envoi des songs a Supabase...');
    const synced = await onAddSongsToGroup(
      selectedGroup.id,
      groupAddTrackIds,
      setGroupSyncProgress,
    );
    setIsGroupSaving(false);
    setGroupAddTrackIds([]);
    setMessage(synced ? 'Songs ajoutes au groupe.' : 'Songs gardes localement. Synchro incomplete.');
  };

  const deleteSelectedGroup = async () => {
    if (!selectedGroup) {
      return;
    }

    setIsGroupSaving(true);
    setMessage('Suppression du groupe...');
    const deleted = await onDeleteGroupPlaylist(selectedGroup.id);
    setIsGroupSaving(false);
    if (deleted) {
      setView('home');
      return;
    }
    setMessage('Suppression impossible. Seul le createur connecte peut supprimer.');
  };

  const resyncSelectedGroup = async () => {
    if (!selectedGroup) {
      return;
    }

    setIsGroupSaving(true);
    setMessage('Resynchronisation Supabase...');
    const synced = await onResyncGroupPlaylist(
      selectedGroup.id,
      setGroupSyncProgress,
    );
    setIsGroupSaving(false);
    setMessage(
      synced
        ? 'Groupe envoye a Supabase.'
        : 'Synchro impossible. Lis le message de progression.',
    );
  };

  if (view === 'local') {
    return (
      <View style={styles.screenContent}>
        {renderBackButton()}
        <Text style={styles.pageTitle}>Songs locaux</Text>
        <Pressable
          style={[styles.localSongsButton, isLocalLoading && styles.authButtonDisabled]}
          onPress={onLoadLocalSongs}
          disabled={isLocalLoading}>
          <Text style={styles.localSongsIcon}>♪</Text>
          <View style={styles.localSongsTextBlock}>
            <Text style={styles.localSongsTitle}>
              {isLocalLoading ? 'Lecture du telephone...' : 'Rafraichir'}
            </Text>
            <Text style={styles.localSongsMeta}>
              {localSongCount || localTracks.length} titre
              {(localSongCount || localTracks.length) > 1 ? 's' : ''} local
              {(localSongCount || localTracks.length) > 1 ? 's' : ''}
            </Text>
          </View>
        </Pressable>
        <FlatList
          data={localTracks}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <TrackRow track={item} onPress={onPlay} onToggleLike={onToggleLike} />
          )}
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={8}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Charge les sons du telephone pour les voir ici.</Text>
          }
        />
      </View>
    );
  }

  if (view === 'create-playlist') {
    return (
      <View style={styles.screenContent}>
        {renderBackButton()}
        <Text style={styles.pageTitle}>Nouvelle playlist</Text>
        <View style={styles.playlistCreateCard}>
          <TextInput
            value={playlistName}
            onChangeText={setPlaylistName}
            placeholder="Nom de la playlist"
            placeholderTextColor="#8d8a94"
            style={styles.playlistInput}
          />
          <Pressable style={styles.playlistCreateButton} onPress={nextPlaylistStep}>
            <Text style={styles.playlistCreateText}>Suivant</Text>
          </Pressable>
        </View>
        {message ? <Text style={styles.groupMessage}>{message}</Text> : null}
      </View>
    );
  }

  if (view === 'create-playlist-songs' || view === 'edit-playlist-songs') {
    return (
      <View style={styles.screenContent}>
        {renderBackButton()}
        <Text style={styles.pageTitle}>
          {view === 'create-playlist-songs' ? playlistName : selectedPlaylist?.name}
        </Text>
        <Text style={styles.groupSubTitle}>
          {playlistTrackIds.length} song{playlistTrackIds.length > 1 ? 's' : ''} selectionne
          {playlistTrackIds.length > 1 ? 's' : ''}
        </Text>
        <Pressable style={styles.playlistCreateButton} onPress={savePlaylist}>
          <Text style={styles.playlistCreateText}>Enregistrer</Text>
        </Pressable>
        {renderLocalMusicButton()}
        {message ? <Text style={styles.groupMessage}>{message}</Text> : null}
        <FlatList
          data={selectableTracks}
          keyExtractor={item => item.id}
          renderItem={({item}) =>
            renderSelectableTrack(item, playlistTrackIds, setPlaylistTrackIds)
          }
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={8}
        />
      </View>
    );
  }

  if (view === 'playlist-detail' && selectedPlaylist) {
    return (
      <View style={styles.screenContent}>
        {renderBackButton()}
        <Text style={styles.pageTitle}>{selectedPlaylist.name}</Text>
        <Text style={styles.groupMeta}>
          {selectedPlaylistTracks.length} song
          {selectedPlaylistTracks.length > 1 ? 's' : ''}
        </Text>
        <Pressable style={styles.groupAddButton} onPress={openPlaylistSongEditor}>
          <Text style={styles.groupAddText}>Modifier les songs</Text>
        </Pressable>
        <FlatList
          data={selectedPlaylistTracks}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <TrackRow track={item} onPress={onPlay} onToggleLike={onToggleLike} />
          )}
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={8}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Cette playlist n'a pas encore de song.</Text>
          }
        />
      </View>
    );
  }

  if (view === 'create-group') {
    return (
      <View style={styles.screenContent}>
        {renderBackButton()}
        <Text style={styles.pageTitle}>Groupe</Text>
        <View style={styles.groupPanel}>
          <AuthInput
            label="Nom du groupe"
            value={groupName}
            onChangeText={setGroupName}
          />
          <AuthInput
            label="Code a 5 chiffres"
            value={groupCode}
            onChangeText={value => setGroupCode(value.replace(/\D/g, '').slice(0, 5))}
            keyboardType="number-pad"
          />
          <Pressable style={styles.playlistCreateButton} onPress={nextGroupStep}>
            <Text style={styles.playlistCreateText}>Suivant</Text>
          </Pressable>
        </View>
        {message ? <Text style={styles.groupMessage}>{message}</Text> : null}
      </View>
    );
  }

  if (view === 'create-group-songs') {
    return (
      <View style={styles.screenContent}>
        {renderBackButton()}
        <Text style={styles.pageTitle}>{groupName}</Text>
        <Text style={styles.groupSubTitle}>
          {groupTrackIds.length} song{groupTrackIds.length > 1 ? 's' : ''} selectionne
          {groupTrackIds.length > 1 ? 's' : ''}
        </Text>
        <Pressable
          style={[styles.playlistCreateButton, isGroupSaving && styles.authButtonDisabled]}
          onPress={createGroup}
          disabled={isGroupSaving}>
          <Text style={styles.playlistCreateText}>
            {isGroupSaving ? 'Envoi...' : 'Creer'}
          </Text>
        </Pressable>
        {renderLocalMusicButton()}
        {renderGroupProgress()}
        {message ? <Text style={styles.groupMessage}>{message}</Text> : null}
        <FlatList
          data={selectableTracks}
          keyExtractor={item => item.id}
          renderItem={({item}) =>
            renderSelectableTrack(item, groupTrackIds, setGroupTrackIds)
          }
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={8}
        />
      </View>
    );
  }

  if (view === 'group-detail' && selectedGroup) {
    const unlocked = unlockedGroupIds.includes(selectedGroup.id);
    const canDeleteGroup =
      selectedGroup.id.startsWith('group-') ||
      Boolean(selectedGroup.ownerId && selectedGroup.ownerId === currentUserId);

    return (
      <View style={styles.screenContent}>
        {renderBackButton()}
        <Text style={styles.pageTitle}>{selectedGroup.name}</Text>
        <Text style={styles.groupMeta}>
          {groupTracks.length} song{groupTracks.length > 1 ? 's' : ''} - {selectedGroup.memberCount} membre
          {selectedGroup.memberCount > 1 ? 's' : ''}
        </Text>
        {unlocked ? (
          <>
            <View style={styles.groupActionRow}>
              <Pressable style={styles.groupActionButton} onPress={openGroupSongAdder}>
                <Text style={styles.groupAddText}>Ajouter songs</Text>
              </Pressable>
              <Pressable style={styles.groupActionButton} onPress={openGroupMembers}>
                <Text style={styles.groupAddText}>Membres</Text>
              </Pressable>
            </View>
            {canDeleteGroup ? (
              <Pressable
                style={[styles.groupDeleteButton, isGroupSaving && styles.authButtonDisabled]}
                onPress={deleteSelectedGroup}
                disabled={isGroupSaving}>
                <Text style={styles.groupDeleteText}>Supprimer le groupe</Text>
              </Pressable>
            ) : null}
            {selectedGroup.id.startsWith('group-') ? (
              <Pressable
                style={[styles.groupAddButton, isGroupSaving && styles.authButtonDisabled]}
                onPress={resyncSelectedGroup}
                disabled={isGroupSaving}>
                <Text style={styles.groupAddText}>Resynchroniser Supabase</Text>
              </Pressable>
            ) : null}
            {renderGroupProgress()}
            {message ? <Text style={styles.groupMessage}>{message}</Text> : null}
            <FlatList
              data={groupTracks}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TrackRow track={item} onPress={onPlay} onToggleLike={onToggleLike} />
              )}
              initialNumToRender={14}
              maxToRenderPerBatch={12}
              windowSize={8}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Ce groupe n'a pas encore de song.</Text>
              }
            />
          </>
        ) : (
          <>
            <View style={styles.groupJoinRow}>
              <TextInput
                value={joinCodes[selectedGroup.id] ?? ''}
                onChangeText={value =>
                  setJoinCodes(previous => ({
                    ...previous,
                    [selectedGroup.id]: value.replace(/\D/g, '').slice(0, 5),
                  }))
                }
                placeholder="Entrer le code"
                placeholderTextColor="#8d8a94"
                keyboardType="number-pad"
                maxLength={5}
                style={styles.groupCodeInput}
              />
              <Pressable style={styles.groupJoinButton} onPress={joinGroup}>
                <Text style={styles.groupJoinText}>Ouvrir</Text>
              </Pressable>
            </View>
            {message ? <Text style={styles.groupMessage}>{message}</Text> : null}
          </>
        )}
      </View>
    );
  }

  if (view === 'group-members' && selectedGroup) {
    const members = selectedGroup.members?.length
      ? selectedGroup.members
      : [
          {
            id: 'member-count',
            userId: null,
            displayName: `${selectedGroup.memberCount} membre${
              selectedGroup.memberCount > 1 ? 's' : ''
            }`,
            joinedAt: selectedGroup.createdAt,
          },
        ];

    return (
      <View style={styles.screenContent}>
        {renderBackButton()}
        <Text style={styles.pageTitle}>Membres</Text>
        <Text style={styles.groupMeta}>{selectedGroup.name}</Text>
        <FlatList
          data={members}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <View style={styles.memberRow}>
              <Text style={styles.groupName}>{item.displayName}</Text>
              <Text style={styles.groupMeta}>
                {new Date(item.joinedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      </View>
    );
  }

  if (view === 'group-add-songs' && selectedGroup) {
    return (
      <View style={styles.screenContent}>
        {renderBackButton()}
        <Text style={styles.pageTitle}>Ajouter</Text>
        <Text style={styles.groupSubTitle}>
          {groupAddTrackIds.length} song{groupAddTrackIds.length > 1 ? 's' : ''} selectionne
          {groupAddTrackIds.length > 1 ? 's' : ''}
        </Text>
        <Pressable
          style={[styles.groupAddButton, isGroupSaving && styles.authButtonDisabled]}
          onPress={addSongsToSelectedGroup}
          disabled={isGroupSaving}>
          <Text style={styles.groupAddText}>
            {isGroupSaving ? 'Envoi...' : 'Ajouter les songs cochees'}
          </Text>
        </Pressable>
        {renderLocalMusicButton()}
        {renderGroupProgress()}
        {message ? <Text style={styles.groupMessage}>{message}</Text> : null}
        <FlatList
          data={selectableTracks}
          keyExtractor={item => item.id}
          renderItem={({item}) =>
            renderSelectableTrack(item, groupAddTrackIds, setGroupAddTrackIds)
          }
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={8}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.pageTitle}>Bibliotheque</Text>
      <View style={styles.libraryHero}>
        <Text style={styles.libraryCount}>{liked.length}</Text>
        <Text style={styles.libraryLabel}>titres favoris</Text>
      </View>
      <Pressable
        style={[styles.localSongsButton, isLocalLoading && styles.authButtonDisabled]}
        onPress={() => {
          if (!localTracks.length) {
            onLoadLocalSongs();
          }
          setView('local');
        }}
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

      <SectionTitle title="Playlists" action="Creer" onActionPress={openCreatePlaylist} />
      {playlists.map((playlist, index) => {
        const items = playlist.trackIds
          .map(id => trackById.get(id))
          .filter((track): track is Track => Boolean(track));

        return (
          <Pressable
            key={playlist.id}
            onPress={() => openPlaylist(playlist)}
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
                {items.length} titre{items.length > 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.sectionAction}>Ouvrir</Text>
          </Pressable>
        );
      })}

      <SectionTitle title="Groupes" action="Creer" onActionPress={openCreateGroup} />
      {groupPlaylists.length ? (
        groupPlaylists.map(group => {
          const count = group.tracks?.length ?? group.trackIds.length;
          return (
            <Pressable
              key={group.id}
              style={styles.groupCard}
              onPress={() => openGroup(group)}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupMeta}>
                {count} song{count > 1 ? 's' : ''} - {group.memberCount} membre
                {group.memberCount > 1 ? 's' : ''}
              </Text>
              <Text style={styles.sectionAction}>
                {unlockedGroupIds.includes(group.id) ? 'Gerer' : 'Entrer le code'}
              </Text>
            </Pressable>
          );
        })
      ) : (
        <Text style={styles.emptyText}>Aucune playlist de groupe pour le moment.</Text>
      )}

      <SectionTitle title="Favoris" />
      {liked.slice(0, 8).map(track => (
        <TrackRow
          key={track.id}
          track={track}
          onPress={onPlay}
          onToggleLike={onToggleLike}
        />
      ))}
      {!liked.length ? <Text style={styles.emptyText}>Aucun favori pour le moment.</Text> : null}
    </ScrollView>
  );
}

export function ProfileScreen({
  tracks,
  playlistCount,
  notifications,
  authStatus,
  authSession,
  isAuthLoading,
  authError,
  expectedCode,
  onCreateArtistSong,
  onSignIn,
  onSignUp,
  onSignOut,
  onVerify,
  onResendCode,
}: {
  tracks: Track[];
  playlistCount: number;
  notifications: AppNotification[];
  authStatus: AuthStatus;
  authSession: AuthSession | null;
  isAuthLoading: boolean;
  authError: string;
  expectedCode?: string;
  onCreateArtistSong: (payload: ArtistSongPayload) => Promise<boolean>;
  onSignIn: (payload: AuthSubmitPayload) => void;
  onSignUp: (payload: AuthSubmitPayload) => void;
  onSignOut: () => void;
  onVerify: (code: string) => void;
  onResendCode: () => void;
}) {
  const isLoggedIn = authStatus === 'signed-in';
  const isVerifying = authStatus === 'verifying';
  const [profileView, setProfileView] = useState<'main' | 'artist' | 'notifications'>(
    'main',
  );
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signin');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Cameroun');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [artistName, setArtistName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [origin, setOrigin] = useState('');
  const [songType, setSongType] = useState('Afro-pop');
  const [imageFile, setImageFile] = useState<PhoneFile | null>(null);
  const [audioFile, setAudioFile] = useState<PhoneFile | null>(null);
  const [artistMessage, setArtistMessage] = useState('');
  const [isArtistSaving, setIsArtistSaving] = useState(false);

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
    authSession?.profile.username ||
    authSession?.profile.fullName ||
    authSession?.user.email ||
    'Bipon';

  const chooseArtistFile = async (kind: 'image' | 'audio') => {
    const file = await pickPhoneFile(kind).catch(() => null);
    if (!file) {
      return;
    }

    if (kind === 'image') {
      setImageFile(file);
      return;
    }

    setAudioFile(file);
  };

  const saveArtistSong = async () => {
    if (!artistName.trim() || !songTitle.trim() || !audioFile) {
      setArtistMessage('Artiste, titre et audio sont obligatoires.');
      return;
    }

    setIsArtistSaving(true);
    setArtistMessage('Envoi vers Supabase...');

    const folder = `artists/${authSession?.user.id || 'guest'}`;
    const imageUrl = imageFile
      ? await uploadPhoneFileToSupabase(
          imageFile,
          'song-covers',
          folder,
          authSession?.accessToken,
        ).catch(() => '')
      : '';
    const audioUrl = await uploadPhoneFileToSupabase(
      audioFile,
      'song-audio',
      folder,
      authSession?.accessToken,
    ).catch(() => '');

    if (!audioUrl) {
      setIsArtistSaving(false);
      setArtistMessage('Upload audio impossible. Reessaie avec un autre fichier.');
      return;
    }

    const saved = await onCreateArtistSong({
      artist: artistName,
      title: songTitle,
      album: albumName,
      origin,
      type: songType,
      image: imageUrl,
      audio: audioUrl,
    });

    if (!saved) {
      setIsArtistSaving(false);
      setArtistMessage('Artiste, titre et audio sont obligatoires.');
      return;
    }

    setArtistName('');
    setSongTitle('');
    setAlbumName('');
    setOrigin('');
    setSongType('Afro-pop');
    setImageFile(null);
    setAudioFile(null);
    setIsArtistSaving(false);
    setArtistMessage('Song enregistre. Il est disponible dans Recherche.');
  };

  if (profileView === 'notifications') {
    return (
      <ScrollView contentContainerStyle={styles.screenContent}>
        <Pressable style={styles.backButton} onPress={() => setProfileView('main')}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Notifications</Text>
        {notifications.length ? (
          notifications.map(item => (
            <View key={item.id} style={styles.notificationCard}>
              <Text style={styles.groupName}>{item.title}</Text>
              <Text style={styles.activityText}>{item.message}</Text>
              <Text style={styles.trackArtist}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune notification pour le moment.</Text>
        )}
      </ScrollView>
    );
  }

  if (profileView === 'artist') {
    return (
      <ScrollView contentContainerStyle={styles.screenContent}>
        <Pressable style={styles.backButton} onPress={() => setProfileView('main')}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Artiste</Text>
        <View style={styles.artistPanel}>
          <AuthInput label="Nom de l'artiste" value={artistName} onChangeText={setArtistName} />
          <AuthInput label="Nom du song" value={songTitle} onChangeText={setSongTitle} />
          <AuthInput label="Album" value={albumName} onChangeText={setAlbumName} />
          <AuthInput label="Origine" value={origin} onChangeText={setOrigin} />
          <Text style={styles.authInputLabel}>Type</Text>
          <View style={styles.typeChipRow}>
            {artistTypes.map(type => (
              <Pressable
                key={type}
                style={[styles.typeChip, songType === type && styles.typeChipActive]}
                onPress={() => setSongType(type)}>
                <Text
                  style={[
                    styles.typeChipText,
                    songType === type && styles.typeChipTextActive,
                  ]}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={styles.filePickButton}
            onPress={() => chooseArtistFile('image')}>
            <Text style={styles.authPrimaryText}>Choisir image</Text>
            <Text style={styles.filePickMeta} numberOfLines={1}>
              {imageFile?.name ?? 'Aucune image'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.filePickButton}
            onPress={() => chooseArtistFile('audio')}>
            <Text style={styles.authPrimaryText}>Choisir audio</Text>
            <Text style={styles.filePickMeta} numberOfLines={1}>
              {audioFile?.name ?? 'Aucun audio'}
            </Text>
          </Pressable>
          {artistMessage ? <Text style={styles.groupMessage}>{artistMessage}</Text> : null}
          <Pressable
            style={[styles.authPrimaryButton, isArtistSaving && styles.authButtonDisabled]}
            onPress={saveArtistSong}
            disabled={isArtistSaving}>
            <Text style={styles.authPrimaryText}>
              {isArtistSaving ? 'Envoi...' : 'Enregistrer'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.pageTitle}>Profil</Text>
      <View style={styles.profileCard}>
        <LogoMark />
        <Text style={styles.profileName}>
          {isLoggedIn ? displayName : isVerifying ? 'Verification' : 'Invite'}
        </Text>
        <Text style={styles.profileMeta}>
          {isLoggedIn
            ? authSession?.profile?.fullName
              ? 'Compte verifie'
              : 'Connecte avec Supabase'
            : isVerifying
              ? 'Code envoye'
              : 'Connecte-toi pour sauvegarder tes favoris'}
        </Text>
        {authError ? <Text style={styles.authError}>{authError}</Text> : null}
        {isLoggedIn ? (
          <View style={styles.authRow}>
            <Pressable style={styles.authSecondaryButton} onPress={onSignOut}>
              <Text style={styles.authSecondaryText}>Deconnexion</Text>
            </Pressable>
          </View>
        ) : isVerifying ? (
          <VerificationView
            email={email}
            isAuthLoading={isAuthLoading}
            expectedCode={expectedCode}
            onVerify={onVerify}
            onResend={onResendCode}
          />
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

      <View style={styles.profileActionRow}>
        <Pressable style={styles.profileActionButton} onPress={() => setProfileView('artist')}>
          <Text style={styles.profileActionTitle}>Artiste</Text>
          <Text style={styles.profileActionMeta}>Creer un song</Text>
        </Pressable>
        <Pressable
          style={styles.profileActionButton}
          onPress={() => setProfileView('notifications')}>
          <Text style={styles.profileActionTitle}>Notification</Text>
          <Text style={styles.profileActionMeta}>
            {notifications.length} alerte{notifications.length > 1 ? 's' : ''}
          </Text>
        </Pressable>
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
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={styles.authInputWrap}>
      <Text style={styles.authInputLabel}>{label}</Text>
      <View style={styles.authInputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          placeholderTextColor="#8f8794"
          style={styles.authInput}
        />
        {secureTextEntry ? (
          <Pressable
            style={styles.passwordEyeButton}
            onPress={() => setIsPasswordVisible(previous => !previous)}
            hitSlop={10}>
            <Text style={styles.passwordEyeText}>
              {isPasswordVisible ? 'Cacher' : 'Oeil'}
            </Text>
          </Pressable>
        ) : null}
      </View>
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

function VerificationView({
  email,
  isAuthLoading,
  expectedCode,
  onVerify,
  onResend,
}: {
  email: string;
  isAuthLoading: boolean;
  expectedCode?: string;
  onVerify: (code: string) => void;
  onResend: () => void;
}) {
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = React.useState(30);
  const inputs = React.useRef<Array<TextInput | null>>([]);

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text.slice(-1);
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    if (newCode.every(digit => digit !== '')) {
      onVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (countdown === 0) {
      setCountdown(30);
      onResend();
    }
  };

  return (
    <View style={styles.verificationView}>
      <Text style={styles.verificationTitle}>Vérification du compte</Text>
      <Text style={styles.verificationSub}>
        Entrez le code à 6 chiffres envoyé par email ou notification pour valider votre inscription.
      </Text>

      {expectedCode ? (
        <View style={styles.expectedCodeDisplay}>
          <Text style={styles.expectedCodeText}>Code reçu: {expectedCode}</Text>
        </View>
      ) : null}

      <View style={styles.codeInputRow}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => {
              inputs.current[index] = ref;
            }}
            style={styles.codeInput}
            value={digit}
            onChangeText={text => handleChange(text, index)}
            onKeyPress={e => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            autoFocus={index === 0}
          />
        ))}
      </View>

      <Pressable
        style={[
          styles.authPrimaryButton,
          styles.authSubmitButton,
          (isAuthLoading || code.some(d => d === '')) && styles.authButtonDisabled,
        ]}
        onPress={() => onVerify(code.join(''))}
        disabled={isAuthLoading || code.some(d => d === '')}>
        <Text style={styles.authPrimaryText}>
          {isAuthLoading ? 'Vérification...' : 'Vérifier le code'}
        </Text>
      </Pressable>

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Vous n'avez pas reçu le code ?</Text>
        {countdown > 0 ? (
          <Text style={styles.resendCountdown}>{countdown}s</Text>
        ) : (
          <Pressable style={styles.resendButton} onPress={handleResend}>
            <Text style={styles.resendButtonText}>Renvoyer</Text>
          </Pressable>
        )}
      </View>
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
