import { createClient } from '@supabase/supabase-js'

// Your Supabase project configuration
const supabaseUrl = 'https://ngehcajfqsycoqmjzjbv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZWhjYWpmcXN5Y29xbWp6amJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwOTI3MjAsImV4cCI6MjA2OTY2ODcyMH0.JRER1ucP4xgD3tJQZIyaCQUW59n-V-Lr2K3imcFhtB0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)