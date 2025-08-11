import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Auth from '../Auth/Auth'

const AuthWrapper = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if user is already logged in
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Listen for authentication state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // If no session, show login page
  if (!session) {
    return <Auth />
  }

  // If logged in, show the main app with user info
  return (
    <div className="authenticated-app">
      {/* Simple header with user info and logout */}
      <div className="auth-header">
        <div className="user-info">
          <span>Welcome, {user?.email}</span>
          <button onClick={handleSignOut} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
      
      {/* Render the main app */}
      {children}
    </div>
  )
}

export default AuthWrapper