import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gyalgypjtoiwktwcmaew.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5YWxneXBqdG9pd2t0d2NtYWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjgyNTgsImV4cCI6MjA3MzgwNDI1OH0.Dz0nnnfpJoz8PoIt4U757JGM1eJnJUluiwY7OoBL9iw';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);