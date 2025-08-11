import { supabase } from '../lib/supabase'

// Save a meeting to the database
export const saveMeeting = async (meetingData) => {
  try {
    console.log('🔐 Checking user authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Authentication error:', authError)
      throw new Error(`Authentication failed: ${authError.message}`)
    }
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    console.log('✅ User authenticated:', { userId: user.id, email: user.email })

    const meetingToSave = {
      user_id: user.id,
      title: meetingData.title || `Meeting ${new Date().toLocaleDateString('id-ID')}`,
      transcription: {
        segments: meetingData.segments || [],
        speakers: meetingData.speakers || []
      },
      summary: meetingData.summary || null,
      audio_duration: meetingData.audioDuration || 0,
      file_name: meetingData.fileName || null
    }

    console.log('📊 Meeting data to save:', {
      userId: meetingToSave.user_id,
      title: meetingToSave.title,
      segmentsCount: meetingToSave.transcription.segments.length,
      speakersCount: meetingToSave.transcription.speakers.length,
      hasSummary: !!meetingToSave.summary,
      audioDuration: meetingToSave.audio_duration
    })

    console.log('🏗️ Attempting to insert into Meetings table...')
    const { data, error } = await supabase
      .from('Meetings')
      .insert([meetingToSave])
      .select()

    if (error) {
      console.error('❌ Supabase database error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from database insert')
    }

    console.log('✅ Meeting saved successfully:', {
      id: data[0].id,
      title: data[0].title,
      createdAt: data[0].created_at
    })
    return data[0]
  } catch (error) {
    console.error('💥 Failed to save meeting:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    throw error
  }
}

// Load all meetings for the current user
export const loadUserMeetings = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('Meetings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading meetings:', error)
      throw error
    }

    console.log('Loaded meetings:', data)
    return data || []
  } catch (error) {
    console.error('Failed to load meetings:', error)
    throw error
  }
}

// Load a specific meeting by ID
export const loadMeetingById = async (meetingId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('Meetings')
      .select('*')
      .eq('id', meetingId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error loading meeting:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to load meeting:', error)
    throw error
  }
}

// Update a meeting
export const updateMeeting = async (meetingId, updates) => {
  try {
    console.log('🔐 Checking user authentication for update...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Authentication error:', authError)
      throw new Error(`Authentication failed: ${authError.message}`)
    }
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    console.log('✅ User authenticated for update:', { userId: user.id, meetingId })
    
    console.log('📝 Meeting updates to apply:', {
      meetingId,
      title: updates.title,
      hasTranscription: !!updates.transcription,
      hasSummary: !!updates.summary,
      segmentsCount: updates.transcription?.segments?.length || 0,
      speakersCount: updates.transcription?.speakers?.length || 0
    })

    console.log('🔄 Attempting to update meeting in database...')
    const { data, error } = await supabase
      .from('Meetings')
      .update(updates)
      .eq('id', meetingId)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('❌ Supabase update error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('No meeting found to update or no permission to update')
    }

    console.log('✅ Meeting updated successfully:', {
      id: data[0].id,
      title: data[0].title,
      updatedAt: data[0].updated_at || 'N/A'
    })
    return data[0]
  } catch (error) {
    console.error('💥 Failed to update meeting:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    throw error
  }
}

// Delete a meeting
export const deleteMeeting = async (meetingId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('Meetings')
      .delete()
      .eq('id', meetingId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting meeting:', error)
      throw error
    }

    console.log('Meeting deleted successfully')
    return true
  } catch (error) {
    console.error('Failed to delete meeting:', error)
    throw error
  }
}