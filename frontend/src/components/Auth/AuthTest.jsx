import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'

const AuthTest = () => {
  const [testResult, setTestResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    setTestResult('Testing connection...')
    
    try {
      // Test basic connection
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        setTestResult(`Connection error: ${error.message}`)
      } else {
        setTestResult(`✅ Connection successful! Current session: ${data.session ? 'Logged in' : 'Not logged in'}`)
      }
    } catch (error) {
      setTestResult(`❌ Connection failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testSignup = async () => {
    setIsLoading(true)
    setTestResult('Testing signup...')
    
    try {
      const testEmail = `test${Date.now()}@example.com`
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'testpassword123',
      })
      
      if (error) {
        setTestResult(`❌ Signup failed: ${error.message}`)
      } else {
        setTestResult(`✅ Signup successful! User: ${data.user?.email}`)
      }
    } catch (error) {
      setTestResult(`❌ Signup error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h3>Supabase Connection Test</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <button onClick={testConnection} disabled={isLoading}>
          Test Connection
        </button>
        <button onClick={testSignup} disabled={isLoading} style={{ marginLeft: '10px' }}>
          Test Signup
        </button>
      </div>
      
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '4px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap'
      }}>
        {testResult || 'Click a button to test...'}
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <p>Supabase URL: {supabase.supabaseUrl}</p>
        <p>Project Reference: ngehcajfqsycoqmjzjbv</p>
      </div>
    </div>
  )
}

export default AuthTest