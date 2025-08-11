import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveRecording } from './LiveRecording';

// Mock MediaRecorder and getUserMedia
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  state: 'inactive',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  ondataavailable: null,
  onstop: null,
  onstart: null,
  onpause: null,
  onresume: null,
};

const mockMediaStream = {
  getTracks: jest.fn(() => [
    { stop: jest.fn(), kind: 'audio', label: 'Default microphone' }
  ]),
  getAudioTracks: jest.fn(() => [
    { stop: jest.fn(), kind: 'audio', label: 'Default microphone' }
  ]),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

global.MediaRecorder = jest.fn(() => mockMediaRecorder) as any;
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() => Promise.resolve(mockMediaStream)),
    enumerateDevices: jest.fn(() => Promise.resolve([
      { deviceId: 'default', kind: 'audioinput', label: 'Default microphone' }
    ])),
  }
});

// Mock Web Audio API
global.AudioContext = jest.fn(() => ({
  createAnalyser: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn(),
  })),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  close: jest.fn(),
  state: 'running',
})) as any;

describe('LiveRecording Component', () => {
  const mockOnTranscriptionSegment = jest.fn();
  const mockOnRecordingComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockMediaRecorder.state = 'inactive';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders live recording interface', () => {
    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    expect(screen.getByText(/live meeting recording/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
    expect(screen.getByText(/grant microphone access to begin/i)).toBeInTheDocument();
  });

  it('requests microphone permission on start recording', async () => {
    const user = userEvent.setup();
    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    const startButton = screen.getByRole('button', { name: /start recording/i });
    await user.click(startButton);

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
        channelCount: 1,
      }
    });
  });

  it('shows recording controls when recording is active', async () => {
    const user = userEvent.setup();
    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /start recording/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause recording/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    });

    expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
    expect(screen.getByText(/recording in progress/i)).toBeInTheDocument();
  });

  it('displays recording duration timer', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    const startButton = screen.getByRole('button', { name: /start recording/i });
    await user.click(startButton);

    // Fast-forward 65 seconds
    jest.advanceTimersByTime(65000);

    await waitFor(() => {
      expect(screen.getByText('01:05')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('handles pause and resume recording', async () => {
    const user = userEvent.setup();
    mockMediaRecorder.state = 'recording';
    
    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    // Start recording first
    const startButton = screen.getByRole('button', { name: /start recording/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause recording/i })).toBeInTheDocument();
    });

    // Pause recording
    const pauseButton = screen.getByRole('button', { name: /pause recording/i });
    await user.click(pauseButton);

    expect(mockMediaRecorder.pause).toHaveBeenCalled();

    // Should show resume button
    mockMediaRecorder.state = 'paused';
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resume recording/i })).toBeInTheDocument();
    });

    // Resume recording
    const resumeButton = screen.getByRole('button', { name: /resume recording/i });
    await user.click(resumeButton);

    expect(mockMediaRecorder.resume).toHaveBeenCalled();
  });

  it('stops recording and calls completion callback', async () => {
    const user = userEvent.setup();
    mockMediaRecorder.state = 'recording';
    
    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /start recording/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    });

    // Stop recording
    const stopButton = screen.getByRole('button', { name: /stop recording/i });
    await user.click(stopButton);

    expect(mockMediaRecorder.stop).toHaveBeenCalled();
  });

  it('displays real-time transcription segments', async () => {
    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
        showLiveTranscription={true}
      />
    );

    // Simulate receiving a transcription segment
    const mockSegment = {
      id: '1',
      startTime: 0,
      endTime: 3,
      speakerId: 'speaker1',
      content: 'Selamat pagi, mari kita mulai meeting.',
      confidence: 0.95,
      isPartial: false
    };

    // This would be triggered by the onTranscriptionSegment callback
    expect(screen.getByText(/live transcription/i)).toBeInTheDocument();
  });

  it('shows audio level visualization', async () => {
    const user = userEvent.setup();
    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
        showAudioVisualization={true}
      />
    );

    const startButton = screen.getByRole('button', { name: /start recording/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument();
    });
  });

  it('handles microphone permission denied', async () => {
    const user = userEvent.setup();
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
      new Error('Permission denied')
    );

    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
      />
    );

    const startButton = screen.getByRole('button', { name: /start recording/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
      expect(screen.getByText(/microphone access denied/i)).toBeInTheDocument();
    });
  });

  it('displays speaker detection when enabled', async () => {
    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
        enableSpeakerDetection={true}
      />
    );

    expect(screen.getByText(/speaker detection enabled/i)).toBeInTheDocument();
  });

  it('allows microphone device selection', async () => {
    const user = userEvent.setup();
    (navigator.mediaDevices.enumerateDevices as jest.Mock).mockResolvedValueOnce([
      { deviceId: 'mic1', kind: 'audioinput', label: 'Built-in Microphone' },
      { deviceId: 'mic2', kind: 'audioinput', label: 'External USB Microphone' }
    ]);

    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
        allowDeviceSelection={true}
      />
    );

    const deviceSelect = screen.getByLabelText(/select microphone/i);
    expect(deviceSelect).toBeInTheDocument();

    await user.selectOptions(deviceSelect, 'mic2');
    
    // Verify device selection affects getUserMedia call
    const startButton = screen.getByRole('button', { name: /start recording/i });
    await user.click(startButton);

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        deviceId: { exact: 'mic2' },
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
        channelCount: 1,
      }
    });
  });

  it('provides keyboard shortcuts for recording control', async () => {
    const user = userEvent.setup();
    render(
      <LiveRecording
        onTranscriptionSegment={mockOnTranscriptionSegment}
        onRecordingComplete={mockOnRecordingComplete}
        onError={mockOnError}
        keyboardShortcuts={true}
      />
    );

    // Test spacebar for start/pause
    await user.keyboard(' ');
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();

    // Test Escape for stop
    mockMediaRecorder.state = 'recording';
    await user.keyboard('{Escape}');
    expect(mockMediaRecorder.stop).toHaveBeenCalled();
  });
});