import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import './Auth.css'

const Auth = () => {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        console.log('Attempting to sign up with:', email)
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: undefined // Disable email confirmation for testing
          }
        })
        
        if (error) {
          console.error('Signup error:', error)
          throw error
        }
        
        console.log('Signup response:', data)
        
        if (data.user && !data.session) {
          setMessage('Check your email for the confirmation link!')
        } else {
          setMessage('Account created successfully!')
        }
      } else {
        console.log('Attempting to sign in with:', email)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        })
        
        if (error) {
          console.error('Signin error:', error)
          throw error
        }
        
        console.log('Signin response:', data)
        setMessage('Logged in successfully!')
      }
    } catch (error) {
      console.error('Auth error details:', error)
      
      // Provide user-friendly error messages
      let userMessage = error.message
      if (error.message.includes('Failed to fetch')) {
        userMessage = 'Connection error. Please check your internet connection and try again.'
      } else if (error.message.includes('Invalid login credentials')) {
        userMessage = 'Email atau password salah. Silakan coba lagi.'
      } else if (error.message.includes('User already registered')) {
        userMessage = 'Email sudah terdaftar. Silakan gunakan email lain atau login.'
      }
      
      setMessage(userMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isSignUp ? 'Daftar Akun' : 'Masuk'}</h2>
        
        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password minimal 6 karakter"
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="auth-button"
          >
            {loading ? 'Loading...' : (isSignUp ? 'Daftar' : 'Masuk')}
          </button>
        </form>

        {message && (
          <div className={`message ${message.includes('error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <p className="switch-mode">
          {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="link-button"
          >
            {isSignUp ? 'Masuk di sini' : 'Daftar di sini'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default Auth