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
import {getPhoneSongs, preparePhoneSong} from './src/services/localSongs';
import {
  hidePlayerNotification,
  showPlayerNotification,
  subscribePlayerNotification,
} from './src/services/playerNotification';
import {setTrackAsRingtone} from './src/services/ringtone';
import {styles} from './src/styles';
import {
  AuthStatus,
  AuthSubmitPayload,
  GroupPlaylist,
  Playlist,
  TabKey,
  Track,
} from './src/types';

import {
  AuthSession,
  addSongsToRemoteGroupPlaylist,
  createRemoteGroupPlaylist,
  getRemoteGroupPlaylists,
  getRemoteSongs,
  signInWithEmail,
  signUpWithEmail,
  updateRemoteGroupMemberCount,
} from './src/services/supabase';

declare const jest: unknown;

try {
  Sound.setCategory('Playback');
} catch {
  // The native module is available after rebuilding the app.
}

const shouldShowSplash = typeof jest === 'undefined';
const AUTH_STORAGE_KEY = 'azonto.authSession';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [tracks, setTracks] = useState<Track[]>(fallbackTracks);
  const [playlists, setPlaylists] = useState<Playlist[]>(starterPlaylists);
  const [groupPlaylists, setGroupPlaylists] = useState<GroupPlaylist[]>([]);
  const [unlockedGroupIds, setUnlockedGroupIds] = useState<string[]>([]);
  const [current, setCurrent] = useState<Track>(fallbackTracks[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [addedTrackIds, setAddedTrackIds] = useState<string[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [localSongCount, setLocalSongCount] = useState(0);
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

  const createGroupPlaylist = async (name: string, code: string, trackIds: string[]) => {
    const selectedTracks = trackIds
      .map(id => tracks.find(track => track.id === id))
      .filter((track): track is Track => Boolean(track));
    const localGroup = {
      id: `group-${Date.now()}`,
      name,
      code,
      trackIds,
      tracks: selectedTracks,
      memberCount: 1,
      createdAt: new Date().toISOString(),
    };

    setGroupPlaylists(previousGroups => [localGroup, ...previousGroups]);

    const remoteGroup = await createRemoteGroupPlaylist(
      authSession,
      name,
      code,
      selectedTracks,
    );
    if (remoteGroup) {
      setGroupPlaylists(previousGroups => [
        remoteGroup,
        ...previousGroups.filter(group => group.id !== localGroup.id),
      ]);
    }
  };

  const joinGroupPlaylist = (groupId: string, code: string) => {
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
    updateRemoteGroupMemberCount(groupId, Math.max(group.memberCount, 2)).catch(
      () => undefined,
    );
    return true;
  };

  const addSongsToGroup = (groupId: string, trackIds: string[]) => {
    if (!trackIds.length || !unlockedGroupIds.includes(groupId)) {
      return;
    }

    const selectedTracks = trackIds
      .map(id => tracks.find(track => track.id === id))
      .filter((track): track is Track => Boolean(track));

    setGroupPlaylists(previousGroups =>
      previousGroups.map(group => {
        if (group.id !== groupId) {
          return group;
        }

        return {
          ...group,
          trackIds: Array.from(new Set([...group.trackIds, ...trackIds])),
          tracks: Array.from(
            new Map([...(group.tracks ?? []), ...selectedTracks].map(track => [track.id, track])).values(),
          ),
        };
      }),
    );
    addSongsToRemoteGroupPlaylist(authSession, groupId, selectedTracks).catch(
      () => undefined,
    );
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
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      if (!session.accessToken) {
        setAuthError('Compte cree. Verifie ton email avant la connexion.');
      }
      ToastAndroid.show('Compte cree avec succes.', ToastAndroid.LONG);
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
    ToastAndroid.show('Deconnexion reussie.', ToastAndroid.SHORT);
    AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => undefined);
  };

  React.useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY)
      .then(value => {
        if (!value) {
          return;
        }

        const session = JSON.parse(value) as AuthSession;
        setAuthSession(session);
        setAuthStatus('signed-in');
      })
      .catch(() => undefined);
  }, []);

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
          setTracks(remoteTracks);
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
          setGroupPlaylists(groups);
        }
      })
      .catch(() => undefined);
  }, []);

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
            onCreateGroupPlaylist={createGroupPlaylist}
            onJoinGroupPlaylist={joinGroupPlaylist}
            onAddSongsToGroup={addSongsToGroup}
            onLoadLocalSongs={loadLocalSongs}
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
