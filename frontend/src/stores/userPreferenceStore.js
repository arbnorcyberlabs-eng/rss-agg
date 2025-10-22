import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  fetchUserPreferences, 
  toggleFeedPreference,
  initializeDefaultPreferences 
} from '../services/userPreferenceService'
import { useAuthStore } from './authStore'
import { useFeedStore } from './feedStore'

export const useUserPreferenceStore = defineStore('userPreferences', () => {
  const preferences = ref([])
  const loading = ref(false)
  const error = ref(null)

  const enabledFeedIds = computed(() => {
    return preferences.value
      .filter(p => p.enabled)
      .map(p => p.feed_id)
  })

  async function loadPreferences() {
    const authStore = useAuthStore()
    if (!authStore.user) {
      preferences.value = []
      return
    }

    loading.value = true
    error.value = null

    try {
      const data = await fetchUserPreferences(authStore.user.id)
      
      // If no preferences exist, initialize with all feeds enabled
      if (data.length === 0) {
        const feedStore = useFeedStore()
        await feedStore.loadFeeds()
        const feedIds = feedStore.feeds.map(f => f.id)
        const initialized = await initializeDefaultPreferences(authStore.user.id, feedIds)
        preferences.value = initialized
      } else {
        preferences.value = data
      }
    } catch (err) {
      error.value = err.message
      console.error('Error loading preferences:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function toggleFeed(feedId, enabled) {
    const authStore = useAuthStore()
    if (!authStore.user) return

    loading.value = true
    error.value = null

    try {
      const updated = await toggleFeedPreference(authStore.user.id, feedId, enabled)
      
      // Update local state
      const index = preferences.value.findIndex(p => p.feed_id === feedId)
      if (index !== -1) {
        preferences.value[index] = updated
      } else {
        preferences.value.push(updated)
      }
    } catch (err) {
      error.value = err.message
      console.error('Error toggling feed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function isFeedEnabled(feedId) {
    const pref = preferences.value.find(p => p.feed_id === feedId)
    return pref ? pref.enabled : true // Default to enabled if no preference
  }

  function clearPreferences() {
    preferences.value = []
  }

  return {
    preferences,
    loading,
    error,
    enabledFeedIds,
    loadPreferences,
    toggleFeed,
    isFeedEnabled,
    clearPreferences
  }
})

