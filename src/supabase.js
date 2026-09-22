import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ubygqxrufpzlvsrdpunn.supabase.co";
// Paste your anon public key here (starts with eyJ...)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieWdxeHJ1ZnB6bHZzcmRwdW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MjAwMTIsImV4cCI6MjEwNTQ5NjAxMn0.IKP7KJvd1N9O9VPnJsuIJjLHBTTQm3yzVJlhyN4kUs8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Ensures the device has an active Supabase user session without overwriting restored accounts.
 */
export async function getOrCreateUserSession() {
  try {
    // 1. Check existing session first
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return session.user;
    }

    // 2. Check if auth user exists
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      return userData.user;
    }

    // 3. Fall back to anonymous session
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data?.user || null;
  } catch (err) {
    console.warn("Supabase session note:", err);
    return null;
  }
}

/**
 * Links an email address and password to the current anonymous account.
 */
export async function linkEmailToAccount(email, password) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      email: email,
      password: password
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Restores an existing account after browser cache or cookies are deleted.
 */
export async function restoreAccountWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: err.message };
  }
}