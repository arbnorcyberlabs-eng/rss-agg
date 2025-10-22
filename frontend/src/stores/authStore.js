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

      if (error) {
        console.error('Profile query error:', error)
        throw error
      }
      
      if (!data) {
        console.warn('No profile found for user:', user.value.id)
        profile.value = null
        return
      }
      
      profile.value = data
      console.log('Profile loaded successfully:', data)
    } catch (error) {
      console.error('Error loading profile:', error)
      profile.value = null
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

      user.value = data.user
      console.log('User created:', data.user.id, data.user.email)
      
      // Try to load profile (it should be auto-created by trigger)
      await loadProfile()
      console.log('Profile loaded:', profile.value)
      
      return data
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
        await loadProfile()
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

