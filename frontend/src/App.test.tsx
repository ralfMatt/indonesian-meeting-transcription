import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

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

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['audio content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('App Component', () => {
  beforeEach(() => {
    // Clear any timers
    jest.clearAllTimers();
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockMediaRecorder.state = 'inactive';
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders meeting transcription app header', () => {
    render(<App />);
    
    expect(screen.getByText('TranskripMeeting')).toBeInTheDocument();
    expect(screen.getByText('Transkripsi & Ringkasan Meeting Indonesia')).toBeInTheDocument();
  });

  it('renders step navigation with live recording as default', () => {
    render(<App />);
    
    expect(screen.getByText('Rekam Langsung')).toBeInTheDocument();
    expect(screen.getByText('Transkripsi')).toBeInTheDocument();
    expect(screen.getByText('Ringkasan')).toBeInTheDocument();
  });

  it('starts with input step active and live recording mode', () => {
    render(<App />);
    
    const inputStep = screen.getByText('Rekam Langsung').closest('.nav-step');
    expect(inputStep).toHaveClass('active');
    
    const transcriptionStep = screen.getByText('Transkripsi').closest('.nav-step');
    expect(transcriptionStep).toHaveClass('inactive');
  });

  it('displays mode selection with live recording and upload options', () => {
    render(<App />);
    
    expect(screen.getByText('Choose Input Method')).toBeInTheDocument();
    expect(screen.getByText('Live Recording')).toBeInTheDocument();
    expect(screen.getByText('Record meeting audio in real-time with instant transcription')).toBeInTheDocument();
    expect(screen.getByText('File Upload')).toBeInTheDocument();
    expect(screen.getByText('Upload an existing audio file for transcription')).toBeInTheDocument();
  });

  it('shows live recording interface by default', () => {
    render(<App />);
    
    expect(screen.getByText('Live Meeting Recording')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('can switch between live recording and file upload modes', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    
    // Initially shows live recording
    expect(screen.getByText('Live Meeting Recording')).toBeInTheDocument();
    
    // Switch to upload mode
    const uploadButton = screen.getByRole('button', { name: /file upload/i });
    await user.click(uploadButton);
    
    expect(screen.getByText('Upload Audio File')).toBeInTheDocument();
    expect(screen.getByText(/drag and drop audio file/i)).toBeInTheDocument();
    
    // Switch back to live recording
    const liveButton = screen.getByRole('button', { name: /live recording/i });
    await user.click(liveButton);
    
    expect(screen.getByText('Live Meeting Recording')).toBeInTheDocument();
  });

  it('processes file upload and moves to transcription step', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    
    // Switch to upload mode first
    const uploadModeButton = screen.getByRole('button', { name: /file upload/i });
    await user.click(uploadModeButton);
    
    const file = createMockFile('meeting.mp3', 1024 * 1024, 'audio/mp3');
    const input = screen.getByRole('button', { name: /upload audio file for transcription/i });
    
    // Create drag and drop event
    fireEvent.drop(input, {
      dataTransfer: {
        files: [file]
      }
    });
    
    expect(screen.getByText('Processing audio file...')).toBeInTheDocument();
    
    // Fast-forward timers to simulate processing
    jest.advanceTimersByTime(3000);
    
    await waitFor(() => {
      expect(screen.getByText('Meeting Transcription')).toBeInTheDocument();
    });
  });

  it('shows footer with privacy features', () => {
    render(<App />);
    
    expect(screen.getByText(/privacy-first indonesian meeting transcription/i)).toBeInTheDocument();
    expect(screen.getByText(/local processing/i)).toBeInTheDocument();
    expect(screen.getByText(/gdpr compliant/i)).toBeInTheDocument();
    expect(screen.getByText(/indonesian optimized/i)).toBeInTheDocument();
  });

  it('allows resetting to input step', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    
    // Switch to upload mode and upload file
    const uploadModeButton = screen.getByRole('button', { name: /file upload/i });
    await user.click(uploadModeButton);
    
    const file = createMockFile('meeting.mp3', 1024 * 1024, 'audio/mp3');
    const dropzone = screen.getByRole('button', { name: /upload audio file for transcription/i });
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });
    
    jest.advanceTimersByTime(3000);
    
    await waitFor(() => {
      expect(screen.getByText('Meeting Transcription')).toBeInTheDocument();
    });
    
    // Reset to start
    const newMeetingButton = screen.getByRole('button', { name: /new meeting/i });
    await user.click(newMeetingButton);
    
    expect(screen.getByText('Choose Input Method')).toBeInTheDocument();
    expect(screen.getByText('Live Meeting Recording')).toBeInTheDocument(); // Should default back to live mode
  });

  it('handles live recording workflow', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    
    // Should show live recording by default
    expect(screen.getByText('Live Meeting Recording')).toBeInTheDocument();
    
    // Start recording
    const startButton = screen.getByRole('button', { name: /start recording/i });
    await user.click(startButton);
    
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause recording/i })).toBeInTheDocument();
    });
  });
});
