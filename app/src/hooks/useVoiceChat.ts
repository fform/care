/**
 * useVoiceChat — manages an OpenAI Realtime voice session.
 *
 * Architecture:
 *  1. POST /ai/voice/session  →  ephemeral key from our API
 *  2. WebSocket to OpenAI Realtime with the ephemeral key
 *  3. Record audio in 500ms PCM16 WAV chunks, strip header, stream via input_audio_buffer.append
 *  4. Receive transcript deltas + audio response deltas; play audio when complete
 *  5. Handle create_task / switch_circle function calls → surface as suggestion cards
 */

import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioRecorder,
  type AudioStatus,
  type RecordingOptions,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from '@/lib/api';
import { useCirclesStore } from '@/store/circles.store';

// ── Constants ────────────────────────────────────────────────────────────────

const CHUNK_MS = 500;
const SAMPLE_RATE = 24000;
const OPENAI_REALTIME_URL =
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';

/** Full `RecordingOptions` (all platforms) — recording loop runs on iOS only. */
const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  extension: '.wav',
  sampleRate: SAMPLE_RATE,
  numberOfChannels: 1,
  bitRate: SAMPLE_RATE * 2 * 8,
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MEDIUM,
    sampleRate: SAMPLE_RATE,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

/** Native recorder constructor expects merged common + iOS fields (see `expo-audio` `createRecordingOptions`). */
function iosVoiceRecorderInit() {
  const o = VOICE_RECORDING_OPTIONS;
  return {
    extension: o.extension,
    sampleRate: o.sampleRate,
    numberOfChannels: o.numberOfChannels,
    bitRate: o.bitRate,
    isMeteringEnabled: false,
    ...o.ios,
  };
}

// ── Public types ─────────────────────────────────────────────────────────────

export type VoiceChatStatus = 'idle' | 'connecting' | 'listening' | 'ai_speaking' | 'error';

export type TranscriptEntry = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export type TaskSuggestion = {
  id: string;
  callId: string;
  circleId: string;
  circleName?: string;
  title: string;
  description?: string;
  dueAt?: string;
  isRecurring?: boolean;
  recurrenceSlotTimes?: string[];
  status: 'pending' | 'confirmed' | 'dismissed';
};

export type VoiceChatCircle = {
  id: string;
  name: string;
  heartName: string;
};

// ── Audio helpers ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Scan WAV binary data for the "data" chunk and return the offset to raw PCM.
 * Falls back to 44 (standard header size) if not found.
 */
function findWavDataOffset(binary: string): number {
  const limit = Math.min(binary.length - 8, 256);
  for (let i = 12; i < limit; i++) {
    if (
      binary.charCodeAt(i) === 100 &&
      binary.charCodeAt(i + 1) === 97 &&
      binary.charCodeAt(i + 2) === 116 &&
      binary.charCodeAt(i + 3) === 97
    ) {
      return i + 8; // skip "data" marker + 4-byte size field
    }
  }
  return 44;
}

/** Read a WAV file and return only the raw PCM bytes as base64. */
async function readPcmFromWavFile(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const offset = findWavDataOffset(binary);
  const pcmBinary = binary.slice(offset);
  if (pcmBinary.length === 0) return '';
  return btoa(pcmBinary);
}

/** Build a WAV file (base64) from raw PCM16 chunks (base64 each). */
function buildWavBase64(chunks: string[], sampleRate: number): string {
  const binaryChunks = chunks.map((c) => atob(c));
  const totalPcmBytes = binaryChunks.reduce((s, b) => s + b.length, 0);

  const wav = new Uint8Array(44 + totalPcmBytes);
  const view = new DataView(wav.buffer);

  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  str(0, 'RIFF');
  view.setUint32(4, 36 + totalPcmBytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, totalPcmBytes, true);

  let offset = 44;
  for (const binary of binaryChunks) {
    for (let i = 0; i < binary.length; i++) {
      wav[offset++] = binary.charCodeAt(i);
    }
  }

  let bin = '';
  for (let i = 0; i < wav.length; i++) bin += String.fromCharCode(wav[i]);
  return btoa(bin);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceChat() {
  // ── React state (drives re-renders) ──────────────────────────────────────
  const [status, setStatus] = useState<VoiceChatStatus>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [circles, setCircles] = useState<VoiceChatCircle[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Mutable refs (stable, never stale in callbacks) ──────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<AudioRecorder | null>(null);
  const runningRef = useRef(false);
  const audioChunksRef = useRef<string[]>([]);
  const currentAiTextRef = useRef('');
  const soundRef = useRef<AudioPlayer | null>(null);
  const soundListenerRef = useRef<{ remove: () => void } | null>(null);
  const circlesRef = useRef<VoiceChatCircle[]>([]);
  const suggestionsRef = useRef<TaskSuggestion[]>([]);
  const lastCircleIdsRef = useRef<string[]>([]);

  /**
   * micMutedRef — when true the recording loop still runs but does NOT send
   * chunks to OpenAI. Set while AI is speaking (prevents the speaker output
   * from triggering OpenAI's VAD as if the user were speaking) and while the
   * user has manually paused.
   */
  const micMutedRef = useRef(false);
  /** Tracks the user-level pause so we don't unmute after AI finishes speaking. */
  const userPausedRef = useRef(false);

  const createTask = useCirclesStore((s) => s.createTask);

  // ── Internal helpers ──────────────────────────────────────────────────────

  function wsSend(event: unknown) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }

  function stopCurrentSound() {
    soundListenerRef.current?.remove();
    soundListenerRef.current = null;
    if (soundRef.current) {
      try {
        soundRef.current.pause();
        soundRef.current.remove();
      } catch {}
      soundRef.current = null;
    }
  }

  /**
   * Switch back to record-capable audio mode and unmute the mic.
   * Called after AI playback ends (naturally or via interruptAi).
   */
  async function restoreRecordingMode() {
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    } catch {}
    if (!userPausedRef.current) micMutedRef.current = false;
    if (runningRef.current) setStatus(userPausedRef.current ? 'listening' : 'listening');
  }

  async function playBufferedAudio() {
    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];
    if (chunks.length === 0) return;

    // Mute mic before playback so the speaker output doesn't re-trigger VAD.
    // Also clear any audio already buffered on the OpenAI side.
    micMutedRef.current = true;
    wsSend({ type: 'input_audio_buffer.clear' });

    try {
      stopCurrentSound();

      // Switch to playback-only mode — disables iOS AGC which causes the
      // volume pumping / choppiness heard when PlayAndRecord is active.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

      const wavBase64 = buildWavBase64(chunks, SAMPLE_RATE);
      const tmpUri = `${FileSystem.cacheDirectory}tend_voice_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(tmpUri, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const player = createAudioPlayer({ uri: tmpUri });
      soundRef.current = player;

      soundListenerRef.current = player.addListener(
        'playbackStatusUpdate',
        (s: AudioStatus) => {
          if (s.isLoaded && s.didJustFinish) {
            soundListenerRef.current?.remove();
            soundListenerRef.current = null;
            try {
              player.remove();
            } catch {}
            if (soundRef.current === player) soundRef.current = null;
            FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {});
            // Restore recording mode and unmute mic.
            void restoreRecordingMode();
          }
        },
      );

      setStatus('ai_speaking');
      player.play();
    } catch (e) {
      console.warn('[voiceChat] playback error', e);
      stopCurrentSound();
      void restoreRecordingMode();
    }
  }

  // Recording loop: records CHUNK_MS of PCM audio, sends it, repeats.
  // iOS only — Android voice capture is not implemented here.
  async function startRecordingLoop() {
    if (Platform.OS !== 'ios') return;

    const recorderInit = iosVoiceRecorderInit();

    while (runningRef.current) {
      // When mic is muted (AI speaking or user paused), skip recording entirely
      // so we don't clash with the playback-only audio session.
      if (micMutedRef.current) {
        await sleep(CHUNK_MS);
        continue;
      }

      let recording: AudioRecorder | null = null;
      try {
        recording = new AudioModule.AudioRecorder(recorderInit);
        recordingRef.current = recording;
        await recording.prepareToRecordAsync();
        recording.record();

        await sleep(CHUNK_MS);

        if (!runningRef.current) {
          try {
            await recording.stop();
          } catch {}
          try {
            recording.release();
          } catch {}
          if (recordingRef.current === recording) recordingRef.current = null;
          break;
        }

        await recording.stop();
        const uri = recording.uri;
        try {
          recording.release();
        } catch {}
        if (recordingRef.current === recording) recordingRef.current = null;

        if (!uri) continue;

        const pcmBase64 = await readPcmFromWavFile(uri);
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

        // Skip sending when AI is speaking or user has paused — prevents the
        // speaker output from triggering OpenAI's server-side VAD.
        if (pcmBase64 && wsRef.current?.readyState === WebSocket.OPEN && !micMutedRef.current) {
          wsSend({ type: 'input_audio_buffer.append', audio: pcmBase64 });
        }
      } catch (e) {
        if (recordingRef.current === recording && recording) {
          try {
            await recording.stop();
          } catch {}
          try {
            recording.release();
          } catch {}
          recordingRef.current = null;
        }
        if (!runningRef.current) break;
        console.warn('[voiceChat] chunk error', e);
        await sleep(100);
      }
    }
  }

  // Incoming WebSocket message handler — uses refs, never stale
  const onWsMessage = useRef<((data: string) => void) | undefined>(undefined);
  onWsMessage.current = (data: string) => {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = event.type as string;

    switch (type) {
      case 'session.created': {
        setStatus('listening');
        void startRecordingLoop();
        break;
      }

      case 'response.created': {
        // AI is about to start speaking — mute mic immediately so the upcoming
        // speaker output doesn't feed back into OpenAI's VAD.
        micMutedRef.current = true;
        break;
      }

      case 'input_audio_buffer.speech_started': {
        // Ignore this event while mic is muted — it's the AI's own speaker
        // output being picked up by the microphone.
        if (micMutedRef.current) break;
        // Genuine user barge-in — interrupt any AI playback.
        stopCurrentSound();
        audioChunksRef.current = [];
        if (runningRef.current) setStatus('listening');
        break;
      }

      case 'response.audio_transcript.delta': {
        const delta = (event.delta as string) ?? '';
        currentAiTextRef.current += delta;
        const text = currentAiTextRef.current;
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, text }];
          }
          return [...prev, { id: `ai-${Date.now()}`, role: 'assistant', text }];
        });
        break;
      }

      case 'response.audio_transcript.done': {
        currentAiTextRef.current = '';
        break;
      }

      case 'conversation.item.input_audio_transcription.completed': {
        const text = ((event.transcript as string) ?? '').trim();
        if (text) {
          setTranscript((prev) => [
            ...prev,
            { id: `user-${Date.now()}`, role: 'user', text },
          ]);
        }
        break;
      }

      case 'response.audio.delta': {
        const chunk = (event.delta as string) ?? '';
        if (chunk) audioChunksRef.current.push(chunk);
        break;
      }

      case 'response.audio.done': {
        void playBufferedAudio();
        break;
      }

      case 'response.function_call_arguments.done': {
        const name = event.name as string;
        const callId = event.call_id as string;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(event.arguments as string) as Record<string, unknown>;
        } catch {}

        if (name === 'create_task') {
          const circleId = args.circleId as string;
          const circle = circlesRef.current.find((c) => c.id === circleId);

          const suggestion: TaskSuggestion = {
            id: `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            callId,
            circleId,
            circleName: circle?.name,
            title: (args.title as string) ?? '',
            description: args.description as string | undefined,
            dueAt: args.dueAt as string | undefined,
            isRecurring: args.isRecurring as boolean | undefined,
            recurrenceSlotTimes: args.recurrenceSlotTimes as string[] | undefined,
            status: 'pending',
          };

          suggestionsRef.current = [...suggestionsRef.current, suggestion];
          setSuggestions([...suggestionsRef.current]);

          // Acknowledge so the AI knows the card was shown
          wsSend({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify({
                status: 'shown_to_user',
                message: 'Task proposal shown to user for review.',
              }),
            },
          });
          wsSend({ type: 'response.create' });
        }

        if (name === 'switch_circle') {
          // The modal shows a circle picker; acknowledge here
          wsSend({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify({
                status: 'prompted_user',
                message: 'Circle selector shown to user.',
              }),
            },
          });
          wsSend({ type: 'response.create' });
        }
        break;
      }

      case 'error': {
        const msg = (event.message as string) ?? 'Voice session error';
        console.error('[voiceChat] server error', event);
        setError(msg);
        setStatus('error');
        runningRef.current = false;
        break;
      }
    }
  };

  // ── Public API ────────────────────────────────────────────────────────────

  const cleanup = useCallback(async () => {
    runningRef.current = false;

    if (recordingRef.current) {
      try {
        await recordingRef.current.stop();
      } catch {}
      try {
        recordingRef.current.release();
      } catch {}
      recordingRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    stopCurrentSound();

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {}
  }, []);

  const disconnect = useCallback(() => {
    void cleanup();
    setStatus('idle');
    setError(null);
  }, [cleanup]);

  const connect = useCallback(
    async (circleIds?: string[]) => {
      if (status !== 'idle' && status !== 'error') return;

      setStatus('connecting');
      setIsPaused(false);
      setError(null);
      setTranscript([]);
      setSuggestions([]);
      setCircles([]);
      circlesRef.current = [];
      suggestionsRef.current = [];
      currentAiTextRef.current = '';
      audioChunksRef.current = [];
      micMutedRef.current = false;
      userPausedRef.current = false;
      if (circleIds) lastCircleIdsRef.current = circleIds;

      try {
        const perm = await requestRecordingPermissionsAsync();
        if (perm.status !== 'granted') {
          throw new Error('Microphone permission is required for voice chat.');
        }

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        type SessionResp = { data: { ephemeralKey: string; circles: VoiceChatCircle[] } };
        const session = await api.post<SessionResp>('/ai/voice/session', {
          circleIds: circleIds ?? [],
        });

        const { ephemeralKey, circles: sessionCircles } = session.data;
        circlesRef.current = sessionCircles;
        setCircles(sessionCircles);

        // React Native WebSocket supports a non-standard 3rd argument for headers.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const WS = WebSocket as any;
        const ws = new WS(OPENAI_REALTIME_URL, [], {
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            'OpenAI-Beta': 'realtime=v1',
          },
        }) as WebSocket;

        wsRef.current = ws;
        runningRef.current = true;

        ws.onmessage = (e) => {
          onWsMessage.current?.(e.data as string);
        };

        ws.onerror = () => {
          setError('Connection to voice service failed.');
          setStatus('error');
          runningRef.current = false;
        };

        ws.onclose = () => {
          if (runningRef.current) {
            setError('Voice session ended unexpectedly.');
            setStatus('error');
            runningRef.current = false;
          }
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not start voice session.';
        setError(msg);
        setStatus('error');
        await cleanup();
      }
    },
    [status, cleanup],
  );

  const confirmSuggestion = useCallback(
    async (id: string) => {
      const suggestion = suggestionsRef.current.find((s) => s.id === id);
      if (!suggestion || suggestion.status !== 'pending') return;

      try {
        await createTask(suggestion.circleId, {
          title: suggestion.title,
          description: suggestion.description,
          dueAt: suggestion.dueAt,
          isRecurring: suggestion.isRecurring,
          recurrenceSlotTimes: suggestion.recurrenceSlotTimes,
        });

        suggestionsRef.current = suggestionsRef.current.map((s) =>
          s.id === id ? { ...s, status: 'confirmed' } : s,
        );
        setSuggestions([...suggestionsRef.current]);
      } catch (e) {
        console.warn('[voiceChat] confirm task failed', e);
      }
    },
    [createTask],
  );

  const dismissSuggestion = useCallback((id: string) => {
    suggestionsRef.current = suggestionsRef.current.map((s) =>
      s.id === id ? { ...s, status: 'dismissed' } : s,
    );
    setSuggestions([...suggestionsRef.current]);
  }, []);

  /** Mute the microphone without ending the session. AI can still respond to any queued input. */
  const pause = useCallback(() => {
    userPausedRef.current = true;
    micMutedRef.current = true;
    wsSend({ type: 'input_audio_buffer.clear' });
    setIsPaused(true);
  }, []);

  /** Resume microphone input. */
  const resume = useCallback(() => {
    userPausedRef.current = false;
    micMutedRef.current = false;
    setIsPaused(false);
  }, []);

  /**
   * Stop the AI mid-sentence and immediately start listening again.
   * Useful for barge-in: the user taps while AI is talking.
   */
  const interruptAi = useCallback(() => {
    if (!soundRef.current && status !== 'ai_speaking') return;
    stopCurrentSound();
    audioChunksRef.current = [];
    // Tell OpenAI to cancel the in-progress response
    wsSend({ type: 'response.cancel' });
    // Restore recording audio mode so the mic works again
    void setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).then(() => {
      if (!userPausedRef.current) micMutedRef.current = false;
      if (runningRef.current) setStatus('listening');
    });
  }, [status]);

  /**
   * Close the current session and start a brand-new conversation
   * with the same circles. The transcript and suggestions are cleared.
   */
  const startNewConversation = useCallback(async () => {
    const ids = lastCircleIdsRef.current;
    runningRef.current = false;
    if (recordingRef.current) {
      try { await recordingRef.current.stop(); } catch {}
      try { recordingRef.current.release(); } catch {}
      recordingRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopCurrentSound();
    // Reset to idle so connect() can run
    setStatus('idle');
    setError(null);
    // Defer connect so the state flush completes first
    setTimeout(() => void connect(ids), 50);
  }, [connect]);

  /**
   * Send a text message into the conversation (e.g. user selected a circle
   * from the picker and we want to tell the AI which one).
   */
  const sendText = useCallback((text: string) => {
    wsSend({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    wsSend({ type: 'response.create' });
    setTranscript((prev) => [
      ...prev,
      { id: `user-txt-${Date.now()}`, role: 'user', text },
    ]);
  }, []);

  return {
    status,
    isPaused,
    transcript,
    suggestions,
    circles,
    error,
    connect,
    disconnect,
    pause,
    resume,
    interruptAi,
    startNewConversation,
    sendText,
    confirmSuggestion,
    dismissSuggestion,
  };
}
