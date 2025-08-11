import React, { useState } from 'react'
import { Edit3, Check, X } from 'lucide-react'
import './MeetingTitle.css'

const MeetingTitle = ({ 
  title, 
  onTitleChange, 
  placeholder = "Nama Meeting",
  editable = true,
  showEditIcon = true 
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title || '')

  const handleStartEdit = () => {
    if (!editable) return
    setEditTitle(title || '')
    setIsEditing(true)
  }

  const handleSaveTitle = () => {
    const newTitle = editTitle.trim()
    if (newTitle) {
      onTitleChange(newTitle)
    } else {
      setEditTitle(title || '')
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(title || '')
    setIsEditing(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  if (isEditing) {
    return (
      <div className="meeting-title editing">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className="title-input"
          autoFocus
          maxLength={100}
        />
        <div className="title-actions">
          <button 
            onClick={handleSaveTitle}
            className="title-btn save"
            title="Simpan"
          >
            <Check size={16} />
          </button>
          <button 
            onClick={handleCancelEdit}
            className="title-btn cancel"
            title="Batal"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="meeting-title">
      <h2 
        className="title-text"
        onClick={editable ? handleStartEdit : undefined}
        title={editable ? "Klik untuk edit nama meeting" : ""}
      >
        {title || placeholder}
      </h2>
      {editable && showEditIcon && (
        <button 
          onClick={handleStartEdit}
          className="title-btn edit"
          title="Edit Nama Meeting"
        >
          <Edit3 size={16} />
        </button>
      )}
    </div>
  )
}

export default MeetingTitle