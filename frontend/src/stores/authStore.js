import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)

  // Computed
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const userRole = computed(() => profile.value?.role || 'public')

  // Actions
  async function loadProfile() {
    if (!user.value) {
      profile.value = null
      return
    }

    try {
      console.log('Loading profile for user:', user.value.id)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      // Handle "no rows" error (profile doesn't exist)
      if (error && error.code === 'PGRST116') {
        console.warn('⚠️ No profile found for user, creating one:', user.value.id)
        
        // Try to create the profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.value.id,
            email: user.value.email,
            full_name: user.value.user_metadata?.full_name || '',
            role: 'user'
          })
          .select()
          .single()
        
        if (createError) {
          console.error('❌ Failed to create profile:', createError)
          // Clear user state
          user.value = null
          profile.value = null
          throw new Error('Failed to create user profile. Please try logging in again or contact support.')
        }
        
        profile.value = newProfile
        console.log('✓ Profile created successfully:', newProfile)
        return
      }
      
      if (error) {
        console.error('❌ Profile query error:', error)
        // Clear user state
        user.value = null
        profile.value = null
        throw new Error('Failed to load profile. Please try logging in again.')
      }
      
      if (!data) {
        console.warn('⚠️ No profile data returned for user:', user.value.id)
        // Clear user state
        user.value = null
        profile.value = null
        throw new Error('Profile not found. Please contact support.')
      }
      
      profile.value = data
      console.log('✓ Profile loaded successfully:', data)
    } catch (error) {
      console.error('Error loading profile:', error)
      profile.value = null
      user.value = null
      // Rethrow to be handled by calling function
      throw error
    }
  }

  async function signup(email, password, fullName) {
    loading.value = true
    try {
      console.log('Attempting signup for:', email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      console.log('Signup response:', { data, error })

      if (error) {
        console.error('Supabase signup error:', error)
        throw error
      }

      if (!data.user) {
        throw new Error('Signup failed: No user returned')
      }

      console.log('User created:', data.user.id, data.user.email)
      
      // Check if email already exists (Supabase security feature)
      // If identities array is empty, the email is already registered
      if (data.user.identities && data.user.identities.length === 0) {
        console.log('⚠️ Email already registered - identities array is empty')
        user.value = null
        profile.value = null
        throw new Error('This email is already registered. Please login instead.')
      }
      
      // Check if email confirmation is required
      // If session is null, it means email confirmation is enabled
      const needsConfirmation = data.session === null
      
      if (needsConfirmation) {
        console.log('⚠️ Email confirmation required - user NOT logged in automatically')
        // Do NOT set user.value - user must confirm email first
        user.value = null
        profile.value = null
        return { 
          user: data.user, 
          session: null, 
          needsConfirmation: true 
        }
      }
      
      // Email confirmation not required OR already confirmed
      console.log('✓ Email confirmed or confirmation disabled - logging in user')
      user.value = data.user
      
      // Try to load profile (it should be auto-created by trigger)
      await loadProfile()
      console.log('Profile loaded:', profile.value)
      
      return { 
        ...data, 
        needsConfirmation: false 
      }
    } catch (error) {
      console.error('Signup error:', error)
      user.value = null
      profile.value = null
      throw error
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    loading.value = true
    try {
      console.log('Attempting login for:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('Login response:', { user: data?.user?.email, error })

      if (error) {
        console.error('Supabase login error:', error)
        throw error
      }

      if (!data.user) {
        throw new Error('Login failed: No user returned')
      }

      user.value = data.user
      console.log('User logged in:', data.user.id, data.user.email)
      
      await loadProfile()
      console.log('Profile loaded after login:', profile.value)
      
      return data
    } catch (error) {
      console.error('Login error:', error)
      user.value = null
      profile.value = null
      throw error
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      user.value = null
      profile.value = null
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function checkAuth() {
    loading.value = true
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      user.value = currentUser
      if (currentUser) {
        try {
          await loadProfile()
        } catch (profileError) {
          console.error('Failed to load profile during auth check:', profileError)
          // If profile loading fails, clear everything and log out
          await supabase.auth.signOut()
          user.value = null
          profile.value = null
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
      user.value = null
      profile.value = null
    } finally {
      loading.value = false
    }
  }

  // Initialize auth state listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    user.value = session?.user || null
    if (session?.user) {
      await loadProfile()
    } else {
      profile.value = null
    }
  })

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    isAdmin,
    userRole,
    signup,
    login,
    logout,
    checkAuth
  }
})

