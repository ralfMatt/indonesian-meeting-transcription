import React, { useState, useEffect } from 'react'
import { loadUserMeetings, deleteMeeting } from '../../utils/meetingStorage'
import { supabase } from '../../lib/supabase'
import { 
  Mic, 
  FileText, 
  Calendar, 
  Clock, 
  Trash2, 
  Download,
  Plus,
  Building2,
  Search,
  Filter
} from 'lucide-react'
import './Dashboard.css'

const Dashboard = ({ onNewMeeting, onLoadMeeting }) => {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('all')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
    loadMeetings()
  }, [])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const userMeetings = await loadUserMeetings()
      setMeetings(userMeetings)
    } catch (error) {
      console.error('Failed to load meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMeeting = async (meetingId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus meeting ini?')) {
      try {
        await deleteMeeting(meetingId)
        setMeetings(prev => prev.filter(m => m.id !== meetingId))
      } catch (error) {
        console.error('Failed to delete meeting:', error)
        alert('Gagal menghapus meeting. Silakan coba lagi.')
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0 menit'
    const minutes = Math.round(seconds / 60)
    return `${minutes} menit`
  }

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.summary?.executiveSummary?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false

    const meetingDate = new Date(meeting.created_at)
    const now = new Date()
    
    switch (filterPeriod) {
      case 'today':
        return meetingDate.toDateString() === now.toDateString()
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return meetingDate >= weekAgo
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return meetingDate >= monthAgo
      default:
        return true
    }
  })

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Memuat riwayat meeting...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <Building2 size={32} className="company-icon" />
            <div className="welcome-text">
              <h1>Dashboard Meeting</h1>
              <p>Selamat datang kembali, {user?.email}</p>
            </div>
          </div>
          
          <button 
            onClick={onNewMeeting}
            className="new-meeting-btn"
          >
            <Plus size={20} />
            Meeting Baru
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-section">
        <div className="stat-card">
          <FileText size={24} />
          <div className="stat-info">
            <span className="stat-number">{meetings.length}</span>
            <span className="stat-label">Total Meeting</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Clock size={24} />
          <div className="stat-info">
            <span className="stat-number">
              {Math.round(meetings.reduce((total, m) => total + (m.audio_duration || 0), 0) / 60)}
            </span>
            <span className="stat-label">Menit Direkam</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Calendar size={24} />
          <div className="stat-info">
            <span className="stat-number">
              {meetings.filter(m => {
                const meetingDate = new Date(m.created_at)
                const now = new Date()
                return meetingDate.toDateString() === now.toDateString()
              }).length}
            </span>
            <span className="stat-label">Meeting Hari Ini</span>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="controls-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Cari meeting..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-box">
          <Filter size={20} />
          <select 
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value)}
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">30 Hari Terakhir</option>
          </select>
        </div>
      </div>

      {/* Meetings List */}
      <div className="meetings-section">
        <h2>Riwayat Meeting</h2>
        
        {filteredMeetings.length === 0 ? (
          <div className="empty-state">
            <Mic size={48} />
            <h3>Belum Ada Meeting</h3>
            <p>Mulai meeting pertama Anda untuk melihat riwayat di sini</p>
            <button onClick={onNewMeeting} className="btn-primary">
              <Plus size={20} />
              Buat Meeting Baru
            </button>
          </div>
        ) : (
          <div className="meetings-grid">
            {filteredMeetings.map((meeting) => (
              <div key={meeting.id} className="meeting-card">
                <div className="meeting-header">
                  <h3>{meeting.title}</h3>
                  <div className="meeting-actions">
                    <button
                      onClick={() => onLoadMeeting(meeting)}
                      className="action-btn load"
                      title="Buka Meeting"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className="action-btn delete"
                      title="Hapus Meeting"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="meeting-meta">
                  <div className="meta-item">
                    <Calendar size={14} />
                    {formatDate(meeting.created_at)}
                  </div>
                  <div className="meta-item">
                    <Clock size={14} />
                    {formatTime(meeting.created_at)} • {formatDuration(meeting.audio_duration)}
                  </div>
                </div>
                
                {meeting.summary?.executiveSummary && (
                  <div className="meeting-summary">
                    <p>{meeting.summary.executiveSummary.substring(0, 150)}...</p>
                  </div>
                )}
                
                <div className="meeting-stats">
                  <span className="stat-chip">
                    {meeting.transcription?.segments?.length || 0} segmen
                  </span>
                  <span className="stat-chip">
                    {meeting.summary?.actionItems?.length || 0} action items
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard