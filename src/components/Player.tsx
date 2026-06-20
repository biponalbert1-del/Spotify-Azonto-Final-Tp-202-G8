import React, {useRef, useState} from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {visualizerBars} from '../mediaAssets';
import {coverSource, durationToSeconds, formatTime} from '../playerUtils';
import {styles} from '../styles';
import {Track} from '../types';

export function PlayerSheet({
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
        {isPlaying ? (
          <View style={styles.playerPauseIcon}>
            <View style={styles.playerPauseBar} />
            <View style={styles.playerPauseBar} />
          </View>
        ) : (
          <Text style={styles.bigPlayIcon}>▶</Text>
        )}
      </Pressable>
    </Pressable>
  );
}

const EQ_PRESETS: Record<string, number[]> = {
  Normal: [0, 0, 0, 0, 0],
  Pop: [2, 1, 0, 1, 2],
  Rock: [4, 2, -1, 2, 4],
  Jazz: [3, 2, 1, 2, 3],
  Classique: [-2, -1, 0, 2, 2],
  'Bass Boost': [6, 4, 0, 0, 0],
};

function VolumeSlider({value, onChange}: {value: number; onChange: (v: number) => void}) {
  const [width, setWidth] = useState(0);
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', marginVertical: 10}}>
      <Text style={{color: '#fff', marginRight: 10, fontSize: 14}}>🔊</Text>
      <Pressable
        style={{flex: 1, height: 20, justifyContent: 'center'}}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        onPress={e => {
          if (width > 0) {
            onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / width)));
          }
        }}
      >
        <View style={{height: 6, backgroundColor: '#333', borderRadius: 3, width: '100%'}}>
          <View style={{height: 6, backgroundColor: '#ff7a08', borderRadius: 3, width: `${value * 100}%`}} />
        </View>
      </Pressable>
      <Text style={{color: '#fff', marginLeft: 10, fontSize: 12, width: 35}}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

function EqualizerBand({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [height, setHeight] = useState(0);
  const percent = (value + 12) / 24; // map -12..12 to 0..1
  return (
    <View style={{alignItems: 'center', marginHorizontal: 8}}>
      <Text style={{color: '#888', fontSize: 10, marginBottom: 5}}>
        {value > 0 ? `+${value}` : value} dB
      </Text>
      <Pressable
        style={{width: 30, height: 120, alignItems: 'center', justifyContent: 'center'}}
        onLayout={e => setHeight(e.nativeEvent.layout.height)}
        onPress={e => {
          if (height > 0) {
            const fraction = 1 - e.nativeEvent.locationY / height;
            const dbVal = Math.round(fraction * 24 - 12);
            onChange(Math.max(-12, Math.min(12, dbVal)));
          }
        }}
      >
        <View style={{width: 6, height: '100%', backgroundColor: '#333', borderRadius: 3, position: 'relative'}}>
          <View
            style={{
              width: 6,
              height: `${percent * 100}%`,
              backgroundColor: '#ff7a08',
              borderRadius: 3,
              position: 'absolute',
              bottom: 0,
              left: 0,
            }}
          />
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#fff',
              position: 'absolute',
              bottom: `${percent * 100}%`,
              marginBottom: -7,
              left: -4,
            }}
          />
        </View>
      </Pressable>
      <Text style={{color: '#fff', fontSize: 11, marginTop: 5}}>{label}</Text>
    </View>
  );
}

export function FullPlayerScreen({
  track,
  isPlaying,
  position,
  duration,
  loopMode,
  volume,
  onVolumeChange,
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
  onDownload,
  onSetRingtone,
  onAddToPlaylist,
  onToggleCast,
  onToggleRepeat,
}: {
  track: Track;
  isPlaying: boolean;
  position: number;
  duration: number;
  loopMode: 'normal' | 'shuffle' | 'repeat1';
  volume: number;
  onVolumeChange: (vol: number) => void;
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
  onDownload: (track: Track) => void;
  onSetRingtone: () => void;
  onAddToPlaylist: () => void;
  onToggleCast: () => void;
  onToggleRepeat: () => void;
}) {
  const [progressWidth, setProgressWidth] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEqualizerVisible, setIsEqualizerVisible] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('Normal');
  const [eqBands, setEqBands] = useState([
    { label: '60 Hz', value: 0 },
    { label: '230 Hz', value: 0 },
    { label: '910 Hz', value: 0 },
    { label: '4 kHz', value: 0 },
    { label: '14 kHz', value: 0 },
  ]);

  const applyPreset = (name: string) => {
    setSelectedPreset(name);
    const values = EQ_PRESETS[name] || [0, 0, 0, 0, 0];
    setEqBands([
      { label: '60 Hz', value: values[0] },
      { label: '230 Hz', value: values[1] },
      { label: '910 Hz', value: values[2] },
      { label: '4 kHz', value: values[3] },
      { label: '14 kHz', value: values[4] },
    ]);
  };

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;
  const coverSpin = useRef(new Animated.Value(0)).current;
  const visualizerValues = useRef(
    visualizerBars.map(height => new Animated.Value(height)),
  ).current;
  const coverRotation = coverSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  React.useEffect(() => {
    if (!isPlaying) {
      coverSpin.stopAnimation();
      return;
    }

    coverSpin.setValue(0);
    const animation = Animated.loop(
      Animated.timing(coverSpin, {
        toValue: 1,
        duration: 5200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => animation.stop();
  }, [coverSpin, isPlaying]);

  React.useEffect(() => {
    const animateBars = () => {
      visualizerValues.forEach((value, index) => {
        const baseHeight = visualizerBars[index];
        const boost = isPlaying ? 12 + Math.random() * 46 : 0;
        Animated.timing(value, {
          toValue: Math.min(96, baseHeight + boost),
          duration: isPlaying ? 95 : 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      });
    };

    animateBars();
    if (!isPlaying) {
      return undefined;
    }

    const timer = setInterval(animateBars, 120);
    return () => clearInterval(timer);
  }, [isPlaying, visualizerValues]);

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
        <Pressable onPress={() => setIsMenuOpen(previous => !previous)} hitSlop={12}>
          <Text style={styles.fullTopIcon}>⋮</Text>
        </Pressable>
      </View>
      {isMenuOpen ? (
        <View style={styles.playerMenu}>
          <MenuAction
            label="Definir comme sonnerie"
            onPress={() => {
              setIsMenuOpen(false);
              onSetRingtone();
            }}
          />
          <MenuAction
            label={track.liked ? 'Retirer des favoris' : 'Favoris'}
            onPress={() => {
              setIsMenuOpen(false);
              onToggleLike(track);
            }}
          />
          <MenuAction
            label="Ajouter a une playlist"
            onPress={() => {
              setIsMenuOpen(false);
              onAddToPlaylist();
            }}
          />
          <MenuAction
            label="Telecharger"
            onPress={() => {
              setIsMenuOpen(false);
              onDownload(track);
            }}
          />
          <MenuAction
            label="Partager"
            onPress={() => {
              setIsMenuOpen(false);
              onShare();
            }}
          />
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.fullContent}>
        <Animated.View
          style={[styles.fullCover, {transform: [{rotate: coverRotation}]}]}>
          <ImageBackground
            source={coverSource(track.cover)}
            imageStyle={styles.fullCoverImage}
            style={styles.fullCoverInner}
          />
        </Animated.View>

        <Text style={styles.fullTitle} numberOfLines={2}>
          {track.title}
        </Text>
        <Text style={styles.fullArtist} numberOfLines={1}>
          {track.artist} • {track.genre}
        </Text>

        <View style={styles.visualizer}>
          {visualizerValues.map((height, index) => (
            <Animated.View
              key={`visualizer-${index}`}
              style={[styles.visualizerBar, {height}]}
            />
          ))}
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
          <Pressable onPress={() => setIsEqualizerVisible(true)} style={styles.fullIconButton}>
            <Text style={[styles.fullControlIcon, isEqualizerVisible && styles.fullControlActive]}>
              🎛️
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
            <Text style={[styles.fullControlIcon, loopMode !== 'normal' && styles.fullControlActive]}>
              {loopMode === 'shuffle' ? '🔀' : loopMode === 'repeat1' ? '🔂' : '↻'}
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

      {isEqualizerVisible && (
        <View style={styles.eqOverlay}>
          <View style={styles.eqHeader}>
            <Text style={styles.eqTitle}>Égaliseur & Volume</Text>
            <Pressable onPress={() => setIsEqualizerVisible(false)} hitSlop={10}>
              <Text style={styles.eqCloseText}>✕</Text>
            </Pressable>
          </View>

          {/* Volume */}
          <View style={styles.eqSection}>
            <Text style={styles.eqSectionTitle}>Volume</Text>
            <VolumeSlider value={volume} onChange={onVolumeChange} />
          </View>

          {/* Presets */}
          <View style={styles.eqSection}>
            <Text style={styles.eqSectionTitle}>Préréglages</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginVertical: 5}}>
              {Object.keys(EQ_PRESETS).map(name => (
                <Pressable
                  key={name}
                  onPress={() => applyPreset(name)}
                  style={[
                    styles.eqPresetButton,
                    selectedPreset === name && styles.eqPresetButtonActive
                  ]}
                >
                  <Text style={[
                    styles.eqPresetText,
                    selectedPreset === name && styles.eqPresetTextActive
                  ]}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Bands */}
          <View style={styles.eqSection}>
            <Text style={styles.eqSectionTitle}>Bandes</Text>
            <View style={styles.eqBandsContainer}>
              {eqBands.map((band, idx) => (
                <EqualizerBand
                  key={band.label}
                  label={band.label}
                  value={band.value}
                  onChange={(val) => {
                    setSelectedPreset('Manuel');
                    const newBands = [...eqBands];
                    newBands[idx] = { ...newBands[idx], value: val };
                    setEqBands(newBands);
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      )}
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
      <Text style={[styles.fullActionIcon, active && styles.fullActionActive]}>
        {icon}
      </Text>
      <Text style={styles.fullActionText}>{label}</Text>
    </Pressable>
  );
}

function MenuAction({label, onPress}: {label: string; onPress: () => void}) {
  return (
    <Pressable style={styles.playerMenuAction} onPress={onPress}>
      <Text style={styles.playerMenuText}>{label}</Text>
    </Pressable>
  );
}
