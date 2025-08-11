import React from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle,
  Loader,
  Lightbulb,
  Users,
  User,
  Clock
} from 'lucide-react';
import jsPDF from 'jspdf';
import { MeetingSummary, ActionItem } from '../../types/Meeting';
import './SummaryPanel.css';

interface SummaryPanelProps {
  summary: MeetingSummary | null;
  onActionUpdate?: (actionId: string, updates: Partial<ActionItem>) => void;
  onExport?: (format: 'pdf') => void; // Only PDF export
  editable?: boolean;
  exportable?: boolean;
  isGenerating?: boolean;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  summary,
  onActionUpdate,
  onExport,
  editable = false,
  exportable = false,
  isGenerating = false
}) => {


  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'No date';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch (error) {
      return 'Invalid date';
    }
  };


  const generatePDF = () => {
    if (!summary) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Meeting', margin, yPosition);
    yPosition += 15;

    // Date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal: ${formatDate(summary.generatedAt)}`, margin, yPosition);
    yPosition += 20;

    // Executive Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan:', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(summary.executiveSummary, maxWidth);
    doc.text(summaryLines, margin, yPosition);
    yPosition += summaryLines.length * 5 + 15;

    // Key Points
    if (summary.keyPoints && summary.keyPoints.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Poin Utama:', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      summary.keyPoints.forEach((point, index) => {
        const cleanPoint = point.replace(/^[🔸📌💬📝]\s*/, '');
        const pointLines = doc.splitTextToSize(`${index + 1}. ${cleanPoint}`, maxWidth - 10);
        
        // Check if we need a new page
        if (yPosition + pointLines.length * 5 > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.text(pointLines, margin + 5, yPosition);
        yPosition += pointLines.length * 5 + 5;
      });
      yPosition += 10;
    }

    // Action Items
    if (summary.actionItems && summary.actionItems.length > 0) {
      if (yPosition > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Tindak Lanjut:', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      summary.actionItems.forEach((item, index) => {
        const itemText = `• ${item.description}`;
        const assigneeText = item.assignee ? ` (Penanggung jawab: ${item.assignee})` : '';
        const fullText = itemText + assigneeText;
        
        const itemLines = doc.splitTextToSize(fullText, maxWidth - 10);
        
        // Check if we need a new page
        if (yPosition + itemLines.length * 5 > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.text(itemLines, margin + 5, yPosition);
        yPosition += itemLines.length * 5 + 5;
      });
      yPosition += 10;
    }

    // Decisions
    if (summary.decisions && summary.decisions.length > 0) {
      if (yPosition > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Keputusan:', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      summary.decisions.forEach((decision, index) => {
        const decisionLines = doc.splitTextToSize(`${index + 1}. ${decision.description}`, maxWidth - 10);
        
        // Check if we need a new page
        if (yPosition + decisionLines.length * 5 + 10 > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.text(decisionLines, margin + 5, yPosition);
        yPosition += decisionLines.length * 5;

        if (decision.decidedBy) {
          doc.setFont('helvetica', 'italic');
          doc.text(`Diputuskan oleh: ${decision.decidedBy}`, margin + 10, yPosition + 5);
          doc.setFont('helvetica', 'normal');
          yPosition += 10;
        }
        yPosition += 5;
      });
    }

    // Save the PDF
    const fileName = `ringkasan-meeting-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    // Call the original onExport if provided
    if (onExport) {
      onExport('pdf');
    }
  };

  if (isGenerating) {
    return (
      <div className="summary-panel generating">
        <div className="generating-state">
          <Loader size={48} className="generating-spinner" data-testid="loading-spinner" />
          <h3>Generating Summary</h3>
          <p>Analyzing transcription and extracting key insights...</p>
          <div className="generation-steps">
            <div className="step active">
              <CheckCircle size={16} />
              <span>Transcription complete</span>
            </div>
            <div className="step active">
              <Loader size={16} className="step-spinner" />
              <span>Identifying key points</span>
            </div>
            <div className="step">
              <Clock size={16} />
              <span>Extracting action items</span>
            </div>
            <div className="step">
              <Clock size={16} />
              <span>Generating summary</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="summary-panel empty">
        <div className="empty-state">
          <FileText size={64} className="empty-icon" />
          <h3>No Summary Available</h3>
          <p>Complete the transcription to generate a meeting summary</p>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-panel" role="region" aria-label="Meeting summary">
      <div className="summary-header">
        <div className="header-left">
          <h2>Meeting Summary</h2>
          <div className="summary-meta">
            <span className="generation-time">
              Generated on {formatDate(summary.generatedAt)}
            </span>
          </div>
        </div>

        <div className="header-controls">
          {exportable && (
            <button
              onClick={generatePDF}
              className="btn-primary"
              aria-label="Export summary as PDF"
            >
              <Download size={20} />
              Export Summary
            </button>
          )}
        </div>
      </div>

      <div className="summary-content">
        {/* Clean Simple Summary */}
        <section className="summary-section clean-summary">
          <div className="section-content">
            <div className="summary-paragraph">
              <p>{summary.executiveSummary}</p>
            </div>

            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <div className="key-points-clean">
                {summary.keyPoints.map((point, index) => (
                  <p key={index}>
                    <strong>{index + 1}.</strong> {point.replace(/^[🔸📌💬📝]\s*/, '')}
                  </p>
                ))}
              </div>
            )}

            {summary.actionItems && summary.actionItems.length > 0 && (
              <div className="action-items-clean">
                {summary.actionItems.map((item, index) => (
                  <p key={item.id}>
                    <strong>•</strong> {item.description}
                    {item.assignee && ` (Penanggung jawab: ${item.assignee})`}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>


        {/* Key Points */}
        <section className="summary-section key-points">
          <div className="section-header">
            <Lightbulb size={24} className="section-icon" />
            <h3>Key Points</h3>
          </div>
          <div className="section-content">
            {summary.keyPoints.length > 0 ? (
              <ul className="key-points-list" role="list" aria-label="Key points">
                {summary.keyPoints.map((point, index) => (
                  <li key={index} className="key-point">
                    <div className="key-point-marker" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-key-points">No key points identified</p>
            )}
          </div>
        </section>

        {/* Decisions Made */}
        <section className="summary-section decisions">
          <div className="section-header">
            <Users size={24} className="section-icon" />
            <h3>Decisions Made</h3>
          </div>
          <div className="section-content">
            {summary.decisions.length > 0 ? (
              <ul className="decisions-list" role="list" aria-label="Decisions">
                {summary.decisions.map(decision => (
                  <li key={decision.id} className="decision-item">
                    <div className="decision-header">
                      <h4 className="decision-title">{decision.description}</h4>
                      <div className="decision-context">
                        <span className="context-label">Context:</span>
                        <span>{decision.context}</span>
                      </div>
                    </div>
                    <div className="decision-details">
                      <div className="decision-impact">
                        <span className="impact-label">Impact:</span>
                        <span>{decision.impact}</span>
                      </div>
                      <div className="decision-maker">
                        <User size={16} />
                        <span>{decision.decidedBy}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-decisions">No specific decisions recorded</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};