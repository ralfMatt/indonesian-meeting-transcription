import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummaryPanel } from './SummaryPanel';
import { MeetingSummary, ActionItem, Decision } from '../../types/Meeting';

// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    text: jest.fn(),
    splitTextToSize: jest.fn().mockReturnValue(['mocked text']),
    addPage: jest.fn(),
    save: jest.fn(),
    internal: {
      pageSize: {
        getWidth: jest.fn().mockReturnValue(210),
        getHeight: jest.fn().mockReturnValue(297)
      }
    }
  }));
});

const mockSummary: MeetingSummary = {
  id: '1',
  meetingId: 'meeting-1',
  executiveSummary: 'Tim membahas proposal proyek baru dan menyetujui timeline pengembangan selama 6 bulan. Keputusan penting dibuat terkait alokasi sumber daya dan milestone utama.',
  actionItems: [
    {
      id: '1',
      description: 'Siapkan dokumen spesifikasi teknis',
      assignee: 'Budi Santoso',
      dueDate: new Date('2024-02-15'),
      priority: 'high',
      status: 'pending'
    },
    {
      id: '2',
      description: 'Review dan finalisasi anggaran proyek',
      assignee: 'Siti Nurhaliza',
      dueDate: new Date('2024-02-10'),
      priority: 'medium',
      status: 'in_progress'
    }
  ],
  keyPoints: [
    'Proyek dimulai Maret 2024',
    'Budget yang disetujui: Rp 500 juta',
    'Tim terdiri dari 5 developer dan 2 designer',
    'Metode pengembangan menggunakan Agile'
  ],
  decisions: [
    {
      id: '1',
      description: 'Menggunakan teknologi React untuk frontend',
      context: 'Diskusi tentang stack teknologi',
      impact: 'Mempercepat development dan maintenance',
      decidedBy: 'Technical Lead'
    },
    {
      id: '2',
      description: 'Meeting mingguan setiap Jumat jam 2 siang',
      context: 'Koordinasi tim reguler',
      impact: 'Meningkatkan komunikasi dan tracking progress',
      decidedBy: 'Project Manager'
    }
  ],
  generatedAt: new Date('2024-01-15T10:30:00Z')
};

describe('SummaryPanel Component', () => {
  const mockOnActionUpdate = jest.fn();
  const mockOnExport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders meeting summary with all sections', () => {
    render(
      <SummaryPanel
        summary={mockSummary}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText(/meeting summary/i)).toBeInTheDocument();
    expect(screen.getByText(/key points/i)).toBeInTheDocument();
    expect(screen.getByText(/decisions made/i)).toBeInTheDocument();
    
    expect(screen.getByText(/tim membahas proposal/i)).toBeInTheDocument();
  });

  it('displays action items in clean format', () => {
    render(
      <SummaryPanel
        summary={mockSummary}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText(/siapkan dokumen spesifikasi teknis/i)).toBeInTheDocument();
    expect(screen.getByText(/penanggung jawab: budi santoso/i)).toBeInTheDocument();
    expect(screen.getByText(/penanggung jawab: siti nurhaliza/i)).toBeInTheDocument();
  });

  it('displays action items status (editable functionality hidden)', () => {
    render(
      <SummaryPanel
        summary={mockSummary}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
        editable
      />
    );

    // The clean format shows action items without interactive status buttons
    expect(screen.getByText(/siapkan dokumen spesifikasi teknis/i)).toBeInTheDocument();
    expect(screen.getByText(/review dan finalisasi anggaran proyek/i)).toBeInTheDocument();
  });

  it('shows key points in an organized list', () => {
    render(
      <SummaryPanel
        summary={mockSummary}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText('Proyek dimulai Maret 2024')).toBeInTheDocument();
    expect(screen.getByText('Budget yang disetujui: Rp 500 juta')).toBeInTheDocument();
    expect(screen.getByText('Tim terdiri dari 5 developer dan 2 designer')).toBeInTheDocument();
    expect(screen.getByText('Metode pengembangan menggunakan Agile')).toBeInTheDocument();
  });

  it('displays decisions with context and impact', () => {
    render(
      <SummaryPanel
        summary={mockSummary}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText('Menggunakan teknologi React untuk frontend')).toBeInTheDocument();
    expect(screen.getByText('Diskusi tentang stack teknologi')).toBeInTheDocument();
    expect(screen.getByText('Mempercepat development dan maintenance')).toBeInTheDocument();
    expect(screen.getByText('Technical Lead')).toBeInTheDocument();
  });

  it('supports exporting summary as PDF', async () => {
    const user = userEvent.setup();
    render(
      <SummaryPanel
        summary={mockSummary}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
        exportable
      />
    );

    const exportButton = screen.getByRole('button', { name: /export summary/i });
    
    // Click should not fail due to jsPDF issues since we mocked it
    await user.click(exportButton);

    // The PDF generation happens internally, but onExport should still be called
    expect(mockOnExport).toHaveBeenCalledWith('pdf');
  });

  it('shows generation timestamp and meeting details', () => {
    render(
      <SummaryPanel
        summary={mockSummary}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText(/generated on/i)).toBeInTheDocument();
    expect(screen.getByText(/jan 15, 2024/i)).toBeInTheDocument();
  });

  it('handles empty action items gracefully', () => {
    const emptyActionsSummary = {
      ...mockSummary,
      actionItems: []
    };

    render(
      <SummaryPanel
        summary={emptyActionsSummary}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
      />
    );

    // With empty action items, the clean format just won't show the action items section
    expect(screen.getByText(/tim membahas proposal/i)).toBeInTheDocument();
    expect(screen.getByText('Key Points')).toBeInTheDocument();
  });

  it('provides accessibility features for screen readers', () => {
    render(
      <SummaryPanel
        summary={mockSummary}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByRole('region', { name: /meeting summary/i })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /key points/i })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /decisions/i })).toBeInTheDocument();
  });

  it('shows loading state during summary generation', () => {
    render(
      <SummaryPanel
        summary={null}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
        isGenerating
      />
    );

    expect(screen.getByText(/generating summary/i)).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });


  it('validates required props', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SummaryPanel
        summary={mockSummary}
        onActionUpdate={mockOnActionUpdate}
        onExport={mockOnExport}
      />
    );

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});