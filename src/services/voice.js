/**
 * Voice Service - Audio recording and playbook
 */
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

class VoiceService {
  constructor() {
    this.recording = null;
    this.sound = null;
  }

  async requestPermissions() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      throw error;
    }
  }

  async startRecording() {
    try {
      await this.requestPermissions();
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      return recording;
    } catch (error) {
      console.error('Failed to start recording:', error);
      if (error.message.includes('permission') || error.message.includes('denied')) {
        throw new Error('Microphone permission denied. Please enable microphone access in settings.');
      }
      throw error;
    }
  }

  async stopRecording() {
    try {
      if (!this.recording) {
        throw new Error('No active recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;

      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  async getRecordingDuration() {
    if (!this.recording) return 0;
    const status = await this.recording.getStatusAsync();
    return status.durationMillis / 1000;
  }

  async convertAudioToBase64(uri) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Failed to convert audio to base64:', error);
      throw error;
    }
  }

  async playAudio(base64Audio) {
    try {
      // Stop any existing playback
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Create sound from base64
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mp3;base64,${base64Audio}` },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Clean up after playback
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });

      return sound;
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  async stopPlayback() {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  }

  async cleanup() {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

export default new VoiceService();
