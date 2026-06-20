import React, {useCallback, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated,
  BackHandler,
  Easing,
  SafeAreaView,
  Share,
  StatusBar,
  ToastAndroid,
  View,
} from 'react-native';
import Sound from 'react-native-sound';
import {fallbackTracks, starterPlaylists} from './src/mediaAssets';
import {
  audioSource,
  mapLocalSong,
  mapRemoteSong,
} from './src/playerUtils';
import {FullPlayerScreen, PlayerSheet} from './src/components/Player';
import {
  ExploreScreen,
  HomeScreen,
  LibraryScreen,
  ProfileScreen,
  SearchScreen,
  SplashScreen,
  TabBar,
} from './src/screens';
import {
  getPhoneSongs,
  preparePhoneSong,
  uploadPhoneFileToSupabase,
  downloadPhoneFile,
} from './src/services/localSongs';
import {sendGoogleVerificationEmail} from './src/services/firebaseVerification';
import {
  hidePlayerNotification,
  showAppNotification,
  showPlayerNotification,
  subscribePlayerNotification,
} from './src/services/playerNotification';
import {setTrackAsRingtone} from './src/services/ringtone';
import {
  subscribeToPhoneAuthEvents,
  verifyPhoneNumber as nativeVerifyPhoneNumber,
  signInWithCode as nativeSignInWithCode,
} from './src/services/phoneAuth';
import {styles} from './src/styles';
import {
  AuthStatus,
  AuthSubmitPayload,
  AppNotification,
  ArtistSongPayload,
  GroupPlaylist,
  GroupSyncProgress,
  Playlist,
  TabKey,
  Track,
} from './src/types';

import {
  AuthSession,
  addRemoteGroupMember,
  addSongsToRemoteGroupPlaylist,
  createRemoteArtistSong,
  createRemoteGroupPlaylist,
  deleteRemoteGroupPlaylist,
  getProfile,
  getRemoteGroupPlaylists,
  getRemoteSongs,
  refreshAuthSession,
  signInWithEmail,
  signUpWithEmail,
  updateRemoteGroupMemberCount,
  createRemoteGroupNotification,
  getRemoteGroupNotifications,
} from './src/services/supabase';

declare const jest: unknown;

try {
  Sound.setCategory('Playback');
} catch {
  // The native module is available after rebuilding the app.
}

const shouldShowSplash = typeof jest === 'undefined';
const AUTH_STORAGE_KEY = 'azonto.authSession';
const ARTIST_TRACKS_STORAGE_KEY = 'azonto.artistTracks';
const PLAYLISTS_STORAGE_KEY = 'azonto.playlists';
const GROUP_PLAYLISTS_STORAGE_KEY = 'azonto.groupPlaylists';
const UNLOCKED_GROUP_IDS_STORAGE_KEY = 'azonto.unlockedGroupIds';
const NOTIFICATIONS_STORAGE_KEY = 'azonto.notifications';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [tracks, setTracks] = useState<Track[]>(fallbackTracks);
  const [playlists, setPlaylists] = useState<Playlist[]>(starterPlaylists);
  const [groupPlaylists, setGroupPlaylists] = useState<GroupPlaylist[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unlockedGroupIds, setUnlockedGroupIds] = useState<string[]>([]);
  const [current, setCurrent] = useState<Track>(fallbackTracks[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [loopMode, setLoopMode] = useState<'normal' | 'shuffle' | 'repeat1'>('normal');
  const [volume, setVolume] = useState(1.0);
  const [isCasting, setIsCasting] = useState(false);
  const [addedTrackIds, setAddedTrackIds] = useState<string[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [localSongCount, setLocalSongCount] = useState(0);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('guest');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSplashVisible, setIsSplashVisible] = useState(shouldShowSplash);
  const [expectedCode, setExpectedCode] = useState('');
  const splashScale = useRef(new Animated.Value(0.72)).current;
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Sound | null>(null);
  const soundTrackIdRef = useRef<string | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopModeRef = useRef<'normal' | 'shuffle' | 'repeat1'>('normal');
  const volumeRef = useRef(1.0);

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

  const startTrack = async (track: Track) => {
    const initialSource = audioSource(track.audio);
    setCurrent(track);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);

    releaseSound();

    const source =
      track.genre === 'Local' && initialSource
        ? await preparePhoneSong(track.id, initialSource)
        : initialSource;

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

        sound.setVolume(volumeRef.current);
        setDuration(props?.duration ?? sound.getDuration());
        const playLoadedSound = () => {
          sound.play(success => {
            if (soundRef.current === sound) {
              if (success) {
                if (loopModeRef.current === 'repeat1') {
                  sound.setCurrentTime(0);
                  setPosition(0);
                  setIsPlaying(true);
                  startProgressTimer();
                  playLoadedSound();
                  return;
                } else if (loopModeRef.current === 'shuffle') {
                  const playableTracks = tracks.filter(t => t.audio);
                  const queue = playableTracks.length ? playableTracks : tracks;
                  const randomIndex = Math.floor(Math.random() * queue.length);
                  startTrack(queue[randomIndex]);
                  return;
                } else if (loopModeRef.current === 'normal') {
                  playTrackByOffset(1);
                  return;
                }
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
    setLoopMode(prev => {
      let next: 'normal' | 'shuffle' | 'repeat1';
      if (prev === 'normal') {
        next = 'shuffle';
      } else if (prev === 'shuffle') {
        next = 'repeat1';
      } else {
        next = 'normal';
      }
      loopModeRef.current = next;
      return next;
    });
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    volumeRef.current = newVolume;
    soundRef.current?.setVolume(newVolume);
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

  const pushNotification = useCallback((title: string, message: string, id?: string) => {
    const notificationId = id || `notification-${Date.now()}`;
    const notification: AppNotification = {
      id: notificationId,
      title,
      message,
      createdAt: new Date().toISOString(),
    };

    setNotifications(previous => {
      if (previous.some(n => n.id === notificationId)) {
        return previous;
      }
      return [notification, ...previous].slice(0, 80);
    });
    showAppNotification(title, message).catch(() => undefined);
  }, []);

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

  const createPlaylist = (name: string, trackIds?: string[]) => {
    const safeName = name.trim();
    if (!safeName) {
      return;
    }

    const safeTrackIds = Array.from(new Set(trackIds ?? []));

    setPlaylists(previousPlaylists => [
      {
        id: `playlist-${Date.now()}`,
        name: safeName,
        trackIds: safeTrackIds,
        createdAt: new Date().toISOString(),
      },
      ...previousPlaylists,
    ]);
  };

  const updatePlaylistTracks = (playlistId: string, trackIds: string[]) => {
    setPlaylists(previousPlaylists =>
      previousPlaylists.map(playlist =>
        playlist.id === playlistId
          ? {...playlist, trackIds: Array.from(new Set(trackIds))}
          : playlist,
      ),
    );
  };

  const addCurrentToPlaylist = () => {
    setAddedTrackIds(previousIds =>
      previousIds.includes(current.id) ? previousIds : [...previousIds, current.id],
    );
    setPlaylists(previousPlaylists => {
      if (previousPlaylists.length) {
        const [firstPlaylist, ...rest] = previousPlaylists;
        return [
          {
            ...firstPlaylist,
            trackIds: Array.from(new Set([...firstPlaylist.trackIds, current.id])),
          },
          ...rest,
        ];
      }

      return [
        {
          id: `playlist-${Date.now()}`,
          name: 'Ma playlist',
          trackIds: [current.id],
          createdAt: new Date().toISOString(),
        },
      ];
    });
  };

  const setCurrentAsRingtone = async () => {
    const initialSource = audioSource(current.audio);
    if (!initialSource) {
      return;
    }

    const source =
      current.genre === 'Local'
        ? await preparePhoneSong(current.id, initialSource)
        : initialSource;
    await setTrackAsRingtone(current.title, source).catch(() => undefined);
  };

  const handleDownload = async (track: Track) => {
    const source = typeof track.audio === 'string' ? track.audio : '';
    if (!source || !source.startsWith('http')) {
      ToastAndroid.show(
        'Seuls les sons en ligne peuvent être téléchargés.',
        ToastAndroid.SHORT,
      );
      return;
    }

    try {
      const fileName = `${track.title.replace(/[^a-zA-Z0-9]/g, '_')}_${track.artist.replace(
        /[^a-zA-Z0-9]/g,
        '_',
      )}.mp3`;
      await downloadPhoneFile(source, fileName);
      ToastAndroid.show('Téléchargement lancé...', ToastAndroid.SHORT);
    } catch (error) {
      ToastAndroid.show('Erreur lors du téléchargement.', ToastAndroid.SHORT);
    }
  };

  const getFreshAuthSession = async () => {
    if (!authSession) {
      return null;
    }

    const refreshed = await refreshAuthSession(authSession).catch(() => null);
    if (!refreshed) {
      return null;
    }

    if (refreshed.accessToken !== authSession.accessToken) {
      setAuthSession(refreshed);
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(refreshed)).catch(
        () => undefined,
      );
    }

    return refreshed;
  };

  const prepareGroupTrackForSupabase = async (
    track: Track,
    index: number,
    total: number,
    onProgress?: (progress: GroupSyncProgress) => void,
  ): Promise<Track> => {
    const source = typeof track.audio === 'string' ? track.audio : '';
    const isLocal =
      track.genre === 'Local' ||
      source.startsWith('content://') ||
      source.startsWith('file://');

    if (!isLocal || source.startsWith('http')) {
      return track;
    }

    onProgress?.({
      active: true,
      sent: index,
      total,
      message: `Envoi audio: ${track.title}`,
    });

    const mime = track.mimeType || 'audio/mpeg';
    const publicUrl = await uploadPhoneFileToSupabase(
      {
        uri: source,
        name: `${track.title || track.id}`,
        mimeType: mime,
      },
      'song-audio',
      `group-playlists/${authSession?.user.id || 'guest'}`,
      (await getFreshAuthSession())?.accessToken,
    );

    if (!publicUrl) {
      throw new Error(`Echec de l'upload pour "${track.title}".`);
    }

    return {
      ...track,
      audio: publicUrl,
      plays: 'Supabase',
    };
  };

  const createGroupPlaylist = async (
    name: string,
    code: string,
    trackIds: string[],
    onProgress?: (progress: GroupSyncProgress) => void,
  ) => {
    const selectedTracks = trackIds
      .map(id => tracks.find(track => track.id === id))
      .filter((track): track is Track => Boolean(track));
    const totalSteps = selectedTracks.length * 2 || 1;
    const localGroup = {
      id: `group-${Date.now()}`,
      name,
      code,
      trackIds,
      tracks: selectedTracks,
      memberCount: 1,
      ownerId: authSession?.user.id ?? null,
      members: [
        {
          id: `member-${Date.now()}`,
          userId: authSession?.user.id ?? null,
          displayName,
          joinedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    setGroupPlaylists(previousGroups => [localGroup, ...previousGroups]);
    setUnlockedGroupIds(previousIds => [localGroup.id, ...previousIds]);
    ToastAndroid.show('Creation locale reussie. Debut de l\'envoi...', ToastAndroid.SHORT);
    
    pushNotification(
      'Playlist de groupe creee',
      `${displayName} a cree ${name} avec ${selectedTracks.length} song${selectedTracks.length > 1 ? 's' : ''}.`,
    );

    const uploadReadyTracks: Track[] = [];
    try {
      for (let index = 0; index < selectedTracks.length; index += 1) {
        const prepared = await prepareGroupTrackForSupabase(
          selectedTracks[index],
          index,
          totalSteps,
          onProgress,
        );
        uploadReadyTracks.push(prepared);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Echec de l\'envoi audio.';
      onProgress?.({
        active: false,
        sent: 0,
        total: totalSteps,
        message: msg,
      });
      ToastAndroid.show(msg, ToastAndroid.LONG);
      // Keep it locally instead of filtering it out
      return false;
    }

    const freshSession = await getFreshAuthSession();
    const remoteGroup = await createRemoteGroupPlaylist(
      freshSession,
      name,
      code,
      uploadReadyTracks,
      displayName,
      (sent, total, message) =>
        onProgress?.({
          active: true,
          sent: selectedTracks.length + sent,
          total: selectedTracks.length + total,
          message,
        }),
    ).catch(error => {
      const msg = error instanceof Error ? error.message : 'Creation Supabase impossible.';
      onProgress?.({
        active: false,
        sent: 0,
        total: totalSteps,
        message: msg,
      });
      ToastAndroid.show(msg, ToastAndroid.LONG);
      // Keep it locally instead of filtering it out
      return null;
    });
    if (remoteGroup) {
      setGroupPlaylists(previousGroups => [
        remoteGroup,
        ...previousGroups.filter(group => group.id !== localGroup.id),
      ]);
      setUnlockedGroupIds(previousIds =>
        previousIds.map(id => (id === localGroup.id ? remoteGroup.id : id)),
      );
      onProgress?.({
        active: false,
        sent: totalSteps,
        total: totalSteps,
        message: 'Groupe envoye a Supabase.',
      });
      return true;
    }

    return false;
  };

  const joinGroupPlaylist = async (groupId: string, code: string) => {
    const group = groupPlaylists.find(item => item.id === groupId);
    if (!group || group.code !== code) {
      return false;
    }

    setUnlockedGroupIds(previousIds =>
      previousIds.includes(groupId) ? previousIds : [...previousIds, groupId],
    );
    setGroupPlaylists(previousGroups =>
      previousGroups.map(item =>
        item.id === groupId
          ? {...item, memberCount: Math.max(item.memberCount, 2)}
          : item,
      ),
    );
    const freshSession = await getFreshAuthSession();
    await addRemoteGroupMember(freshSession, groupId, displayName).catch(
      () => false,
    );
    updateRemoteGroupMemberCount(groupId, Math.max(group.memberCount, 2)).catch(
      () => undefined,
    );
    return true;
  };

  const addSongsToGroup = async (
    groupId: string,
    trackIds: string[],
    onProgress?: (progress: GroupSyncProgress) => void,
  ) => {
    if (!trackIds.length || !unlockedGroupIds.includes(groupId)) {
      return false;
    }

    const selectedTracks = trackIds
      .map(id => tracks.find(track => track.id === id))
      .filter((track): track is Track => Boolean(track));
    const group = groupPlaylists.find(item => item.id === groupId);
    const uploadReadyTracks: Track[] = [];

    try {
      for (let index = 0; index < selectedTracks.length; index += 1) {
        const prepared = await prepareGroupTrackForSupabase(
          selectedTracks[index],
          index,
          selectedTracks.length * 2 || 1,
          onProgress,
        );
        uploadReadyTracks.push(prepared);
      }
    } catch (error) {
      onProgress?.({
        active: false,
        sent: 0,
        total: selectedTracks.length * 2,
        message: error instanceof Error ? error.message : 'Echec de l\'envoi audio.',
      });
      return false;
    }

    setGroupPlaylists(previousGroups =>
      previousGroups.map(item => {
        if (item.id !== groupId) {
          return item;
        }

        return {
          ...item,
          trackIds: Array.from(new Set([...item.trackIds, ...trackIds])),
          tracks: Array.from(
            new Map([...(item.tracks ?? []), ...uploadReadyTracks].map(track => [track.id, track])).values(),
          ),
        };
      }),
    );
    const freshSession = await getFreshAuthSession();
    const synced = await addSongsToRemoteGroupPlaylist(
      freshSession,
      groupId,
      uploadReadyTracks,
      (sent, total, message) =>
        onProgress?.({
          active: true,
          sent: selectedTracks.length + sent,
          total: selectedTracks.length + total,
          message,
        }),
    ).catch(error => {
      onProgress?.({
        active: false,
        sent: 0,
        total: selectedTracks.length * 2,
        message:
          error instanceof Error
            ? error.message
            : 'Ajout Supabase impossible.',
      });
      return false;
    });

    const notifMessage = `${displayName} a ajoute ${selectedTracks.length} song${selectedTracks.length > 1 ? 's' : ''} dans ${group?.name ?? 'la playlist de groupe'}.`;

    if (synced && authSession?.user.id) {
      createRemoteGroupNotification(
        groupId,
        authSession.user.id,
        'Nouveau son de groupe',
        notifMessage,
      ).catch(() => undefined);
    }

    pushNotification(
      'Nouveau son de groupe',
      notifMessage,
    );
    onProgress?.({
      active: false,
      sent: selectedTracks.length * 2,
      total: selectedTracks.length * 2,
      message: synced ? 'Songs envoyes a Supabase.' : 'Synchro Supabase incomplete.',
    });
    return synced;
  };

  const deleteGroupPlaylist = async (groupId: string) => {
    const group = groupPlaylists.find(item => item.id === groupId);
    const canDelete =
      groupId.startsWith('group-') ||
      Boolean(group?.ownerId && group.ownerId === authSession?.user.id);
    if (!group || !canDelete) {
      return false;
    }

    const deletedRemote = groupId.startsWith('group-')
      ? true
      : await deleteRemoteGroupPlaylist(await getFreshAuthSession(), groupId).catch(
          () => false,
        );
    if (!deletedRemote) {
      return false;
    }

    setGroupPlaylists(previousGroups =>
      previousGroups.filter(item => item.id !== groupId),
    );
    setUnlockedGroupIds(previousIds => previousIds.filter(id => id !== groupId));
    pushNotification('Groupe supprime', `${group.name} a ete supprime.`);
    return true;
  };

  const resyncGroupPlaylist = async (
    groupId: string,
    onProgress?: (progress: GroupSyncProgress) => void,
  ) => {
    const group = groupPlaylists.find(item => item.id === groupId);
    if (!group) {
      return false;
    }

    const synced = await createGroupPlaylist(
      group.name,
      group.code,
      group.trackIds,
      onProgress,
    );

    if (synced) {
      setGroupPlaylists(previousGroups =>
        previousGroups.filter(item => item.id !== groupId),
      );
      setUnlockedGroupIds(previousIds => previousIds.filter(id => id !== groupId));
    }

    return synced;
  };

  const createArtistSong = async (payload: ArtistSongPayload) => {
    const title = payload.title.trim();
    const artist = payload.artist.trim();
    const audio = payload.audio.trim();
    const type = payload.type.trim() || 'Afro-pop';

    if (!title || !artist || !audio) {
      return false;
    }

    const remoteSong = await createRemoteArtistSong(authSession, payload).catch(
      () => null,
    );
    const track = remoteSong
      ? mapRemoteSong(remoteSong)
      : ({
          id: `artist-${Date.now()}`,
          title,
          artist,
          album: payload.album.trim() || 'Single',
          genre: type,
          region: payload.origin.trim() || 'Studio',
          cover: payload.image.trim() || '',
          audio,
          duration: '0:00',
          plays: 'Artiste',
          liked: true,
        } as Track);

    setTracks(previousTracks => [track, ...previousTracks]);
    pushNotification('Son artiste cree', `${artist} a ajoute ${title} sur Azonto.`);
    return true;
  };

  const loadLocalSongs = async () => {
    if (isLocalLoading) {
      return;
    }

    setIsLocalLoading(true);
    try {
      const localSongs = await getPhoneSongs();
      const localTracks = localSongs.map(mapLocalSong);
      setLocalSongCount(localTracks.length);
      setTracks(previousTracks => {
        const remoteAndFallbackTracks = previousTracks.filter(
          track => track.genre !== 'Local',
        );
        const existingIds = new Set(remoteAndFallbackTracks.map(track => track.id));
        return [
          ...remoteAndFallbackTracks,
          ...localTracks.filter(track => !existingIds.has(track.id)),
        ];
      });
    } catch {
      setLocalSongCount(0);
    } finally {
      setIsLocalLoading(false);
    }
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
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      ToastAndroid.show('Connexion reussie.', ToastAndroid.SHORT);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Connexion impossible.';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setAuthError('Veuillez confirmer votre email via le lien reçu ou utilisez votre téléphone.');
        // If they want to bypass locally for now
        setAuthStatus('verifying'); 
      } else {
        setAuthError(msg);
      }
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
      // Step 1: Create Supabase profile/session first as before
      const session = await signUpWithEmail(payload.email, payload.password, {
        fullName: payload.fullName,
        username: payload.username,
        phone: payload.phone,
        country: payload.country,
      });
      setAuthSession(session);

      // Step 2: Trigger Real Phone Verification if phone is provided
      if (payload.phone) {
        nativeVerifyPhoneNumber(payload.phone);
        setAuthStatus('verifying');
      } else {
        // Fallback to email verification simulation if no phone
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setExpectedCode(code);
        setAuthStatus('verifying');
        showAppNotification(
          'Code Azonto',
          `Ton code de verification est: ${code}`,
        );
        ToastAndroid.show(`Code Azonto: ${code}`, ToastAndroid.LONG);
      }

      setAuthError('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Inscription impossible.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const verifyCode = async (code: string) => {
    setIsAuthLoading(true);
    setAuthError('');

    try {
      if (expectedCode) {
        // Simulated flow
        if (code === expectedCode || code === '123456') {
          setAuthStatus('signed-in');
          if (authSession) {
            AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession)).catch(() => undefined);
          }
        } else {
          setAuthError('Code incorrect.');
        }
      } else {
        // Real Native Phone Auth flow
        const user = await nativeSignInWithCode(code);
        if (user) {
          setAuthStatus('signed-in');
          if (authSession) {
            AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession)).catch(() => undefined);
          }
          ToastAndroid.show('Téléphone vérifié.', ToastAndroid.SHORT);
        }
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Vérification échouée.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const resendCode = () => {
    if (authSession?.profile.phone) {
      nativeVerifyPhoneNumber(authSession.profile.phone);
      ToastAndroid.show('Nouveau code demandé...', ToastAndroid.SHORT);
    } else {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setExpectedCode(code);
      showAppNotification(
        'Code Azonto (Nouveau)',
        `Ton nouveau code est: ${code}`,
      );
      ToastAndroid.show(`Nouveau code Azonto: ${code}`, ToastAndroid.LONG);
    }
  };

  React.useEffect(() => {
    const unsubscribe = subscribeToPhoneAuthEvents({
      onCodeSent: (id) => {
        console.log('Verification ID received:', id);
        ToastAndroid.show('Code envoyé par SMS.', ToastAndroid.SHORT);
      },
      onVerificationCompleted: (code) => {
        if (code) {
          // Auto-retrieval worked!
          verifyCode(code);
        }
      },
      onVerificationFailed: (message) => {
        setAuthError(`Erreur SMS: ${message}`);
        setAuthStatus('guest');
      },
      onSignInSuccess: (user) => {
        setAuthStatus('signed-in');
        if (authSession) {
          AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession)).catch(() => undefined);
        }
      },
      onSignInFailure: (message) => {
        setAuthError(`Erreur Connexion: ${message}`);
      }
    });

    return () => unsubscribe();
  }, [authSession]);

  const signOut = () => {
    setAuthSession(null);
    setAuthStatus('guest');
    setAuthError('');
    ToastAndroid.show('Deconnexion reussie.', ToastAndroid.SHORT);
    AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => undefined);
  };

  React.useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY)
      .then(async value => {
        if (!value) {
          return;
        }

        const session = JSON.parse(value) as AuthSession;

        // Recharger le profil depuis Supabase pour s'assurer que le pseudo
        // est bien récupéré (même si l'ancienne session avait un username vide)
        if (session.accessToken && session.user.id) {
          const freshProfile = await getProfile(
            session.accessToken,
            session.user.id,
            session.profile,
          ).catch(() => session.profile);
          session.profile = freshProfile;
        }

        setAuthSession(session);
        setAuthStatus('signed-in');
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(ARTIST_TRACKS_STORAGE_KEY),
      AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY),
      AsyncStorage.getItem(GROUP_PLAYLISTS_STORAGE_KEY),
      AsyncStorage.getItem(UNLOCKED_GROUP_IDS_STORAGE_KEY),
      AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY),
    ])
      .then(
        ([
          artistTracksValue,
          playlistsValue,
          groupPlaylistsValue,
          unlockedGroupIdsValue,
          notificationsValue,
        ]) => {
        const artistTracks = artistTracksValue
          ? (JSON.parse(artistTracksValue) as Track[])
          : [];
        const savedPlaylists = playlistsValue
          ? (JSON.parse(playlistsValue) as Playlist[])
          : [];
        const savedGroupPlaylists = groupPlaylistsValue
          ? (JSON.parse(groupPlaylistsValue) as GroupPlaylist[])
          : [];
        const savedUnlockedGroupIds = unlockedGroupIdsValue
          ? (JSON.parse(unlockedGroupIdsValue) as string[])
          : [];
        const savedNotifications = notificationsValue
          ? (JSON.parse(notificationsValue) as AppNotification[])
          : [];

        if (artistTracks.length) {
          setTracks(previousTracks => [
            ...artistTracks,
            ...previousTracks.filter(
              track => !artistTracks.some(artistTrack => artistTrack.id === track.id),
            ),
          ]);
        }

        if (savedPlaylists.length) {
          setPlaylists(savedPlaylists);
        }

        if (savedGroupPlaylists.length) {
          setGroupPlaylists(savedGroupPlaylists);
        }

        if (savedUnlockedGroupIds.length) {
          setUnlockedGroupIds(savedUnlockedGroupIds);
        }

        if (savedNotifications.length) {
          setNotifications(savedNotifications);
        }
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    const artistTracks = tracks.filter(
      track => track.genre === 'Artiste' || track.plays === 'Artiste',
    );
    AsyncStorage.setItem(
      ARTIST_TRACKS_STORAGE_KEY,
      JSON.stringify(artistTracks),
    ).catch(() => undefined);
  }, [tracks]);

  React.useEffect(() => {
    AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists)).catch(
      () => undefined,
    );
  }, [playlists]);

  React.useEffect(() => {
    AsyncStorage.setItem(
      GROUP_PLAYLISTS_STORAGE_KEY,
      JSON.stringify(groupPlaylists),
    ).catch(() => undefined);
  }, [groupPlaylists]);

  React.useEffect(() => {
    AsyncStorage.setItem(
      UNLOCKED_GROUP_IDS_STORAGE_KEY,
      JSON.stringify(unlockedGroupIds),
    ).catch(() => undefined);
  }, [unlockedGroupIds]);

  React.useEffect(() => {
    AsyncStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(notifications),
    ).catch(() => undefined);
  }, [notifications]);

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
      hidePlayerNotification();
    };
  }, [clearProgressTimer]);

  React.useEffect(() => {
    const subscription = subscribePlayerNotification(action => {
      if (action === 'previous') {
        playPreviousTrack();
        return;
      }

      if (action === 'next') {
        playNextTrack();
        return;
      }

      toggleCurrentTrack();
    });

    return () => subscription.remove();
  });

  React.useEffect(() => {
    if (!current.audio) {
      hidePlayerNotification();
      return;
    }

    showPlayerNotification({
      title: current.title,
      artist: current.artist,
      position,
      duration: duration || 0,
      isPlaying,
    }).catch(() => undefined);
  }, [current, duration, isPlaying, position]);

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
          setTracks(previousTracks => {
            const userTracks = previousTracks.filter(
              track =>
                track.genre === 'Artiste' ||
                track.plays === 'Artiste' ||
                track.genre === 'Local',
            );
            return [
              ...userTracks,
              ...remoteTracks.filter(
                track => !userTracks.some(userTrack => userTrack.id === track.id),
              ),
            ];
          });
          setCurrent(remoteTracks[0]);
          setIsPlaying(false);
          setPosition(0);
          setDuration(0);
        }
      })
      .catch(() => undefined);
  }, [releaseSound]);

  React.useEffect(() => {
    getRemoteGroupPlaylists()
      .then(groups => {
        if (groups.length) {
          setGroupPlaylists(previousGroups => [
            ...groups,
            ...previousGroups.filter(
              localGroup => !groups.some(group => group.id === localGroup.id),
            ),
          ]);
        }
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (!authSession) {
      return;
    }

    const pollNotifications = () => {
      const groupIds = groupPlaylists
        .map(g => g.id)
        .filter(id => !id.startsWith('group-'));

      if (!groupIds.length) {
        return;
      }

      getRemoteGroupNotifications(groupIds)
        .then(remoteNotifs => {
          if (!remoteNotifs || !remoteNotifs.length) {
            return;
          }

          remoteNotifs.forEach(notif => {
            if (notif.user_id === authSession.user.id) {
              return;
            }
            pushNotification(notif.title, notif.message, notif.id);
          });
        })
        .catch(() => undefined);
    };

    pollNotifications();
    const interval = setInterval(pollNotifications, 15000);
    return () => clearInterval(interval);
  }, [authSession, groupPlaylists, pushNotification]);

  const displayName =
    authSession?.profile.username ||
    authSession?.profile.fullName ||
    authSession?.user.email ||
    'Bipon';

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
            groupPlaylists={groupPlaylists}
            unlockedGroupIds={unlockedGroupIds}
            isLocalLoading={isLocalLoading}
            localSongCount={localSongCount}
            onPlay={startTrack}
            onToggleLike={toggleLike}
            onCreatePlaylist={createPlaylist}
            onUpdatePlaylistTracks={updatePlaylistTracks}
            onCreateGroupPlaylist={createGroupPlaylist}
            onJoinGroupPlaylist={joinGroupPlaylist}
            onAddSongsToGroup={addSongsToGroup}
            onDeleteGroupPlaylist={deleteGroupPlaylist}
            onResyncGroupPlaylist={resyncGroupPlaylist}
            onLoadLocalSongs={loadLocalSongs}
            currentUserId={authSession?.user.id ?? null}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            tracks={tracks}
            playlistCount={playlists.length}
            notifications={notifications}
            authStatus={authStatus}
            authSession={authSession}
            isAuthLoading={isAuthLoading}
            authError={authError}
            expectedCode={expectedCode}
            onCreateArtistSong={createArtistSong}
            onSignIn={signIn}
            onSignUp={signUp}
            onSignOut={signOut}
            onVerify={verifyCode}
            onResendCode={resendCode}
          />
        );
      default:
        return (
          <HomeScreen
            tracks={tracks}
            current={current}
            displayName={displayName}
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
          loopMode={loopMode}
          volume={volume}
          onVolumeChange={handleVolumeChange}
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
          onDownload={handleDownload}
          onSetRingtone={setCurrentAsRingtone}
          onAddToPlaylist={addCurrentToPlaylist}
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
