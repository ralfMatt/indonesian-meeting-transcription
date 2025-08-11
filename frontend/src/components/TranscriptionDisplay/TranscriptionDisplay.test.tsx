import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { TranscriptionSegment, SpeakerProfile } from '../../types/Meeting';

const mockSegments: TranscriptionSegment[] = [
  {
    id: '1',
    startTime: 0,
    endTime: 5,
    speakerId: 'speaker1',
    content: 'Selamat pagi semua, mari kita mulai rapat ini.',
    confidence: 0.95
  },
  {
    id: '2',
    startTime: 5,
    endTime: 12,
    speakerId: 'speaker2',
    content: 'Terima kasih. Hari ini kita akan membahas proposal proyek baru.',
    confidence: 0.92
  },
  {
    id: '3',
    startTime: 12,
    endTime: 18,
    speakerId: 'speaker1',
    content: 'Bagus, saya sudah menyiapkan dokumentasi lengkap untuk review.',
    confidence: 0.88
  }
];

const mockSpeakers: SpeakerProfile[] = [
  {
    id: 'speaker1',
    name: 'Budi Santoso',
    audioSignature: 'signature1',
    segmentCount: 2
  },
  {
    id: 'speaker2',
    name: 'Siti Nurhaliza',
    audioSignature: 'signature2',
    segmentCount: 1
  }
];

describe('TranscriptionDisplay Component', () => {
  const mockOnSpeakerUpdate = jest.fn();
  const mockOnSegmentEdit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders transcription segments with speaker information', () => {
    render(
      <TranscriptionDisplay
        segments={mockSegments}
        speakers={mockSpeakers}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
      />
    );

    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('Siti Nurhaliza')).toBeInTheDocument();
    expect(screen.getByText(/selamat pagi semua/i)).toBeInTheDocument();
    expect(screen.getByText(/proposal proyek baru/i)).toBeInTheDocument();
  });

  it('displays timestamps in readable format', () => {
    render(
      <TranscriptionDisplay
        segments={mockSegments}
        speakers={mockSpeakers}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
      />
    );

    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('00:05')).toBeInTheDocument();
    expect(screen.getByText('00:12')).toBeInTheDocument();
  });

  it('shows confidence scores with visual indicators', () => {
    render(
      <TranscriptionDisplay
        segments={mockSegments}
        speakers={mockSpeakers}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
      />
    );

    // High confidence (95%) should show green indicator
    const highConfidence = screen.getByTitle('Confidence: 95%');
    expect(highConfidence).toBeInTheDocument();
    expect(highConfidence).toHaveClass('confidence-high');

    // Medium confidence (88%) should show yellow indicator
    const mediumConfidence = screen.getByTitle('Confidence: 88%');
    expect(mediumConfidence).toBeInTheDocument();
    expect(mediumConfidence).toHaveClass('confidence-medium');
  });

  it('allows editing speaker names', async () => {
    const user = userEvent.setup();
    render(
      <TranscriptionDisplay
        segments={mockSegments}
        speakers={mockSpeakers}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
        editable
      />
    );

    const speakerName = screen.getByText('Budi Santoso');
    await user.click(speakerName);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'John Doe');
    await user.keyboard('{Enter}');

    expect(mockOnSpeakerUpdate).toHaveBeenCalledWith('speaker1', 'John Doe');
  });

  it('allows editing transcription content', async () => {
    const user = userEvent.setup();
    render(
      <TranscriptionDisplay
        segments={mockSegments}
        speakers={mockSpeakers}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
        editable
      />
    );

    const segment = screen.getByText(/selamat pagi semua/i);
    await user.click(segment);

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Selamat pagi, mari kita mulai meeting.');
    await user.keyboard('{Escape}');

    expect(mockOnSegmentEdit).toHaveBeenCalledWith('1', 'Selamat pagi, mari kita mulai meeting.');
  });

  it('supports search functionality', async () => {
    const user = userEvent.setup();
    render(
      <TranscriptionDisplay
        segments={mockSegments}
        speakers={mockSpeakers}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
        searchable
      />
    );

    const searchInput = screen.getByPlaceholderText(/search transcription/i);
    await user.type(searchInput, 'proposal');

    // Should highlight matching segments
    expect(screen.getByText(/proposal proyek baru/i)).toHaveClass('search-highlight');
  });

  it('displays real-time streaming updates', async () => {
    const { rerender } = render(
      <TranscriptionDisplay
        segments={[]}
        speakers={[]}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
        isStreaming
      />
    );

    expect(screen.getByText(/listening/i)).toBeInTheDocument();
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();

    // Add new segment
    const newSegments = [mockSegments[0]];
    rerender(
      <TranscriptionDisplay
        segments={newSegments}
        speakers={mockSpeakers}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
        isStreaming
      />
    );

    expect(screen.getByText(/selamat pagi semua/i)).toBeInTheDocument();
  });

  it('provides keyboard navigation for accessibility', async () => {
    const user = userEvent.setup();
    render(
      <TranscriptionDisplay
        segments={mockSegments}
        speakers={mockSpeakers}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
        editable
      />
    );

    // Tab through segments
    await user.tab();
    expect(screen.getByText(/selamat pagi semua/i).closest('.segment')).toHaveFocus();

    await user.tab();
    expect(screen.getByText(/proposal proyek baru/i).closest('.segment')).toHaveFocus();

    // Enter should start editing
    await user.keyboard('{Enter}');
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('exports transcription in various formats', async () => {
    const user = userEvent.setup();
    render(
      <TranscriptionDisplay
        segments={mockSegments}
        speakers={mockSpeakers}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
        exportable
      />
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    expect(screen.getByRole('menuitem', { name: /plain text/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /srt subtitles/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /json/i })).toBeInTheDocument();
  });

  it('handles empty state gracefully', () => {
    render(
      <TranscriptionDisplay
        segments={[]}
        speakers={[]}
        onSpeakerUpdate={mockOnSpeakerUpdate}
        onSegmentEdit={mockOnSegmentEdit}
      />
    );

    expect(screen.getByText(/no transcription available/i)).toBeInTheDocument();
    expect(screen.getByText(/upload audio file/i)).toBeInTheDocument();
  });
});