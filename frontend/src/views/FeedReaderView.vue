<template>
  <div class="feed-reader">
    <Header />
    
    <FeedSelector
      :current-feed="feedStore.currentFeed"
      :feed-options="feedOptions"
      :is-updating="isUpdating"
      @feed-change="handleFeedChange"
      @update="handleUpdate"
    />

    <SearchBar
      :search-query="uiStore.searchQuery"
      :total-items="uiStore.currentItemRange.total"
      @search="uiStore.setSearch"
      @clear="uiStore.clearSearch"
    />

    <FeedList
      :items="uiStore.paginatedItems"
      :loading="loading"
      :loading-message="loadingMessage"
      :current-page="uiStore.currentPage"
      :total-pages="uiStore.totalPages"
      @page-change="uiStore.setPage"
    />

    <Footer />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useFeedStore } from '../stores/feedStore'
import Header from '../components/common/Header.vue'
import Footer from '../components/common/Footer.vue'
import FeedSelector from '../components/FeedReader/FeedSelector.vue'
import SearchBar from '../components/FeedReader/SearchBar.vue'
import FeedList from '../components/FeedReader/FeedList.vue'

export default {
  name: 'FeedReaderView',
  components: {
    Header,
    Footer,
    FeedSelector,
    SearchBar,
    FeedList
  },
  setup() {
    const uiStore = useUIStore()
    const feedStore = useFeedStore()
    
    const loading = ref(false)
    const loadingMessage = ref('Loading...')
    const isUpdating = ref(false)
    
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
    
    async function loadAllFeeds() {
      loading.value = true
      loadingMessage.value = 'Loading feeds...'
      
      try {
        // Load feed configuration from Supabase
        await feedStore.loadFeeds()
        
        // TODO: Implement actual RSS feed fetching
        // For now, add comprehensive test data so we can see the UI
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
        console.log('Loaded test feeds:', feedStore.feeds.length, 'feed configurations')
        console.log('Displaying', testItems.length, 'test items')
        
      } catch (error) {
        console.error('Error loading feeds:', error)
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
        await loadAllFeeds()
      } finally {
        isUpdating.value = false
      }
    }
    
    onMounted(() => {
      loadAllFeeds()
    })
    
    return {
      uiStore,
      feedStore,
      feedOptions,
      loading,
      loadingMessage,
      isUpdating,
      handleFeedChange,
      handleUpdate
    }
  }
}
</script>

<style scoped>
.feed-reader {
  width: 100%;
}
</style>


