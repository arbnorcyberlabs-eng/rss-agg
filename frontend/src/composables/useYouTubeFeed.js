import { ref } from 'vue'

// YouTube RSS feed URL
const YOUTUBE_RSS_FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCc8q4B1bj-668LMHyNXnTxQ'

// Multiple CORS proxies with fallback
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/'
]

// Cache settings
const CACHE_KEY = 'youtube_feed_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get cached YouTube feed from localStorage
 * @returns {string|null} Cached feed data or null
 */
function getCachedFeed() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp

    if (age < CACHE_DURATION) {
      console.log('Using cached YouTube feed')
      return data
    }

    localStorage.removeItem(CACHE_KEY)
    return null
  } catch (e) {
    return null
  }
}

/**
 * Cache YouTube feed to localStorage
 * @param {string} data - Feed XML data to cache
 */
function cacheFeed(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (e) {
    console.warn('Failed to cache YouTube feed:', e)
  }
}

/**
 * Composable for fetching YouTube feed with CORS proxy fallback
 * @returns {Object} Composable API
 */
export function useYouTubeFeed() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Fetch YouTube feed with CORS proxy fallback
   * @param {boolean} forceUpdate - Force fetch ignoring cache
   * @returns {Promise<string>} Feed XML text
   */
  async function fetchYouTubeFeed(forceUpdate = false) {
    loading.value = true
    error.value = null

    try {
      // Check cache first
      if (!forceUpdate) {
        const cached = getCachedFeed()
        if (cached) {
          loading.value = false
          return cached
        }
      }

      // Try each proxy in order
      for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
          console.log(`Trying proxy ${i + 1}/${CORS_PROXIES.length}`)
          const proxyUrl = CORS_PROXIES[i] + encodeURIComponent(YOUTUBE_RSS_FEED)
          
          const response = await fetch(proxyUrl, {
            cache: forceUpdate ? 'reload' : 'default',
            signal: AbortSignal.timeout(10000) // 10 second timeout
          })

          if (response.ok) {
            const text = await response.text()
            cacheFeed(text)
            loading.value = false
            return text
          }
        } catch (err) {
          console.warn(`Proxy ${i + 1} failed:`, err.message)
          if (i === CORS_PROXIES.length - 1) {
            throw new Error('All proxies failed')
          }
        }
      }

      throw new Error('All proxies failed')
    } catch (err) {
      error.value = err.message
      loading.value = false
      throw err
    }
  }

  return {
    loading,
    error,
    fetchYouTubeFeed
  }
}

