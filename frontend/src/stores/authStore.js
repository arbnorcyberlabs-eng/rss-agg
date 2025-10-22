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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      if (error) throw error
      profile.value = data
    } catch (error) {
      console.error('Error loading profile:', error)
      profile.value = null
    }
  }

  async function signup(email, password, fullName) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      if (error) throw error
      user.value = data.user
      await loadProfile()
      return data
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      user.value = data.user
      await loadProfile()
      return data
    } catch (error) {
      console.error('Login error:', error)
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

