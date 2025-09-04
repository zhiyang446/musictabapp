import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Audio } from 'expo-av';

/**
 * T48 Audio Player Component for separated stems
 */
export default function AudioPlayer({ 
  audioUrl, 
  title = 'Audio', 
  stemType = null,
  onStatusUpdate = null 
}) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(null);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    return sound
      ? () => {
          console.log('🎵 T48: Unloading audio player');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🎵 T48: Loading audio:', audioUrl);
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        handleStatusUpdate
      );

      setSound(newSound);
      console.log('✅ T48: Audio loaded successfully');
      
    } catch (err) {
      console.error('❌ T48: Audio loading error:', err);
      setError('Failed to load audio');
      Alert.alert('Audio Error', 'Failed to load audio file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = (status) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis);
      setPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);
      
      if (onStatusUpdate) {
        onStatusUpdate(status);
      }
    } else if (status.error) {
      console.error('❌ T48: Playback error:', status.error);
      setError('Playback error');
    }
  };

  const togglePlayback = async () => {
    try {
      if (!sound) {
        await loadAudio();
        return;
      }

      if (isPlaying) {
        console.log('⏸️ T48: Pausing audio');
        await sound.pauseAsync();
      } else {
        console.log('▶️ T48: Playing audio');
        await sound.playAsync();
      }
    } catch (err) {
      console.error('❌ T48: Playback toggle error:', err);
      Alert.alert('Playback Error', 'Failed to control audio playback');
    }
  };

  const stopPlayback = async () => {
    try {
      if (sound) {
        console.log('⏹️ T48: Stopping audio');
        await sound.stopAsync();
        await sound.setPositionAsync(0);
      }
    } catch (err) {
      console.error('❌ T48: Stop error:', err);
    }
  };

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPlayButtonText = () => {
    if (isLoading) return '⏳';
    if (error) return '❌';
    if (!sound) return '▶️';
    return isPlaying ? '⏸️' : '▶️';
  };

  const getStemIcon = (type) => {
    switch (type) {
      case 'drums': return '🥁';
      case 'bass': return '🎸';
      case 'vocals': return '🎤';
      case 'other': return '🎵';
      default: return '🎵';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {stemType && (
            <Text style={styles.stemIcon}>{getStemIcon(stemType)}</Text>
          )}
          <Text style={styles.title}>{title}</Text>
          {stemType && (
            <Text style={styles.stemType}>({stemType})</Text>
          )}
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.playButton,
            isLoading && styles.loadingButton,
            error && styles.errorButton
          ]}
          onPress={togglePlayback}
          disabled={isLoading || !!error}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.playButtonText}>{getPlayButtonText()}</Text>
          )}
        </TouchableOpacity>

        {sound && (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopPlayback}
          >
            <Text style={styles.stopButtonText}>⏹️</Text>
          </TouchableOpacity>
        )}

        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          T48: {stemType ? `${stemType} stem` : 'audio'} player
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  header: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stemIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  stemType: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loadingButton: {
    backgroundColor: '#6c757d',
  },
  errorButton: {
    backgroundColor: '#dc3545',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: '#6c757d',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopButtonText: {
    fontSize: 16,
  },
  timeContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  debugInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  debugText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
