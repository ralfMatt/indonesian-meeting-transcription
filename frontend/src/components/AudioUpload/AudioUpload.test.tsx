import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioUpload } from './AudioUpload';

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['audio content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('AudioUpload Component', () => {
  const mockOnUpload = jest.fn();
  const mockOnProgress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload area with accessibility features', () => {
    render(<AudioUpload onUpload={mockOnUpload} onProgress={mockOnProgress} />);
    
    const dropzone = screen.getByRole('button', { name: /upload audio file/i });
    expect(dropzone).toBeInTheDocument();
    expect(dropzone).toHaveAttribute('aria-label');
    
    expect(screen.getByText(/drag and drop audio file/i)).toBeInTheDocument();
    expect(screen.getByText(/supported formats: mp3, wav, m4a/i)).toBeInTheDocument();
  });

  it('accepts valid audio files', async () => {
    const user = userEvent.setup();
    render(<AudioUpload onUpload={mockOnUpload} onProgress={mockOnProgress} />);
    
    const file = createMockFile('meeting.mp3', 1024 * 1024, 'audio/mp3');
    const input = screen.getByLabelText(/upload audio file/i);
    
    await user.upload(input, file);
    
    expect(mockOnUpload).toHaveBeenCalledWith(file);
  });

  it('rejects files that are too large', async () => {
    const user = userEvent.setup();
    render(<AudioUpload onUpload={mockOnUpload} onProgress={mockOnProgress} maxSize={1024} />);
    
    const largeFile = createMockFile('large.mp3', 2048, 'audio/mp3');
    const input = screen.getByLabelText(/upload audio file/i);
    
    await user.upload(input, largeFile);
    
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('rejects invalid file formats', async () => {
    const user = userEvent.setup();
    render(<AudioUpload onUpload={mockOnUpload} onProgress={mockOnProgress} />);
    
    const invalidFile = createMockFile('document.pdf', 1024, 'application/pdf');
    const input = screen.getByLabelText(/upload audio file/i);
    
    await user.upload(input, invalidFile);
    
    expect(screen.getByText(/invalid file format/i)).toBeInTheDocument();
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('shows upload progress', async () => {
    render(<AudioUpload onUpload={mockOnUpload} onProgress={mockOnProgress} />);
    
    // Simulate upload progress
    fireEvent(window, new CustomEvent('uploadProgress', { detail: { progress: 50 } }));
    
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('supports drag and drop functionality', async () => {
    render(<AudioUpload onUpload={mockOnUpload} onProgress={mockOnProgress} />);
    
    const dropzone = screen.getByRole('button');
    const file = createMockFile('meeting.wav', 1024, 'audio/wav');
    
    fireEvent.dragEnter(dropzone);
    expect(dropzone).toHaveClass('drag-active');
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });
    
    expect(mockOnUpload).toHaveBeenCalledWith(file);
  });

  it('provides keyboard accessibility', async () => {
    const user = userEvent.setup();
    render(<AudioUpload onUpload={mockOnUpload} onProgress={mockOnProgress} />);
    
    const dropzone = screen.getByRole('button');
    
    await user.tab();
    expect(dropzone).toHaveFocus();
    
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText(/upload audio file/i)).toBeInTheDocument();
  });
});