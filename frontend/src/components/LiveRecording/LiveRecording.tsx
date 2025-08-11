import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Settings,
  Users,
  Waves,
  AlertCircle,
  Clock
} from 'lucide-react';
import { TranscriptionSegment } from '../../types/Meeting';
import './LiveRecording.css';

interface LiveRecordingProps {
  onTranscriptionSegment: (segment: TranscriptionSegment & { isPartial: boolean }) => void;
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onError: (error: Error) => void;
  onRecordingStart?: () => void;
  showLiveTranscription?: boolean;
  showAudioVisualization?: boolean;
  enableSpeakerDetection?: boolean;
  allowDeviceSelection?: boolean;
  keyboardShortcuts?: boolean;
  autoStart?: boolean;
}

interface AudioDevice {
  deviceId: string;
  label: string;
}

type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopping' | 'error';

export const LiveRecording: React.FC<LiveRecordingProps> = ({
  onTranscriptionSegment,
  onRecordingComplete,
  onError,
  onRecordingStart,
  showLiveTranscription = true,
  showAudioVisualization = true,
  enableSpeakerDetection = false,
  allowDeviceSelection = false,
  keyboardShortcuts = true,
  autoStart = false
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [transcriptionStats, setTranscriptionStats] = useState({
    wordCount: 0,
    segmentCount: 0,
    wordsPerMinute: 0,
    lastWordTime: 0
  });
  const [liveTranscriptionSegments, setLiveTranscriptionSegments] = useState<
    (TranscriptionSegment & { isPartial: boolean })[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const audioChunksRef = useRef<Blob[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Initialize audio devices
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.substring(0, 5)}`
          }));
        
        setAudioDevices(audioInputs);
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };

    if (allowDeviceSelection) {
      getAudioDevices();
    }
  }, [allowDeviceSelection]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && recordingState === 'idle') {
      startRecording();
    }
  }, [autoStart]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboardShortcuts) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (recordingState === 'idle') {
            startRecording();
          } else if (recordingState === 'recording') {
            pauseRecording();
          } else if (recordingState === 'paused') {
            resumeRecording();
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (recordingState === 'recording' || recordingState === 'paused') {
            stopRecording();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [recordingState, keyboardShortcuts]);

  // Update transcription statistics
  const updateTranscriptionStats = useCallback(() => {
    const totalWords = liveTranscriptionSegments.reduce((count, segment) => {
      return count + segment.content.split(' ').filter(word => word.trim()).length;
    }, 0);
    
    const segmentCount = liveTranscriptionSegments.length;
    const wordsPerMinute = duration > 0 ? Math.round((totalWords / duration) * 60) : 0;
    
    setTranscriptionStats({
      wordCount: totalWords,
      segmentCount,
      wordsPerMinute,
      lastWordTime: Date.now()
    });
  }, [liveTranscriptionSegments, duration]);

  // Update stats when transcription changes
  useEffect(() => {
    updateTranscriptionStats();
  }, [updateTranscriptionStats]);

  // Duration timer
  useEffect(() => {
    if (recordingState === 'recording') {
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [recordingState]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio context initialization (simplified - no longer needed for visualization)
  const initializeAudioContext = async (stream: MediaStream) => {
    // Audio context is no longer needed since we use Speech Recognition API
    console.log('🔧 Audio context not needed - using Speech Recognition API');
  };

  const connectWebSocket = () => {
    try {
      console.log('🔌 Attempting to connect to WebSocket...');
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3002';
      // Use secure WebSocket in production
      const secureWsUrl = wsUrl.replace(/^ws:\/\//, 'wss://');
      const ws = new WebSocket(process.env.NODE_ENV === 'production' ? secureWsUrl : wsUrl);
      
      ws.onopen = () => {
        console.log('✅ Connected to transcription WebSocket');
        websocketRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          // Validate message data before parsing
          if (typeof event.data !== 'string' || event.data.length > 10000) {
            console.warn('Invalid WebSocket message format or size');
            return;
          }
          
          const data = JSON.parse(event.data);
          
          // Validate message structure
          if (!data || typeof data !== 'object' || !data.type) {
            console.warn('Invalid WebSocket message structure');
            return;
          }
          
          if (data.type === 'transcription_segment' && data.payload?.segment) {
            const segment = data.payload.segment;
            const transcriptionSegment = {
              id: segment.id,
              startTime: segment.startTime,
              endTime: segment.endTime,
              speakerId: segment.speaker.toLowerCase().replace(' ', ''),
              content: segment.text,
              confidence: segment.confidence,
              isPartial: data.payload.isPartial || false
            };
            
            console.log('📝 Received transcription:', transcriptionSegment.content);
            
            // Add to live transcription display
            setLiveTranscriptionSegments(prev => [...prev.slice(-10), transcriptionSegment]);
            
            // Send to parent component
            onTranscriptionSegment(transcriptionSegment);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket connection closed');
        websocketRef.current = null;
      };

      ws.onerror = (error) => {
        console.error('🔌 WebSocket error:', error);
        websocketRef.current = null;
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const disconnectWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  };

  const startSpeechRecognition = () => {
    try {
      // Get the browser's speech recognition API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.log('❌ Speech Recognition not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID'; // Indonesian language
      
      recognition.onstart = () => {
        console.log('🎙️ Speech recognition started');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            
            // Create transcription segment for final results
            const transcriptionSegment = {
              id: Date.now().toString(),
              startTime: duration - 3,
              endTime: duration,
              speakerId: 'speaker1',
              content: transcript.trim(),
              confidence: confidence || 0.9,
              isPartial: false
            };
            
            console.log('📝 Speech Recognition Result:', transcript.trim());
            
            // Add to live transcription display
            setLiveTranscriptionSegments(prev => [...prev.slice(-10), transcriptionSegment]);
            
            // Send to parent component
            onTranscriptionSegment(transcriptionSegment);
          } else {
            interimTranscript += transcript;
          }
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('🔥 Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access denied. Please grant permission.');
        }
      };
      
      recognition.onend = () => {
        console.log('🔚 Speech recognition ended');
        // Restart if still recording
        if (recordingState === 'recording') {
          setTimeout(() => startSpeechRecognition(), 100);
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      console.log('✅ Speech recognition initialized for Indonesian');
      
    } catch (error) {
      console.error('❌ Failed to initialize speech recognition:', error);
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
        console.log('🛑 Speech recognition stopped');
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  };

  const startRecording = async () => {
    try {
      setRecordingState('requesting');
      setErrorMessage('');
      setDuration(0);
      audioChunksRef.current = [];
      setLiveTranscriptionSegments([]);
      setTranscriptionStats({
        wordCount: 0,
        segmentCount: 0,
        wordsPerMinute: 0,
        lastWordTime: 0
      });

      const constraints: MediaStreamConstraints = {
        audio: selectedDevice !== 'default' ? {
          deviceId: { exact: selectedDevice },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      };
      
      console.log('🎤 Requesting microphone with constraints:', constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // Audio visualization no longer needed - using Speech Recognition API

      // Connect to WebSocket for real-time transcription
      connectWebSocket();
      
      // Start browser speech recognition for Indonesian
      startSpeechRecognition();

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm; codecs=opus') 
          ? 'audio/webm; codecs=opus' 
          : 'audio/webm'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send audio chunk to WebSocket for real-time transcription
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            // Convert blob to array buffer and send
            event.data.arrayBuffer().then(arrayBuffer => {
              websocketRef.current?.send(arrayBuffer);
              console.log('🎤 Sent audio chunk to server:', event.data.size, 'bytes');
            }).catch(error => {
              console.error('Error sending audio chunk:', error);
            });
          }
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob, duration);
        cleanupRecording();
        setRecordingState('idle');
      };

      mediaRecorder.onerror = (event) => {
        const errorEvent = event as any;
        const error = new Error(`Recording error: ${errorEvent.error || 'Unknown error'}`);
        onError(error);
        setErrorMessage(error.message);
        setRecordingState('error');
        cleanupRecording();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Capture data every 250ms for real-time processing
      setRecordingState('recording');
      
      // Call onRecordingStart callback if provided
      if (onRecordingStart) {
        onRecordingStart();
      }

    } catch (error) {
      const recordingError = error instanceof Error 
        ? error 
        : new Error('Failed to start recording');
      
      setErrorMessage(
        recordingError.name === 'NotAllowedError' 
          ? 'Microphone access denied. Please grant permission to continue.'
          : recordingError.message
      );
      setRecordingState('error');
      onError(recordingError);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      
      // Pause speech recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      // Resume speech recognition if needed
      if (!speechRecognitionRef.current) {
        startSpeechRecognition();
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      setRecordingState('stopping');
      mediaRecorderRef.current.stop();
    }
  };

  const cleanupRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    // Close WebSocket connection
    disconnectWebSocket();
    
    // Stop speech recognition
    stopSpeechRecognition();

    mediaRecorderRef.current = null;
  };

  // Simulate real-time transcription (would be replaced with actual WebSocket connection)
  const simulateTranscriptionSegment = (_audioChunk: Blob) => {
    if (!showLiveTranscription) return;

    // This is a mock - in real implementation, you'd send audioChunk to Whisper API
    const mockSegments = [
      'Selamat pagi semua, mari kita mulai meeting hari ini.',
      'Agenda pertama adalah review progress project minggu lalu.',
      'Apakah ada update dari tim development?',
      'Saya rasa kita perlu fokus pada testing dan quality assurance.',
      'Deadline untuk milestone ini adalah akhir bulan.'
    ];

    // Simulate random transcription with Indonesian content
    const randomIndex = Math.floor(Math.random() * mockSegments.length);
    const newSegment: TranscriptionSegment & { isPartial: boolean } = {
      id: Date.now().toString(),
      startTime: duration - 2,
      endTime: duration,
      speakerId: `speaker${Math.floor(Math.random() * 3) + 1}`,
      content: mockSegments[randomIndex],
      confidence: 0.85 + Math.random() * 0.15,
      isPartial: Math.random() > 0.7 // 30% chance of partial results
    };

    setLiveTranscriptionSegments(prev => [...prev.slice(-10), newSegment]); // Keep last 10 segments
    onTranscriptionSegment(newSegment);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const getRecordingStatusText = () => {
    switch (recordingState) {
      case 'requesting':
        return 'Meminta akses mikrofon...'
      case 'recording':
        return 'Sedang merekam'
      case 'paused':
        return 'Rekaman dijeda'
      case 'stopping':
        return 'Menghentikan rekaman...'
      case 'error':
        return 'Terjadi kesalahan rekaman'
      default:
        return 'Siap untuk merekam'
    }
  };

  const getRecordingButton = () => {
    switch (recordingState) {
      case 'idle':
        return {
          icon: <Mic size={24} />,
          text: 'Mulai Rekam',
          action: startRecording,
          className: 'btn-start',
          disabled: false
        };
      case 'requesting':
        return {
          icon: <Mic size={24} />,
          text: 'Memulai...',
          action: () => {},
          className: 'btn-start',
          disabled: true
        };
      case 'recording':
        return {
          icon: <Pause size={24} />,
          text: 'Jeda Rekam',
          action: pauseRecording,
          className: 'btn-pause',
          disabled: false
        };
      case 'paused':
        return {
          icon: <Play size={24} />,
          text: 'Lanjut Rekam',
          action: resumeRecording,
          className: 'btn-resume',
          disabled: false
        };
      case 'stopping':
        return {
          icon: <Square size={24} />,
          text: 'Menghentikan...',
          action: () => {},
          className: 'btn-stop',
          disabled: true
        };
      default:
        return {
          icon: <MicOff size={24} />,
          text: 'Coba Lagi',
          action: () => setRecordingState('idle'),
          className: 'btn-error',
          disabled: false
        };
    }
  };

  const recordingButton = getRecordingButton();

  return (
    <div className="live-recording">
      <div className="recording-header">
        <div className="header-info">
          <h2>Rekam Meeting Langsung</h2>
          <div className="recording-status">
            {(recordingState === 'recording' || recordingState === 'paused') && (
              <div 
                className={`recording-indicator ${recordingState}`}
                data-testid="recording-indicator"
              >
                <div className="pulse-dot" />
                <span>{getRecordingStatusText()}</span>
                {recordingState === 'recording' && (
                  <div className="duration">
                    <Clock size={16} />
                    <span>{formatDuration(duration)}</span>
                  </div>
                )}
              </div>
            )}
            {recordingState === 'idle' && (
              <p className="idle-message">Berikan akses mikrofon untuk memulai transkripsi langsung</p>
            )}
            {recordingState === 'error' && (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        <div className="recording-controls">
          {allowDeviceSelection && audioDevices.length > 0 && recordingState === 'idle' && (
            <div className="device-selection">
              <label htmlFor="microphone-select">Pilih mikrofon:</label>
              <select
                id="microphone-select"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="device-select"
              >
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="control-buttons">
            <button
              onClick={recordingButton.action}
              disabled={recordingButton.disabled}
              className={`recording-button ${recordingButton.className}`}
              aria-label={recordingButton.text}
            >
              {recordingButton.icon}
              <span>{recordingButton.text}</span>
            </button>

            {(recordingState === 'recording' || recordingState === 'paused') && (
              <>
                <button
                  onClick={stopRecording}
                  className="stop-button"
                  aria-label="Berhenti rekam"
                >
                  <Square size={24} />
                  <span>Berhenti Rekam</span>
                </button>
                
                {/* Manual test transcription button */}
                <button
                  onClick={() => {
                    console.log('🎯 Manual trigger button clicked');
                    // Send a special "trigger transcription" message to WebSocket
                    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                      websocketRef.current.send(JSON.stringify({
                        type: 'trigger_transcription',
                        timestamp: Date.now()
                      }));
                      console.log('✅ Manually triggered transcription via WebSocket');
                    } else {
                      console.log('❌ WebSocket not available, using local mock');
                      console.log('WebSocket state:', websocketRef.current?.readyState || 'null');
                      // Fallback to local mock if no WebSocket
                      simulateTranscriptionSegment(new Blob());
                    }
                  }}
                  className="test-button"
                  style={{
                    padding: '8px 16px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginLeft: '8px'
                  }}
                  aria-label="Tes transkripsi"
                >
                  🎯 Test Transkripsi
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {(recordingState === 'recording' || recordingState === 'paused') && (
        <div className="transcription-stats" data-testid="transcription-stats">
          <div className="stats-container">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{transcriptionStats.wordCount}</div>
                <div className="stat-label">Kata</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{transcriptionStats.segmentCount}</div>
                <div className="stat-label">Segmen</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{transcriptionStats.wordsPerMinute}</div>
                <div className="stat-label">KPM</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</div>
                <div className="stat-label">Durasi</div>
              </div>
            </div>
            <div className="stats-status">
              {liveTranscriptionSegments.length > 0 ? (
                <span style={{ color: '#10b981' }}>🎙️ Mentranskripsi Bahasa Indonesia</span>
              ) : (
                <span style={{ color: '#6b7280' }}>🎤 Mendengarkan suara...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {enableSpeakerDetection && (
        <div className="speaker-detection">
          <Users size={20} />
          <span>Deteksi pembicara aktif - pembicara akan diidentifikasi otomatis</span>
        </div>
      )}

      {showLiveTranscription && (recordingState === 'recording' || recordingState === 'paused') && (
        <div className="live-transcription">
          <div className="transcription-header">
            <Waves size={20} />
            <h3>Transkripsi Langsung</h3>
            <span className="segment-count">
              ({liveTranscriptionSegments.length} segments)
            </span>
          </div>

          <div className="transcription-content">
            {liveTranscriptionSegments.length === 0 ? (
              <div className="no-transcription">
                <p>Transkripsi akan muncul di sini saat Anda berbicara...</p>
              </div>
            ) : (
              <div className="transcription-segments">
                {liveTranscriptionSegments.map(segment => (
                  <div
                    key={segment.id}
                    className={`transcription-segment ${segment.isPartial ? 'partial' : 'final'}`}
                  >
                    <div className="segment-meta">
                      <span className="speaker">
                        Speaker {segment.speakerId.replace('speaker', '')}
                      </span>
                      <span className="time">
                        {formatDuration(Math.max(0, segment.startTime))}
                      </span>
                      <span className="confidence">
                        {Math.round(segment.confidence * 100)}%
                      </span>
                      {segment.isPartial && (
                        <span className="partial-indicator">Partial</span>
                      )}
                    </div>
                    <p className="segment-text">{segment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {keyboardShortcuts && recordingState !== 'error' && (
        <div className="keyboard-shortcuts">
          <div className="shortcuts-info">
            <h4>Pintasan Keyboard:</h4>
            <div className="shortcuts-list">
              <span><kbd>Space</kbd> Mulai/Jeda Rekaman</span>
              <span><kbd>Esc</kbd> Berhenti Rekam</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};