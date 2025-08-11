const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://indonesian-meeting-transcription-*.vercel.app',
    /\.vercel\.app$/
  ]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple file upload setup
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Indonesian Meeting Transcription API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mock transcription endpoint
app.post('/api/transcribe', upload.single('audio'), (req, res) => {
  console.log('📝 Mock transcription request received');
  
  // Simulate processing delay
  setTimeout(() => {
    const mockTranscription = `
Selamat pagi semua, terima kasih sudah bergabung dalam meeting hari ini. 

Agenda hari ini adalah membahas strategi pemasaran untuk kuartal pertama 2024. Tim sales telah mempersiapkan laporan penjualan bulan lalu yang menunjukkan peningkatan 15% dibanding bulan sebelumnya.

Pak Budi akan mempresentasikan rencana ekspansi ke market Surabaya dan Medan. Bu Sarah akan menjelaskan strategi digital marketing yang baru, termasuk penggunaan social media dan SEO.

Tim produk juga akan sharing update fitur baru yang akan diluncurkan bulan depan. Target kita adalah meningkatkan customer acquisition sebesar 25% di Q1 ini.

Apakah ada pertanyaan atau masukan dari tim?

Baik, saya kira cukup untuk meeting hari ini. Terima kasih semua atas partisipasinya. Meeting selanjutnya akan kita adakan minggu depan di hari yang sama.
    `.trim();

    const mockSummary = `
**📋 RINGKASAN MEETING**

**📅 Tanggal:** ${new Date().toLocaleDateString('id-ID')}

**🎯 Agenda Utama:**
• Strategi pemasaran Q1 2024
• Laporan penjualan bulan lalu
• Rencana ekspansi regional
• Update produk dan fitur baru

**📈 Key Points:**
• Penjualan naik 15% bulan lalu
• Ekspansi ke Surabaya dan Medan
• Strategi digital marketing baru
• Target customer acquisition +25% di Q1

**👥 Tim yang Terlibat:**
• Pak Budi - Ekspansi regional
• Bu Sarah - Digital marketing
• Tim Produk - Update fitur

**🎯 Target & Goals:**
• Peningkatan customer acquisition 25%
• Peluncuran fitur baru bulan depan
• Implementasi strategi digital marketing

**📝 Action Items:**
• Follow up rencana ekspansi
• Finalisasi strategi digital marketing
• Persiapan peluncuran fitur baru

**📅 Next Meeting:** Minggu depan, hari yang sama
    `.trim();

    res.json({
      success: true,
      data: {
        transcription: mockTranscription,
        summary: mockSummary,
        language: 'id',
        duration: '12:34',
        wordCount: mockTranscription.split(' ').length,
        confidence: 0.95,
        metadata: {
          processingTime: '2.1s',
          model: 'whisper-large-v2 (mock)',
          timestamp: new Date().toISOString()
        }
      }
    });
  }, 2000); // 2 second delay to simulate processing
});

// Mock summary endpoint (for existing transcriptions)
app.post('/api/summarize', (req, res) => {
  console.log('📝 Mock summarization request received');
  
  const { transcription } = req.body;
  
  setTimeout(() => {
    const mockSummary = `
**📋 RINGKASAN MEETING**

**📅 Tanggal:** ${new Date().toLocaleDateString('id-ID')}

**🎯 Poin Utama:**
• Meeting membahas strategi bisnis dan operasional
• Tim berdiskusi tentang target dan pencapaian
• Ada pembahasan rencana pengembangan
• Review performa dan evaluasi

**📈 Key Insights:**
• Progres positif pada target yang ditetapkan
• Identifikasi area improvement
• Strategi untuk periode mendatang
• Kolaborasi tim yang efektif

**📝 Action Items:**
• Follow up pada item yang dibahas
• Koordinasi antar divisi
• Persiapan untuk meeting selanjutnya
• Implementasi strategi yang disepakati

**📅 Next Steps:** Monitoring dan evaluasi berkelanjutan
    `.trim();

    res.json({
      success: true,
      data: {
        summary: mockSummary,
        language: 'id',
        keyPoints: [
          'Strategi bisnis dan operasional',
          'Target dan pencapaian',
          'Rencana pengembangan',
          'Review performa'
        ],
        actionItems: [
          'Follow up item yang dibahas',
          'Koordinasi antar divisi',
          'Persiapan meeting selanjutnya'
        ],
        metadata: {
          processingTime: '1.3s',
          model: 'gpt-4o (mock)',
          timestamp: new Date().toISOString()
        }
      }
    });
  }, 1500);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'Terjadi kesalahan pada server'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'API endpoint tidak ditemukan'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Indonesian Meeting Transcription Mock API running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;