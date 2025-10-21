import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  fetchFeeds,
  createFeed,
  updateFeed as updateFeedService,
  deleteFeed as deleteFeedService,
  toggleFeedStatus
} from '../services/feedService'

export const useFeedStore = defineStore('feeds', () => {
  // State
  const feeds = ref([])
  const currentFeed = ref('all')
  const loading = ref(false)
  const error = ref(null)
  const feedItems = ref([]) // Store the actual RSS feed items

  // Getters
  const enabledFeeds = computed(() => {
    return feeds.value.filter(feed => feed.enabled)
  })

  const scrapedFeeds = computed(() => {
    return feeds.value.filter(feed => feed.type === 'scraped')
  })

  const nativeFeeds = computed(() => {
    return feeds.value.filter(feed => feed.type === 'native_rss')
  })

  const feedById = computed(() => {
    return (id) => feeds.value.find(feed => feed.id === id)
  })

  // Actions
  async function loadFeeds() {
    loading.value = true
    error.value = null
    
    try {
      const data = await fetchFeeds()
      feeds.value = data
      return data
    } catch (err) {
      error.value = err.message
      console.error('Error loading feeds:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addFeed(feedData) {
    loading.value = true
    error.value = null
    
    try {
      const newFeed = await createFeed(feedData)
      feeds.value.push(newFeed)
      return newFeed
    } catch (err) {
      error.value = err.message
      console.error('Error adding feed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateFeed(id, updates) {
    loading.value = true
    error.value = null
    
    try {
      const updated = await updateFeedService(id, updates)
      const index = feeds.value.findIndex(f => f.id === id)
      if (index !== -1) {
        feeds.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err.message
      console.error('Error updating feed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteFeed(id) {
    loading.value = true
    error.value = null
    
    try {
      await deleteFeedService(id)
      feeds.value = feeds.value.filter(f => f.id !== id)
    } catch (err) {
      error.value = err.message
      console.error('Error deleting feed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function toggleFeed(id, enabled) {
    loading.value = true
    error.value = null
    
    try {
      const updated = await toggleFeedStatus(id, enabled)
      const index = feeds.value.findIndex(f => f.id === id)
      if (index !== -1) {
        feeds.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err.message
      console.error('Error toggling feed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function setCurrentFeed(feedId) {
    currentFeed.value = feedId
  }

  function setFeedItems(items) {
    feedItems.value = items
  }

  // Get filtered items based on current feed selection
  const currentFeedItems = computed(() => {
    if (currentFeed.value === 'all') {
      return feedItems.value
    }
    return feedItems.value.filter(item => item.feedId === currentFeed.value)
  })

  return {
    feeds,
    currentFeed,
    loading,
    error,
    feedItems,
    enabledFeeds,
    scrapedFeeds,
    nativeFeeds,
    feedById,
    currentFeedItems,
    loadFeeds,
    addFeed,
    updateFeed,
    deleteFeed,
    toggleFeed,
    setCurrentFeed,
    setFeedItems
  }
})

