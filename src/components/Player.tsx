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

export function FullPlayerScreen({
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
  onSetRingtone,
  onAddToPlaylist,
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
  onSetRingtone: () => void;
  onAddToPlaylist: () => void;
  onToggleCast: () => void;
  onToggleRepeat: () => void;
}) {
  const [progressWidth, setProgressWidth] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
