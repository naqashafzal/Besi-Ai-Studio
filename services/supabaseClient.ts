import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwickgimfqpnasqytlya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3aWNrZ2ltZnFwbmFzcXl0bHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNjc1ODAsImV4cCI6MjA3Mzk0MzU4MH0.1NCceCyA5amzfAxm0BXf6F-6p-BbwEdiHRJv9hFVxf0';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);