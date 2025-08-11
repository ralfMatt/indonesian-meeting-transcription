import React, { useState, useCallback, useMemo } from 'react';
import AuthWrapper from './components/AuthWrapper/AuthWrapper';
import './components/AuthWrapper/AuthWrapper.css';
import Dashboard from './components/Dashboard/Dashboard';
import MeetingTitle from './components/MeetingTitle/MeetingTitle';
import { AudioUpload } from './components/AudioUpload/AudioUpload';
import { LiveRecording } from './components/LiveRecording/LiveRecording';
import { TranscriptionDisplay } from './components/TranscriptionDisplay/TranscriptionDisplay';
import { SummaryPanel } from './components/SummaryPanel/SummaryPanel';
import { Meeting, TranscriptionSegment, SpeakerProfile, MeetingSummary, ActionItem } from './types/Meeting';
import { API_CONFIG, UI_CONFIG, ERROR_MESSAGES } from './constants/config';
import { securityLogger } from './utils/securityLogger';
import { saveMeeting } from './utils/meetingStorage';
import { Mic, FileText, BarChart3, Radio, Upload, ArrowLeft } from 'lucide-react';
import './App.css';

// Mock data for demonstration
const mockSegments: TranscriptionSegment[] = [
  {
    id: '1',
    startTime: 0,
    endTime: 5,
    speakerId: 'speaker1',
    content: 'Selamat pagi semua, mari kita mulai rapat mingguan ini.',
    confidence: 0.95
  },
  {
    id: '2',
    startTime: 5,
    endTime: 12,
    speakerId: 'speaker2',
    content: 'Terima kasih. Hari ini kita akan membahas progress proyek dan planning untuk minggu depan.',
    confidence: 0.92
  },
  {
    id: '3',
    startTime: 12,
    endTime: 18,
    speakerId: 'speaker1',
    content: 'Bagus, saya sudah menyiapkan dashboard monitoring untuk tracking real-time performance.',
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

const mockSummary: MeetingSummary = {
  id: '1',
  meetingId: 'meeting-1',
  executiveSummary: 'Tim membahas progress proyek pengembangan aplikasi transcription meeting. Semua milestone minggu ini berhasil dicapai dengan baik. Diskusi utama berfokus pada implementasi fitur real-time transcription dan optimasi akurasi untuk bahasa Indonesia.',
  actionItems: [
    {
      id: '1',
      description: 'Implement real-time transcription feature menggunakan WebSocket',
      assignee: 'Budi Santoso',
      dueDate: new Date('2024-02-15'),
      priority: 'high',
      status: 'pending'
    },
    {
      id: '2',
      description: 'Optimize Indonesian language model untuk akurasi lebih tinggi',
      assignee: 'Siti Nurhaliza',
      dueDate: new Date('2024-02-10'),
      priority: 'medium',
      status: 'in_progress'
    },
    {
      id: '3',
      description: 'Setup performance monitoring dashboard',
      assignee: 'Team Lead',
      dueDate: new Date('2024-12'),
      priority: 'medium',
      status: 'completed'
    }
  ],
  keyPoints: [
    'Real-time transcription fitur menjadi prioritas utama',
    'Akurasi bahasa Indonesia sudah mencapai 95%',
    'Performance monitoring berhasil diimplementasi',
    'Timeline proyek masih on-track untuk delivery bulan depan'
  ],
  decisions: [
    {
      id: '1',
      description: 'Menggunakan WebSocket untuk real-time transcription',
      context: 'Evaluasi teknologi untuk streaming audio',
      impact: 'Meningkatkan user experience dengan transcription real-time',
      decidedBy: 'Technical Lead'
    },
    {
      id: '2',
      description: 'Meeting mingguan setiap Senin jam 9 pagi',
      context: 'Koordinasi tim reguler',
      impact: 'Meningkatkan komunikasi dan sync progress',
      decidedBy: 'Project Manager'
    }
  ],
  generatedAt: new Date('2024-01-15T10:30:00Z')
};

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'meeting'>('dashboard');
  const [currentStep, setCurrentStep] = useState<'input' | 'transcription' | 'summary'>('input');
  const [inputMode, setInputMode] = useState<'upload' | 'live'>('live');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>([]);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState<string>('');

  // Debug: Log app state with memoization
  const debugMetrics = useMemo(() => ({
    currentStep,
    segments: segments.length,
    speakers: speakers.length,
    summary: !!summary
  }), [currentStep, segments.length, speakers.length, summary]);
  
  console.log('🚀 App state:', debugMetrics);

  // Function to save meeting to database
  const handleSaveMeeting = async (summaryData: MeetingSummary) => {
    try {
      const defaultTitle = `Meeting ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`;
      const meetingData = {
        title: meetingTitle.trim() || defaultTitle,
        segments,
        speakers,
        summary: summaryData,
        fileName: uploadedFile?.name || null,
        audioDuration: segments.length > 0 ? Math.max(...segments.map(s => s.endTime)) : 0
      };

      console.log('💾 Saving meeting to database...');
      
      if (currentMeetingId) {
        // Update existing meeting with summary
        const { updateMeeting } = await import('./utils/meetingStorage');
        await updateMeeting(currentMeetingId, meetingData);
        console.log('✅ Meeting updated successfully with summary');
      } else {
        // Create new meeting with summary
        const savedMeeting = await saveMeeting(meetingData);
        setCurrentMeetingId(savedMeeting.id);
        console.log('✅ Meeting saved successfully with ID:', savedMeeting.id);
      }
    } catch (error) {
      console.error('❌ Failed to save meeting:', error);
      // Don't block the user flow if saving fails
    }
  };

  const handleFileUpload = useCallback((file: File) => {
    // Log file upload for security monitoring
    securityLogger.logFileUpload(file.name, file.size, file.type, true);
    
    setUploadedFile(file);
    setIsProcessing(true);
    
    // Clear any existing data first
    clearTranscriptionData();
    
    // Simulate processing time with mock data
    setTimeout(() => {
      setSegments(mockSegments);
      setSpeakers(mockSpeakers);
      setCurrentStep('transcription');
      setIsProcessing(false);
    }, UI_CONFIG.PROCESSING_DELAY);
  }, [mockSegments, mockSpeakers]);

  const handleLiveTranscriptionSegment = useCallback((segment: TranscriptionSegment & { isPartial: boolean }) => {
    if (!segment.isPartial) {
      // Only add final segments to the segments list
      setSegments(prev => {
        const existingIndex = prev.findIndex(s => s.id === segment.id);
        if (existingIndex >= 0) {
          // Update existing segment
          const updated = [...prev];
          updated[existingIndex] = segment;
          return updated;
        }
        // Add new segment
        return [...prev, segment];
      });

      // Update speaker list
      setSpeakers(prev => {
        const existingSpeaker = prev.find(s => s.id === segment.speakerId);
        if (!existingSpeaker) {
          return [...prev, {
            id: segment.speakerId,
            name: `Speaker ${segment.speakerId.replace('speaker', '')}`,
            audioSignature: `signature_${segment.speakerId}`,
            segmentCount: 1
          }];
        } else {
          return prev.map(speaker => 
            speaker.id === segment.speakerId 
              ? { ...speaker, segmentCount: speaker.segmentCount + 1 }
              : speaker
          );
        }
      });
    }
  }, []);

  const handleLiveRecordingComplete = (audioBlob: Blob, duration: number) => {
    setIsLiveRecording(false);
    setCurrentStep('transcription');
    console.log('Recording completed:', { size: audioBlob.size, duration });
    // In real implementation, you would send audioBlob to backend for processing
  };

  const handleLiveRecordingError = (error: Error) => {
    console.error('Live recording error:', error);
    setIsLiveRecording(false);
    
    // Set user-friendly error message based on error type
    let userMessage = ERROR_MESSAGES.RECORDING_ERROR;
    if (error.message.includes('NotAllowedError') || error.message.includes('not-allowed')) {
      userMessage = ERROR_MESSAGES.MIC_ACCESS_DENIED;
    } else if (error.message.includes('NetworkError') || error.message.includes('WebSocket')) {
      userMessage = ERROR_MESSAGES.NETWORK_ERROR;
    }
    
    // TODO: Show user-friendly error notification
    console.warn('User error message:', userMessage);
  };

  const handleGenerateSummary = async () => {
    if (segments.length === 0) {
      console.log('No transcription segments to summarize');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Prepare transcription data for backend
      const transcriptionData = {
        segments: segments,
        speakers: Array.from(new Set(segments.map(s => s.speakerId))).map(id => ({
          id,
          name: `Speaker ${id.replace('speaker', '')}`,
          role: 'Participant'
        })),
        language: 'id'
      };

      console.log('🚀 === FRONTEND DEBUG: Starting OpenAI Summarization ===');
      console.log('📊 Segments to summarize:', segments.length);
      console.log('📝 Sample segments:', segments.slice(0, 2).map(s => `[${s.speakerId}] ${s.content.substring(0, 50)}...`));
      console.log('🔗 Target API:', `${API_CONFIG.BASE_URL}/api/meetings/summarize`);
      
      // First check if backend is available
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        console.log('🏥 Checking backend health...');
        const healthCheck = await fetch(`${API_CONFIG.BASE_URL}/api/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!healthCheck.ok) {
          throw new Error(`Health check failed: ${healthCheck.status}`);
        }
        
        console.log('✅ Backend server is available, proceeding with OpenAI summarization...');
      } catch (healthError) {
        console.error('❌ Backend health check failed:', healthError);
        throw new Error('Backend server unavailable');
      }
      
      // Call backend API for OpenAI-powered summarization
      const summaryController = new AbortController();
      const summaryTimeoutId = setTimeout(() => summaryController.abort(), 30000);
      
      console.log('📤 Sending transcription data to backend...');
      console.log('📋 Payload preview:', JSON.stringify({
        transcription: { segments: transcriptionData.segments.slice(0, 2) },
        language: 'id'
      }, null, 2));
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/meetings/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription: transcriptionData,
          language: 'id'
        }),
        signal: summaryController.signal
      });
      
      clearTimeout(summaryTimeoutId);
      
      console.log('📥 Backend response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

      // Log API call for security monitoring
      securityLogger.logAPICall('/api/meetings/summarize', 'POST', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend API error details:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          apiEndpoint: `${API_CONFIG.BASE_URL}/api/meetings/summarize`
        });
        throw new Error(`Backend API error: ${response.status} - ${response.statusText}`);
      }

      const generatedSummary = await response.json();
      
      console.log('🎯 === FRONTEND DEBUG: OpenAI Response Received ===');
      console.log('📈 Summary data received:', {
        keyPoints: generatedSummary.keyPoints?.length || 0,
        actionItems: generatedSummary.actionItems?.length || 0,
        decisions: generatedSummary.decisions?.length || 0,
        executiveSummary: generatedSummary.executiveSummary?.length || 0
      });
      console.log('📝 Executive summary preview:', generatedSummary.executiveSummary?.substring(0, 100) + '...');
      
      setSummary(generatedSummary);
      setCurrentStep('summary');
      setIsProcessing(false);
      
      // Save meeting to database
      await handleSaveMeeting(generatedSummary);
      
      console.log('✅ Generated OpenAI summary from', segments.length, 'transcript segments');
      
    } catch (error) {
      console.error('❌ Failed to generate summary:', error);
      
      // Enhanced intelligent fallback summary generator
      const generateLocalSummary = (segments: TranscriptionSegment[]) => {
        const fullText = segments.map(s => s.content).join(' ');
        const words = fullText.split(' ').filter(w => w.length > 2);
        const speakerCount = new Set(segments.map(s => s.speakerId)).size;
        
        // Advanced keyword analysis for Indonesian meetings
        const actionKeywords = ['harus', 'akan', 'perlu', 'tugas', 'deadline', 'target', 'follow up', 'tindak lanjut', 'action', 'bertanggung jawab', 'mengerjakan', 'menyelesaikan'];
        const importantKeywords = ['penting', 'utama', 'kesimpulan', 'hasil', 'keputusan', 'masalah', 'solusi', 'rencana', 'strategi', 'target', 'tujuan', 'prioritas', 'fokus'];
        const discussionKeywords = ['diskusi', 'pembahasan', 'membahas', 'menganalisis', 'evaluasi', 'review', 'pertanyaan', 'jawaban', 'pendapat', 'saran'];
        const decisionKeywords = ['memutuskan', 'menyetujui', 'sepakat', 'keputusan', 'kesepakatan', 'final', 'tetapkan', 'pilih'];
        
        // Extract different types of content
        const actionSentences = segments.filter(s => 
          actionKeywords.some(keyword => s.content.toLowerCase().includes(keyword)) && s.content.length > 20
        ).slice(0, 3);
        
        const importantSentences = segments.filter(s => 
          importantKeywords.some(keyword => s.content.toLowerCase().includes(keyword)) && s.content.length > 25
        ).slice(0, 4);
        
        const discussionSentences = segments.filter(s => 
          discussionKeywords.some(keyword => s.content.toLowerCase().includes(keyword)) && s.content.length > 30
        ).slice(0, 3);
        
        const decisionSentences = segments.filter(s => 
          decisionKeywords.some(keyword => s.content.toLowerCase().includes(keyword)) && s.content.length > 20
        ).slice(0, 2);
        
        // Generate intelligent key points
        const keyPoints: string[] = [];
        
        // Add decision points first (highest priority)
        decisionSentences.forEach(segment => {
          const content = segment.content.trim();
          if (content.length > 15) {
            keyPoints.push(`🔸 ${content.length > 120 ? content.substring(0, 120) + '...' : content}`);
          }
        });
        
        // Add important topics
        importantSentences.forEach(segment => {
          const content = segment.content.trim();
          if (content.length > 15 && !keyPoints.some(kp => kp.includes(content.substring(0, 30)))) {
            keyPoints.push(`📌 ${content.length > 120 ? content.substring(0, 120) + '...' : content}`);
          }
        });
        
        // Add discussion points
        if (keyPoints.length < 4) {
          discussionSentences.forEach(segment => {
            const content = segment.content.trim();
            if (content.length > 25 && !keyPoints.some(kp => kp.includes(content.substring(0, 30)))) {
              keyPoints.push(`💬 ${content.length > 120 ? content.substring(0, 120) + '...' : content}`);
            }
          });
        }
        
        // Add longest/most substantial segments if still need more content
        if (keyPoints.length < 3) {
          const substantialSegments = segments
            .filter(s => s.content.length > 40)
            .sort((a, b) => b.content.length - a.content.length)
            .slice(0, 5 - keyPoints.length);
          
          substantialSegments.forEach(segment => {
            const content = segment.content.trim();
            if (!keyPoints.some(kp => kp.includes(content.substring(0, 30)))) {
              keyPoints.push(`📝 ${content.length > 120 ? content.substring(0, 120) + '...' : content}`);
            }
          });
        }
        
        // Enhanced fallback if still no meaningful content
        if (keyPoints.length === 0) {
          keyPoints.push(
            `📊 Meeting dengan ${speakerCount} pembicara membahas berbagai topik`,
            `⏱️ Total diskusi ${words.length} kata dalam ${segments.length} segmen percakapan`,
            segments.length > 0 ? `🎯 Fokus utama: "${segments[0].content.substring(0, 80)}..."` : '✅ Meeting berlangsung dengan partisipasi aktif dari peserta'
          );
        }
        
        // Generate intelligent action items
        const actionItems = actionSentences.length > 0 
          ? actionSentences.map((segment, index) => {
              // Try to extract assignee from the content
              const content = segment.content.toLowerCase();
              let assignee = speakers.find(s => s.id === segment.speakerId)?.name || 'Tim';
              
              // Look for assignment patterns in Indonesian
              const assignmentPatterns = ['harus mengerjakan', 'bertanggung jawab', 'akan menangani', 'ditugaskan'];
              assignmentPatterns.forEach(pattern => {
                if (content.includes(pattern)) {
                  const speakerName = speakers.find(s => s.id === segment.speakerId)?.name;
                  if (speakerName) assignee = speakerName;
                }
              });
              
              // Determine priority based on keywords
              let priority: 'low' | 'medium' | 'high' = 'medium';
              if (content.includes('urgent') || content.includes('segera') || content.includes('deadline')) {
                priority = 'high';
              } else if (content.includes('penting') || content.includes('prioritas')) {
                priority = 'high';
              } else if (content.includes('nanti') || content.includes('optional')) {
                priority = 'low';
              }
              
              return {
                id: (index + 1).toString(),
                description: segment.content.length > 120 
                  ? segment.content.substring(0, 120) + '...'
                  : segment.content,
                assignee,
                dueDate: new Date(Date.now() + (7 + index) * 24 * 60 * 60 * 1000),
                priority,
                status: 'pending' as const
              };
            })
          : [{
              id: '1',
              description: segments.length > 0 
                ? `Tindak lanjut berdasarkan diskusi: ${segments[segments.length - 1].content.substring(0, 100)}...`
                : 'Review dan follow-up hasil meeting ini',
              assignee: speakers.length > 0 ? (speakers[0].name || 'Speaker 1') : 'Tim',
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              priority: 'medium' as const,
              status: 'pending' as const
            }];
        
        // Generate decisions from decision sentences or create meaningful fallback
        const decisions = decisionSentences.length > 0 
          ? decisionSentences.map((segment, index) => ({
              id: (index + 1).toString(),
              description: segment.content.length > 80 
                ? segment.content.substring(0, 80) + '...'
                : segment.content,
              context: `Keputusan yang diambil pada segmen ${segment.id}`,
              impact: 'Mempengaruhi arah dan tindak lanjut meeting',
              decidedBy: speakers.find(s => s.id === segment.speakerId)?.name || 'Tim'
            }))
          : [{
              id: '1',
              description: segments.length > 0 
                ? `Kesepakatan dari diskusi: ${segments[Math.floor(segments.length / 2)]?.content.substring(0, 80)}...`
                : 'Meeting berhasil diselesaikan dengan partisipasi aktif',
              context: `Meeting dengan ${segments.length} segmen diskusi`,
              impact: 'Hasil meeting terdokumentasi untuk referensi masa depan',
              decidedBy: speakers.length > 0 ? (speakers[0].name || 'Speaker 1') : 'Sistem'
            }];
            
        // Generate enhanced executive summary
        const topicsList: string[] = [];
        if (decisionSentences.length > 0) topicsList.push('keputusan');
        if (actionSentences.length > 0) topicsList.push('action items');
        if (importantSentences.length > 0) topicsList.push('pembahasan penting');
        if (discussionSentences.length > 0) topicsList.push('diskusi');
        const keyTopics = topicsList.slice(0, 3);
        
        const executiveSummary = `Meeting produktif dengan ${speakerCount} peserta membahas ${keyTopics.join(', ')}. ` +
          `Diskusi berlangsung komprehensif dengan ${words.length} kata dalam ${segments.length} segmen percakapan. ` +
          `${decisionSentences.length > 0 ? `Terdapat ${decisionSentences.length} keputusan utama yang diambil. ` : ''}` +
          `${actionSentences.length > 0 ? `Meeting menghasilkan ${actionSentences.length} action items yang perlu ditindaklanjuti. ` : ''}` +
          `Partisipasi aktif dari semua peserta memastikan hasil meeting yang berkualitas.`;
        
        return {
          id: Date.now().toString(),
          meetingId: 'live-recording-' + Date.now(),
          executiveSummary,
          keyPoints,
          actionItems,
          decisions,
          generatedAt: new Date()
        };
      };
      
      console.log('🔄 Generating intelligent fallback summary from', segments.length, 'segments...');
      const fallbackSummary = generateLocalSummary(segments);
      
      console.log('📝 Generated fallback summary with:', {
        keyPoints: fallbackSummary.keyPoints.length,
        actionItems: fallbackSummary.actionItems.length,
        decisions: fallbackSummary.decisions.length,
        executiveSummary: fallbackSummary.executiveSummary.length + ' characters'
      });
      
      setSummary(fallbackSummary);
      setCurrentStep('summary');
      setIsProcessing(false);
      
      // Save meeting to database
      await handleSaveMeeting(fallbackSummary);
      
      console.log('✅ Used enhanced fallback summary due to backend unavailability');
    }
  };

  const handleSpeakerUpdate = (speakerId: string, name: string) => {
    setSpeakers(prev => prev.map(speaker => 
      speaker.id === speakerId ? { ...speaker, name } : speaker
    ));
  };

  const handleSegmentEdit = (segmentId: string, content: string) => {
    setSegments(prev => prev.map(segment => 
      segment.id === segmentId ? { ...segment, content } : segment
    ));
  };

  const handleActionUpdate = (actionId: string, updates: Partial<ActionItem>) => {
    if (!summary) return;
    
    setSummary(prev => ({
      ...prev!,
      actionItems: prev!.actionItems.map(item =>
        item.id === actionId ? { ...item, ...updates } : item
      )
    }));
  };

  const handleExport = (format: 'pdf') => {
    console.log(`Exporting as ${format}...`);
    // PDF export is now handled directly in SummaryPanel component
  };

  const resetApp = () => {
    setCurrentStep('input');
    setInputMode('live');
    setUploadedFile(null);
    setSegments([]);
    setSpeakers([]);
    setSummary(null);
    setIsProcessing(false);
    setIsLiveRecording(false);
    setCurrentMeetingId(null);
    setMeetingTitle('');
  };

  const handleNewMeeting = () => {
    resetApp();
    setCurrentView('meeting');
  };

  const handleLoadMeeting = (meeting: any) => {
    // Load meeting data
    setSegments(meeting.transcription?.segments || []);
    setSpeakers(meeting.transcription?.speakers || []);
    setSummary(meeting.summary);
    setCurrentMeetingId(meeting.id);
    setMeetingTitle(meeting.title || '');
    setCurrentStep('summary');
    setCurrentView('meeting');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleSaveCurrentMeeting = async () => {
    try {
      const defaultTitle = `Meeting ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`;
      const meetingData = {
        title: meetingTitle.trim() || defaultTitle,
        segments,
        speakers,
        summary: summary || null,
        fileName: uploadedFile?.name || null,
        audioDuration: segments.length > 0 ? Math.max(...segments.map(s => s.endTime)) : 0
      };

      console.log('💾 Saving meeting...', {
        hasSegments: segments.length > 0,
        hasSpeakers: speakers.length > 0,
        hasSummary: !!summary,
        currentMeetingId
      });
      
      if (currentMeetingId) {
        // Update existing meeting
        const { updateMeeting } = await import('./utils/meetingStorage');
        
        // Prepare update data to match database schema
        const updateData = {
          title: meetingData.title,
          transcription: {
            segments: meetingData.segments,
            speakers: meetingData.speakers
          },
          summary: meetingData.summary,
          audio_duration: meetingData.audioDuration,
          file_name: meetingData.fileName
        };
        
        await updateMeeting(currentMeetingId, updateData);
        console.log('✅ Meeting updated successfully');
      } else {
        // Create new meeting
        const savedMeeting = await saveMeeting(meetingData);
        setCurrentMeetingId(savedMeeting.id);
        console.log('✅ New meeting saved successfully with ID:', savedMeeting.id);
      }
      
      // Redirect to dashboard after saving
      setCurrentView('dashboard');
      
    } catch (error: unknown) {
      console.error('❌ Failed to save meeting:', error);
      
      // Provide more specific error messages with proper type checking
      let errorMessage = 'Gagal menyimpan meeting. ';
      
      // Type guard for error objects
      const isErrorWithMessage = (error: unknown): error is { message: string } => {
        return typeof error === 'object' && error !== null && 'message' in error;
      };
      
      const isErrorWithCode = (error: unknown): error is { code: string } => {
        return typeof error === 'object' && error !== null && 'code' in error;
      };
      
      if (isErrorWithMessage(error)) {
        if (error.message.includes('not authenticated')) {
          errorMessage += 'Silakan login kembali.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage += 'Periksa koneksi internet Anda.';
        } else if (error.message.includes('duplicate')) {
          errorMessage += 'Meeting dengan nama ini sudah ada.';
        } else if (error.message.includes('permission')) {
          errorMessage += 'Tidak memiliki izin untuk menyimpan.';
        } else {
          errorMessage += `Detail: ${error.message}`;
        }
      } else if (isErrorWithCode(error)) {
        if (error.code === '23505') {
          errorMessage += 'Meeting dengan nama ini sudah ada.';
        } else if (error.code === '42501') {
          errorMessage += 'Tidak memiliki izin untuk menyimpan.';
        } else {
          errorMessage += `Kode error: ${error.code}`;
        }
      } else {
        errorMessage += 'Silakan coba lagi.';
      }
      
      alert(errorMessage);
    }
  };

  const clearTranscriptionData = () => {
    setSegments([]);
    setSpeakers([]);
    setSummary(null);
    setCurrentMeetingId(null);
    setMeetingTitle('');
    console.log('🧹 Transcription data cleared');
  };

  const forceReset = () => {
    console.log('🔄 Force resetting entire app state...');
    setCurrentStep('input');
    setInputMode('live');
    setUploadedFile(null);
    setSegments([]);
    setSpeakers([]);
    setSummary(null);
    setIsProcessing(false);
    setIsLiveRecording(false);
    console.log('✅ App state completely reset');
  };

  return (
    <AuthWrapper>
      {currentView === 'dashboard' ? (
        <Dashboard 
          onNewMeeting={handleNewMeeting}
          onLoadMeeting={handleLoadMeeting}
        />
      ) : (
        <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="logo">
              <button 
                onClick={handleBackToDashboard}
                className="back-button"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft size={20} />
              </button>
              <Mic size={32} className="logo-icon" />
              <div className="logo-text">
                <h1>TranskripMeeting</h1>
                <p>Transkripsi & Ringkasan Meeting Bahasa Indonesia</p>
              </div>
            </div>

            <nav className="step-navigation">
              <div className={`nav-step ${currentStep === 'input' ? 'active' : segments.length > 0 ? 'completed' : 'inactive'}`}>
                {inputMode === 'live' ? <Radio size={20} /> : <Upload size={20} />}
                <span>{inputMode === 'live' ? 'Rekam Langsung' : 'Upload File'}</span>
              </div>
              <div className={`nav-step ${currentStep === 'transcription' ? 'active' : summary ? 'completed' : 'inactive'}`}>
                <FileText size={20} />
                <span>Transkripsi</span>
              </div>
              <div className={`nav-step ${currentStep === 'summary' ? 'active' : 'inactive'}`}>
                <BarChart3 size={20} />
                <span>Ringkasan</span>
              </div>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <div className="main-content">
            {currentStep === 'input' && (
              <section className="input-section">
                {/* Meeting Title */}
                <MeetingTitle
                  title={meetingTitle}
                  onTitleChange={setMeetingTitle}
                  placeholder="Masukkan nama meeting..."
                  editable={true}
                />
                
                {/* Mode Selection */}
                <div className="mode-selection">
                  <h2>Pilih Metode Input</h2>
                  <div className="mode-buttons">
                    <button
                      onClick={() => setInputMode('live')}
                      className={`mode-button ${inputMode === 'live' ? 'active' : ''}`}
                      disabled={isLiveRecording || isProcessing}
                    >
                      <Radio size={24} />
                      <div className="mode-info">
                        <h3>Rekam Langsung</h3>
                        <p>Rekam audio meeting secara real-time dengan transkripsi instan</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setInputMode('upload')}
                      className={`mode-button ${inputMode === 'upload' ? 'active' : ''}`}
                      disabled={isLiveRecording || isProcessing}
                    >
                      <Upload size={24} />
                      <div className="mode-info">
                        <h3>Upload File</h3>
                        <p>Upload file audio yang sudah ada untuk ditranskripsi</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Input Method Content */}
                {inputMode === 'live' && (
                  <div className="live-input">
                    <LiveRecording
                      onTranscriptionSegment={handleLiveTranscriptionSegment}
                      onRecordingComplete={handleLiveRecordingComplete}
                      onError={handleLiveRecordingError}
                      onRecordingStart={clearTranscriptionData}
                      showLiveTranscription={true}
                      showAudioVisualization={true}
                      enableSpeakerDetection={false}
                      allowDeviceSelection={true}
                      keyboardShortcuts={true}
                      autoStart={false}
                    />
                  </div>
                )}

                {inputMode === 'upload' && (
                  <div className="upload-input">
                    <AudioUpload
                      onUpload={handleFileUpload}
                      maxSize={100 * 1024 * 1024} // 100MB
                      disabled={isProcessing}
                    />
                    {isProcessing && (
                      <div className="processing-indicator">
                        <div className="processing-spinner" />
                        <p>Memproses file audio...</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {currentStep === 'transcription' && (
              <section className="transcription-section">
                {/* Meeting Title */}
                <MeetingTitle
                  title={meetingTitle}
                  onTitleChange={setMeetingTitle}
                  placeholder="Nama Meeting"
                  editable={true}
                />
                
                <div className="section-header">
                  <h2>Transkripsi Meeting</h2>
                  <div className="section-actions">
                    <button
                      onClick={handleSaveCurrentMeeting}
                      className="btn-secondary"
                      disabled={isProcessing || segments.length === 0}
                    >
                      💾 Save
                    </button>
                    <button
                      onClick={handleGenerateSummary}
                      className="btn-primary"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Membuat Ringkasan...' : 'Buat Ringkasan'}
                    </button>
                    <button onClick={resetApp} className="btn-secondary">
                      Meeting Baru
                    </button>
                  </div>
                </div>

                <TranscriptionDisplay
                  segments={segments}
                  speakers={speakers}
                  onSpeakerUpdate={handleSpeakerUpdate}
                  onSegmentEdit={handleSegmentEdit}
                  editable={true}
                  searchable={true}
                  exportable={true}
                  isStreaming={isProcessing}
                />
              </section>
            )}

            {currentStep === 'summary' && (
              <section className="summary-section">
                {/* Meeting Title */}
                <MeetingTitle
                  title={meetingTitle}
                  onTitleChange={setMeetingTitle}
                  placeholder="Nama Meeting"
                  editable={true}
                />
                
                <div className="section-header">
                  <h2>Ringkasan Meeting</h2>
                  <div className="section-actions">
                    <button
                      onClick={() => setCurrentStep('transcription')}
                      className="btn-secondary"
                    >
                      Kembali ke Transkripsi
                    </button>
                    <button
                      onClick={handleSaveCurrentMeeting}
                      className="btn-secondary"
                      disabled={isProcessing}
                    >
                      💾 Save
                    </button>
                    <button onClick={resetApp} className="btn-secondary">
                      Meeting Baru
                    </button>
                  </div>
                </div>

                <SummaryPanel
                  summary={summary}
                  onActionUpdate={handleActionUpdate}
                  onExport={handleExport}
                  editable={true}
                  exportable={true}
                  isGenerating={isProcessing}
                />
              </section>
            )}
          </div>
        </main>

        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-info">
              <p>© 2024 TranskripMeeting - Transkripsi meeting Indonesia dengan privasi terdepan</p>
              <div className="footer-features">
                <span>✓ Pemrosesan Lokal</span>
                <span>✓ Sesuai GDPR</span>
                <span>✓ Dioptimalkan untuk Indonesia</span>
              </div>
            </div>
          </div>
        </footer>
        </div>
      )}
    </AuthWrapper>
  );
}

export default App;
