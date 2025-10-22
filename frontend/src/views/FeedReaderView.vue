<template>
  <div class="feed-reader">
    <Header />
    
    <!-- Show loading while auth is initializing -->
    <div v-if="authStore.loading" class="loading-container">
      <div class="loading-message">Initializing...</div>
    </div>
    
    <template v-else>
      <FeedSelector
        :current-feed="feedStore.currentFeed"
        :feed-options="feedOptions"
        :is-updating="isUpdating"
        :show-update="authStore.isAuthenticated"
        @feed-change="handleFeedChange"
        @update="handleUpdate"
      />

    <SearchBar
      v-if="authStore.isAuthenticated"
      :search-query="uiStore.searchQuery"
      :total-items="uiStore.currentItemRange.total"
      @search="uiStore.setSearch"
      @clear="uiStore.clearSearch"
    />

    <FeedList
      :items="displayItems"
      :is-authenticated="authStore.isAuthenticated"
      :loading="loading"
      :loading-message="loadingMessage"
      :current-page="uiStore.currentPage"
      :total-pages="uiStore.totalPages"
      @page-change="uiStore.setPage"
    />

    <SignupTeaser
      v-if="shouldShowTeaser"
      @signup="handleSignup"
      @login="handleLogin"
    />

      <Footer />
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUIStore } from '../stores/uiStore'
import { useFeedStore } from '../stores/feedStore'
import { useAuthStore } from '../stores/authStore'
import { useUserPreferenceStore } from '../stores/userPreferenceStore'
import { parseFeed } from '../services/xmlParser'
import { useYouTubeFeed } from '../composables/useYouTubeFeed'
import Header from '../components/common/Header.vue'
import Footer from '../components/common/Footer.vue'
import FeedSelector from '../components/FeedReader/FeedSelector.vue'
import SearchBar from '../components/FeedReader/SearchBar.vue'
import FeedList from '../components/FeedReader/FeedList.vue'
import SignupTeaser from '../components/FeedReader/SignupTeaser.vue'

export default {
  name: 'FeedReaderView',
  components: {
    Header,
    Footer,
    FeedSelector,
    SearchBar,
    FeedList,
    SignupTeaser
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const uiStore = useUIStore()
    const feedStore = useFeedStore()
    const authStore = useAuthStore()
    const userPrefStore = useUserPreferenceStore()
    const { fetchYouTubeFeed } = useYouTubeFeed()
    
    const loading = ref(false)
    const loadingMessage = ref('Loading...')
    const isUpdating = ref(false)
    
    // Get base URL from environment
    const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin + '/'
    
    const feedOptions = computed(() => {
      const options = [
        { id: 'all', name: 'All Feeds' }
      ]
      
      // Add options from database feeds
      feedStore.enabledFeeds.forEach(feed => {
        const shortName = feed.title
          .replace('Wikipedia — did you know?', 'Wikipedia')
          .replace('Wikivoyage recommendations', 'Wikivoyage')
          .replace('Hacker News - Front Page', 'Hacker News')
          .replace('Medium - Matteo\'s Articles', 'Medium')
          .replace('Economy Media YouTube Channel', 'Economy Media')
        
        options.push({
          id: feed.id,
          name: shortName
        })
      })
      
      return options
    })

    // Computed: items to display (limited for public users)
    const displayItems = computed(() => {
      const items = uiStore.paginatedItems
      if (!authStore.isAuthenticated) {
        return items.slice(0, 5)
      }
      return items
    })

    const shouldShowTeaser = computed(() => {
      return !authStore.isAuthenticated && uiStore.allItems.length > 5
    })
    
    async function loadAllFeeds(forceUpdate = false) {
      loading.value = true
      loadingMessage.value = 'Loading feeds...'
      
      try {
        console.log('=== LOADING ALL FEEDS ===')
        console.log('Authenticated:', authStore.isAuthenticated)
        console.log('Force Update:', forceUpdate)
        
        // Load feed configuration from Supabase
        await feedStore.loadFeeds()
        console.log(`Total feeds in database: ${feedStore.feeds.length}`)

        // Load user preferences if authenticated (only if not already loaded)
        let enabledFeedIds = []
        if (authStore.isAuthenticated) {
          // Only load preferences if they're not already loaded to prevent infinite loop
          if (userPrefStore.preferences.length === 0) {
            await userPrefStore.loadPreferences()
          }
          enabledFeedIds = userPrefStore.enabledFeedIds
          console.log(`User enabled feeds: ${enabledFeedIds.length}`, enabledFeedIds)
        }
        
        const allItems = []
        
        // Fetch scraped feeds (from XML files on GitHub Pages)
        // Filter by user preferences if authenticated
        const scrapedFeeds = feedStore.feeds.filter(f => {
          if (f.type !== 'scraped' || !f.enabled) return false
          
          // For authenticated users, check preferences
          if (authStore.isAuthenticated) {
            return enabledFeedIds.includes(f.id)
          }
          
          // For public users, show all enabled feeds
          return true
        })
        
        console.log(`Scraped feeds to load: ${scrapedFeeds.length}`, scrapedFeeds.map(f => f.id))
        
        for (const feed of scrapedFeeds) {
          try {
            loadingMessage.value = `Loading ${feed.title}...`
            const timestamp = forceUpdate ? `?t=${Date.now()}` : ''
            const feedUrl = `${baseUrl}${feed.id}.xml${timestamp}`
            
            console.log(`Fetching feed: ${feedUrl}`)
            const response = await fetch(feedUrl, {
              cache: forceUpdate ? 'reload' : 'default'
            })
            
            if (!response.ok) {
              console.warn(`❌ Failed to fetch ${feed.id}: ${response.status}`)
              continue
            }
            
            const xmlText = await response.text()
            const parsed = parseFeed(xmlText)
            
            // Add feedId to each item for filtering
            const items = parsed.items.map(item => ({
              ...item,
              feedId: feed.id,
              source: feed.title.split(' — ')[0].split(' - ')[0] // Get short source name
            }))
            
            allItems.push(...items)
            console.log(`✓ ${feed.id}: ${items.length} items (total so far: ${allItems.length})`)
          } catch (error) {
            console.error(`❌ Error loading feed ${feed.id}:`, error)
          }
        }
        
        // Fetch YouTube feed (native RSS with CORS proxy)
        // Filter by user preferences if authenticated
        const youtubeFeed = feedStore.feeds.find(f => {
          if (f.type !== 'native_rss' || !f.enabled || f.id !== 'youtube_economy') return false
          
          // For authenticated users, check preferences
          if (authStore.isAuthenticated) {
            return enabledFeedIds.includes(f.id)
          }
          
          // For public users, show if enabled
          return true
        })
        
        if (youtubeFeed) {
          console.log('Loading YouTube feed...')
          try {
            loadingMessage.value = 'Loading YouTube videos...'
            const youtubeXml = await fetchYouTubeFeed(forceUpdate)
            const parsed = parseFeed(youtubeXml)
            
            // Add feedId and override source for YouTube items
            const youtubeItems = parsed.items.map(item => ({
              ...item,
              feedId: 'youtube_economy',
              source: 'Economy Media YouTube'
            }))
            
            allItems.push(...youtubeItems)
            console.log(`✓ youtube_economy: ${youtubeItems.length} items (total: ${allItems.length})`)
          } catch (error) {
            console.warn('❌ YouTube feed failed, continuing without it:', error)
          }
        } else {
          console.log('YouTube feed not loaded (disabled or filtered out)')
        }
        
        // Sort by date (newest first)
        allItems.sort((a, b) => {
          const dateA = new Date(a.pubDate || 0)
          const dateB = new Date(b.pubDate || 0)
          return dateB - dateA
        })
        
        feedStore.setFeedItems(allItems)
        uiStore.setAllItems(allItems)
        
        console.log('=== FEED LOADING COMPLETE ===')
        console.log(`✓ Total items loaded: ${allItems.length}`)
        console.log(`✓ Feeds processed: ${scrapedFeeds.length} scraped + ${youtubeFeed ? 1 : 0} YouTube`)
        console.log(`✓ Items in uiStore.allItems: ${uiStore.allItems.length}`)
        console.log(`✓ Items per page: ${uiStore.itemsPerPage}`)
        console.log(`✓ Total pages: ${uiStore.totalPages}`)
        console.log(`✓ Current page: ${uiStore.currentPage}`)
        console.log(`✓ Paginated items (current page): ${uiStore.paginatedItems.length}`)
        console.log(`✓ Display items (after public limit): ${displayItems.value.length}`)
        
      } catch (error) {
        console.error('Error loading feeds:', error)
        
        // Fallback to test data if production feeds fail
        const testItems = [
          // Wikipedia "Did you know?" items (5 items)
          {
            feedId: 'funfacts',
            title: '...that the first documented use of a smiley emoticon was in 1648?',
            link: 'https://en.wikipedia.org/wiki/Smiley',
            content: 'The smiley face has become one of the most recognizable symbols in modern communication.',
            pubDate: new Date().toISOString(),
            source: 'Wikipedia'
          },
          {
            feedId: 'funfacts',
            title: '...that octopuses have three hearts and blue blood?',
            link: 'https://en.wikipedia.org/wiki/Octopus',
            content: 'Octopuses are among the most intelligent invertebrates, with complex nervous systems.',
            pubDate: new Date(Date.now() - 1800000).toISOString(),
            source: 'Wikipedia'
          },
          {
            feedId: 'funfacts',
            title: '...that honey never spoils and can last thousands of years?',
            link: 'https://en.wikipedia.org/wiki/Honey',
            content: 'Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still perfectly edible.',
            pubDate: new Date(Date.now() - 3600000).toISOString(),
            source: 'Wikipedia'
          },
          {
            feedId: 'funfacts',
            title: '...that bananas are berries, but strawberries are not?',
            link: 'https://en.wikipedia.org/wiki/Berry',
            content: 'In botanical terms, a berry is a fruit produced from a single flower with one ovary.',
            pubDate: new Date(Date.now() - 5400000).toISOString(),
            source: 'Wikipedia'
          },
          {
            feedId: 'funfacts',
            title: '...that the Eiffel Tower can grow over 6 inches in summer?',
            link: 'https://en.wikipedia.org/wiki/Eiffel_Tower',
            content: 'The iron structure expands when heated by the sun, causing the tower to grow taller.',
            pubDate: new Date(Date.now() - 7200000).toISOString(),
            source: 'Wikipedia'
          },
          
          // Hacker News items (5 items)
          {
            feedId: 'hackernews',
            title: 'Ask HN: What are you working on this month?',
            link: 'https://news.ycombinator.com/item?id=123',
            content: 'Monthly thread for sharing projects and getting feedback from the community.',
            pubDate: new Date(Date.now() - 9000000).toISOString(),
            source: 'Hacker News'
          },
          {
            feedId: 'hackernews',
            title: 'Show HN: RSS Feed Aggregator with Supabase',
            link: 'https://news.ycombinator.com/item?id=124',
            content: 'Built a modern RSS aggregator using Vue 3 and Supabase for dynamic feed management.',
            pubDate: new Date(Date.now() - 10800000).toISOString(),
            source: 'Hacker News'
          },
          {
            feedId: 'hackernews',
            title: 'The State of WebAssembly in 2024',
            link: 'https://news.ycombinator.com/item?id=125',
            content: 'A comprehensive overview of WebAssembly adoption and future developments.',
            pubDate: new Date(Date.now() - 12600000).toISOString(),
            source: 'Hacker News'
          },
          {
            feedId: 'hackernews',
            title: 'Why SQLite is so great for embedded applications',
            link: 'https://news.ycombinator.com/item?id=126',
            content: 'Discussion on the benefits of using SQLite for local-first applications.',
            pubDate: new Date(Date.now() - 14400000).toISOString(),
            source: 'Hacker News'
          },
          {
            feedId: 'hackernews',
            title: 'Ask HN: Best resources for learning system design?',
            link: 'https://news.ycombinator.com/item?id=127',
            content: 'Community recommendations for mastering distributed systems and architecture.',
            pubDate: new Date(Date.now() - 16200000).toISOString(),
            source: 'Hacker News'
          },
          
          // YouTube videos (4 items)
          {
            feedId: 'youtube_economy',
            title: 'Economy Media: Understanding Market Trends 2024',
            link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            content: 'In-depth analysis of current market trends and economic indicators for the upcoming quarter.',
            pubDate: new Date(Date.now() - 18000000).toISOString(),
            source: 'Economy Media YouTube',
            thumbnailUrl: 'https://via.placeholder.com/320x180/000000/FFFFFF/?text=Market+Trends',
            views: 45823
          },
          {
            feedId: 'youtube_economy',
            title: 'Economy Media: Tech Industry Report',
            link: 'https://www.youtube.com/watch?v=abc123',
            content: 'Latest developments in the technology sector and their economic impact.',
            pubDate: new Date(Date.now() - 19800000).toISOString(),
            source: 'Economy Media YouTube',
            thumbnailUrl: 'https://via.placeholder.com/320x180/0066cc/FFFFFF/?text=Tech+Report',
            views: 32145
          },
          {
            feedId: 'youtube_economy',
            title: 'Economy Media: Global Trade Analysis',
            link: 'https://www.youtube.com/watch?v=xyz789',
            content: 'Examining the impact of recent trade policies on international markets.',
            pubDate: new Date(Date.now() - 21600000).toISOString(),
            source: 'Economy Media YouTube',
            thumbnailUrl: 'https://via.placeholder.com/320x180/ff6600/FFFFFF/?text=Global+Trade',
            views: 28934
          },
          {
            feedId: 'youtube_economy',
            title: 'Economy Media: Cryptocurrency Market Update',
            link: 'https://www.youtube.com/watch?v=crypto123',
            content: 'Weekly review of cryptocurrency trends and blockchain technology developments.',
            pubDate: new Date(Date.now() - 23400000).toISOString(),
            source: 'Economy Media YouTube',
            thumbnailUrl: 'https://via.placeholder.com/320x180/4CAF50/FFFFFF/?text=Crypto+Market',
            views: 52147
          },
          
          // Medium articles (5 items)
          {
            feedId: 'medium_matteo',
            title: 'Building Scalable Web Applications with Vue 3',
            link: 'https://medium.com/@matteo28/vue3-scalable',
            content: 'Learn how to architect Vue 3 applications that can scale from prototype to production with best practices and real-world examples.',
            pubDate: new Date(Date.now() - 25200000).toISOString(),
            source: 'Medium'
          },
          {
            feedId: 'medium_matteo',
            title: 'The Power of Supabase for Modern Apps',
            link: 'https://medium.com/@matteo28/supabase-power',
            content: 'Exploring Supabase as a backend solution: real-time capabilities, authentication, and database management.',
            pubDate: new Date(Date.now() - 27000000).toISOString(),
            source: 'Medium'
          },
          {
            feedId: 'medium_matteo',
            title: 'Mastering Pinia State Management in Vue 3',
            link: 'https://medium.com/@matteo28/pinia-state',
            content: 'A deep dive into Pinia, the intuitive state management library for Vue applications.',
            pubDate: new Date(Date.now() - 28800000).toISOString(),
            source: 'Medium'
          },
          {
            feedId: 'medium_matteo',
            title: 'Modern CSS Techniques for 2024',
            link: 'https://medium.com/@matteo28/modern-css',
            content: 'Exploring container queries, cascade layers, and other cutting-edge CSS features.',
            pubDate: new Date(Date.now() - 30600000).toISOString(),
            source: 'Medium'
          },
          {
            feedId: 'medium_matteo',
            title: 'TypeScript Best Practices for Large Projects',
            link: 'https://medium.com/@matteo28/typescript-best',
            content: 'Essential patterns and practices for maintaining type safety in enterprise applications.',
            pubDate: new Date(Date.now() - 32400000).toISOString(),
            source: 'Medium'
          },
          
          // Wikivoyage entries (5 items)
          {
            feedId: 'wikivoyage',
            title: 'Paris: The City of Light',
            link: 'https://en.wikivoyage.org/wiki/Paris',
            content: 'Discover the romantic capital of France with its iconic monuments, world-class museums, and charming cafés.',
            pubDate: new Date(Date.now() - 34200000).toISOString(),
            source: 'Wikivoyage'
          },
          {
            feedId: 'wikivoyage',
            title: 'Tokyo: Where Tradition Meets Future',
            link: 'https://en.wikivoyage.org/wiki/Tokyo',
            content: 'Experience the vibrant metropolis that seamlessly blends ancient temples with cutting-edge technology.',
            pubDate: new Date(Date.now() - 36000000).toISOString(),
            source: 'Wikivoyage'
          },
          {
            feedId: 'wikivoyage',
            title: 'Barcelona: Architecture and Mediterranean Beauty',
            link: 'https://en.wikivoyage.org/wiki/Barcelona',
            content: 'Explore Gaudí\'s masterpieces, enjoy tapas, and relax on beautiful beaches in Catalonia\'s capital.',
            pubDate: new Date(Date.now() - 37800000).toISOString(),
            source: 'Wikivoyage'
          },
          {
            feedId: 'wikivoyage',
            title: 'Iceland: Land of Fire and Ice',
            link: 'https://en.wikivoyage.org/wiki/Iceland',
            content: 'Witness the Northern Lights, explore volcanic landscapes, and soak in geothermal hot springs.',
            pubDate: new Date(Date.now() - 39600000).toISOString(),
            source: 'Wikivoyage'
          },
          {
            feedId: 'wikivoyage',
            title: 'New York City: The Big Apple',
            link: 'https://en.wikivoyage.org/wiki/New_York_City',
            content: 'From Times Square to Central Park, discover the city that never sleeps.',
            pubDate: new Date(Date.now() - 41400000).toISOString(),
            source: 'Wikivoyage'
          }
        ]
        
        feedStore.setFeedItems(testItems)
        uiStore.setAllItems(testItems)
        console.log('⚠ Using fallback test data:', testItems.length, 'items')
      } finally {
        loading.value = false
      }
    }
    
    function handleFeedChange(feedId) {
      feedStore.setCurrentFeed(feedId)
      
      // Filter items based on selected feed
      const filteredItems = feedId === 'all' 
        ? feedStore.feedItems 
        : feedStore.feedItems.filter(item => item.feedId === feedId)
      
      uiStore.setAllItems(filteredItems)
      console.log(`Switched to feed: ${feedId}, showing ${filteredItems.length} items`)
    }
    
    async function handleUpdate() {
      isUpdating.value = true
      try {
        await loadAllFeeds(true) // Force update, bypass cache
      } finally {
        isUpdating.value = false
      }
    }

    function handleSignup() {
      router.push('/auth')
    }

    function handleLogin() {
      router.push('/auth')
    }
    
    onMounted(async () => {
      // Wait for auth to complete before loading feeds
      if (authStore.loading) {
        // Wait for auth loading to finish
        const unwatch = watch(() => authStore.loading, (loading) => {
          if (!loading) {
            unwatch()
            loadAllFeeds()
          }
        })
      } else {
        loadAllFeeds()
      }
    })
    
    // Watch for navigation - reload feeds when returning from preferences
    let previousPath = ref(route.path)
    watch(
      () => route.path,
      (newPath) => {
        if (previousPath.value === '/preferences' && newPath === '/') {
          console.log('🔄 Returning from preferences page, reloading feeds with updated preferences')
          loadAllFeeds(true) // Force reload to apply preference changes
        }
        previousPath.value = newPath
      }
    )
    
    // Watch for preference changes (deep watch) - now safe from infinite loop
    watch(
      () => userPrefStore.preferences,
      (newPrefs, oldPrefs) => {
        // Only reload if preferences actually changed and we're on the home page
        if (route.path === '/' && oldPrefs && oldPrefs.length > 0) {
          console.log('🔄 User preferences changed, reloading feeds')
          loadAllFeeds(true)
        }
      },
      { deep: true }
    )
    
    return {
      uiStore,
      feedStore,
      authStore,
      feedOptions,
      loading,
      loadingMessage,
      isUpdating,
      displayItems,
      shouldShowTeaser,
      handleFeedChange,
      handleUpdate,
      handleSignup,
      handleLogin
    }
  }
}
</script>

<style scoped>
.feed-reader {
  width: 100%;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 40px 20px;
}

.loading-message {
  font-size: 1.1em;
  color: #666666;
  font-weight: 500;
}
</style>


