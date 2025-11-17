/**
 * Voice Service - Audio recording and playback
 */
import { AudioRecorder, AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

class VoiceService {
  constructor() {
    this.recorder = null;
    this.player = null;
  }

  async requestPermissions() {
    try {
      const permission = await AudioRecorder.requestPermissionsAsync();
      if (!permission.granted) {
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
      
      this.recorder = new AudioRecorder({
        android: {
          extension: '.m4a',
          outputFormat: 'mpeg_4',
          audioEncoder: 'aac',
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: 'mpeg_4',
          audioQuality: 'max',
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await this.recorder.record();
      return this.recorder;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording() {
    try {
      if (!this.recorder) {
        throw new Error('No active recording');
      }

      const uri = await this.recorder.stop();
      this.recorder = null;

      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  async getRecordingDuration() {
    if (!this.recorder) return 0;
    const status = await this.recorder.getStatus();
    return status.durationMillis ? status.durationMillis / 1000 : 0;
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
      if (this.player) {
        await this.player.pause();
        this.player = null;
      }

      // Create a temporary file for the base64 audio
      const tempUri = FileSystem.documentDirectory + 'temp_audio.mp3';
      await FileSystem.writeAsStringAsync(tempUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create and play the audio
      this.player = new AudioPlayer(tempUri);
      await this.player.play();

      // Clean up after playback
      this.player.addListener('playbackStatusUpdate', async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
        }
      });

      return this.player;
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  async stopPlayback() {
    try {
      if (this.player) {
        await this.player.pause();
        this.player = null;
      }
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  }

  async cleanup() {
    if (this.recorder) {
      try {
        await this.recorder.stop();
      } catch (error) {
        // Recorder might already be stopped
      }
      this.recorder = null;
    }
    if (this.player) {
      try {
        await this.player.pause();
      } catch (error) {
        // Player might already be stopped
      }
      this.player = null;
    }
  }
}

export default new VoiceService();
