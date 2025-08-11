import React, { useState, useRef, useEffect } from 'react';
import { Search, Edit3, Download, Play, Pause, Mic } from 'lucide-react';
import { TranscriptionSegment, SpeakerProfile } from '../../types/Meeting';
import './TranscriptionDisplay.css';

interface TranscriptionDisplayProps {
  segments: TranscriptionSegment[];
  speakers: SpeakerProfile[];
  onSpeakerUpdate?: (speakerId: string, name: string) => void;
  onSegmentEdit?: (segmentId: string, content: string) => void;
  editable?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  isStreaming?: boolean;
  currentTime?: number;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  segments,
  speakers,
  onSpeakerUpdate,
  onSegmentEdit,
  editable = false,
  searchable = false,
  exportable = false,
  isStreaming = false,
  currentTime = 0
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const transcriptionRef = useRef<HTMLDivElement>(null);

  // Create speaker lookup for quick access
  const speakerMap = speakers.reduce((acc, speaker) => {
    acc[speaker.id] = speaker;
    return acc;
  }, {} as Record<string, SpeakerProfile>);

  // Filter segments based on search
  const filteredSegments = segments.filter(segment =>
    segment.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-scroll to current segment when streaming
  useEffect(() => {
    if (isStreaming && transcriptionRef.current) {
      const currentSegment = segments.find(
        segment => currentTime >= segment.startTime && currentTime <= segment.endTime
      );
      if (currentSegment) {
        const segmentElement = document.getElementById(`segment-${currentSegment.id}`);
        if (segmentElement) {
          segmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, isStreaming, segments]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceClass = (confidence: number): string => {
    if (confidence >= 0.9) return 'confidence-high';
    if (confidence >= 0.7) return 'confidence-medium';
    return 'confidence-low';
  };

  const handleSpeakerEdit = (speakerId: string, newName: string) => {
    if (onSpeakerUpdate) {
      onSpeakerUpdate(speakerId, newName);
    }
    setEditingSpeaker(null);
  };

  const handleSegmentEdit = (segmentId: string, newContent: string) => {
    if (onSegmentEdit) {
      onSegmentEdit(segmentId, newContent);
    }
    setEditingSegment(null);
    setEditContent('');
  };

  const handleExport = (format: 'txt' | 'srt' | 'json') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'txt':
        content = segments
          .map(segment => {
            const speaker = speakerMap[segment.speakerId];
            return `[${formatTime(segment.startTime)}] ${speaker?.name || 'Unknown Speaker'}: ${segment.content}`;
          })
          .join('\n\n');
        filename = 'transcription.txt';
        mimeType = 'text/plain';
        break;

      case 'srt':
        content = segments
          .map((segment, index) => {
            const startTime = `${formatTime(segment.startTime)},000`;
            const endTime = `${formatTime(segment.endTime)},000`;
            return `${index + 1}\n${startTime} --> ${endTime}\n${segment.content}\n`;
          })
          .join('\n');
        filename = 'transcription.srt';
        mimeType = 'text/plain';
        break;

      case 'json':
        content = JSON.stringify({
          segments,
          speakers,
          exportedAt: new Date().toISOString()
        }, null, 2);
        filename = 'transcription.json';
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const highlightSearchTerm = (text: string): React.ReactNode => {
    if (!searchTerm) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  if (segments.length === 0 && !isStreaming) {
    return (
      <div className="transcription-empty">
        <div className="empty-state">
          <Mic size={64} className="empty-icon" />
          <h3>No Transcription Available</h3>
          <p>Upload an audio file to start transcription</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transcription-display" ref={transcriptionRef}>
      <div className="transcription-header">
        <div className="header-left">
          <h2>Meeting Transcription</h2>
          {isStreaming && (
            <div className="streaming-indicator" data-testid="streaming-indicator">
              <div className="pulse-dot" />
              <span>Listening...</span>
            </div>
          )}
        </div>

        <div className="header-controls">
          {searchable && (
            <div className="search-box">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search transcription..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          )}

          {exportable && (
            <div className="export-dropdown">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="btn-secondary"
                aria-haspopup="true"
                aria-expanded={showExportMenu}
              >
                <Download size={20} />
                Export
              </button>

              {showExportMenu && (
                <div className="export-menu" role="menu">
                  <button
                    onClick={() => handleExport('txt')}
                    className="export-option"
                    role="menuitem"
                  >
                    Plain Text (.txt)
                  </button>
                  <button
                    onClick={() => handleExport('srt')}
                    className="export-option"
                    role="menuitem"
                  >
                    SRT Subtitles (.srt)
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="export-option"
                    role="menuitem"
                  >
                    JSON Data (.json)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="transcription-content">
        {filteredSegments.map((segment) => {
          const speaker = speakerMap[segment.speakerId];
          const isCurrentSegment = currentTime >= segment.startTime && currentTime <= segment.endTime;

          return (
            <div
              key={segment.id}
              id={`segment-${segment.id}`}
              className={`segment ${isCurrentSegment ? 'current' : ''}`}
              tabIndex={editable ? 0 : -1}
              role={editable ? 'button' : undefined}
              onKeyDown={(e) => {
                if (editable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setEditingSegment(segment.id);
                  setEditContent(segment.content);
                }
              }}
            >
              <div className="segment-meta">
                <div className="speaker-info">
                  {editingSpeaker === segment.speakerId ? (
                    <input
                      type="text"
                      defaultValue={speaker?.name || `Speaker ${segment.speakerId}`}
                      onBlur={(e) => handleSpeakerEdit(segment.speakerId, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSpeakerEdit(segment.speakerId, (e.target as HTMLInputElement).value);
                        } else if (e.key === 'Escape') {
                          setEditingSpeaker(null);
                        }
                      }}
                      className="speaker-edit-input"
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`speaker-name ${editable ? 'editable' : ''}`}
                      onClick={() => editable && setEditingSpeaker(segment.speakerId)}
                      role={editable ? 'button' : undefined}
                      tabIndex={editable ? 0 : -1}
                    >
                      {speaker?.name || `Speaker ${segment.speakerId}`}
                    </span>
                  )}

                  {editable && editingSpeaker !== segment.speakerId && (
                    <Edit3 size={14} className="edit-icon" />
                  )}
                </div>

                <div className="segment-timing">
                  <span className="timestamp">{formatTime(segment.startTime)}</span>
                  <div
                    className={`confidence-indicator ${getConfidenceClass(segment.confidence)}`}
                    title={`Confidence: ${Math.round(segment.confidence * 100)}%`}
                  />
                </div>
              </div>

              <div className="segment-content">
                {editingSegment === segment.id ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onBlur={() => handleSegmentEdit(segment.id, editContent)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingSegment(null);
                        setEditContent('');
                      } else if (e.key === 'Enter' && e.ctrlKey) {
                        handleSegmentEdit(segment.id, editContent);
                      }
                    }}
                    className="segment-edit-textarea"
                    autoFocus
                    rows={3}
                  />
                ) : (
                  <p
                    className={`segment-text ${editable ? 'editable' : ''} ${searchTerm ? 'search-highlight' : ''}`}
                    onClick={() => {
                      if (editable) {
                        setEditingSegment(segment.id);
                        setEditContent(segment.content);
                      }
                    }}
                  >
                    {highlightSearchTerm(segment.content)}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="streaming-placeholder">
            <div className="pulse-wave">
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
            </div>
            <p>Processing audio...</p>
          </div>
        )}
      </div>

      {filteredSegments.length === 0 && searchTerm && (
        <div className="no-search-results">
          <p>No results found for "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className="btn-link">
            Clear search
          </button>
        </div>
      )}
    </div>
  );
};