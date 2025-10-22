<template>
  <div class="preferences-view">
    <Header />
    
    <div class="container">
      <div class="preferences-header">
        <h1>Feed Preferences</h1>
        <p>Customize which feeds appear in your reader</p>
      </div>

      <div v-if="loading" class="loading">Loading preferences...</div>

      <div v-else class="feed-list">
        <div 
          v-for="feed in feedStore.feeds" 
          :key="feed.id"
          class="feed-item"
        >
          <div class="feed-info">
            <h3>{{ feed.title }}</h3>
            <span class="feed-type">{{ feed.type === 'scraped' ? 'Scraped' : 'Native RSS' }}</span>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox"
              :checked="userPrefStore.isFeedEnabled(feed.id)"
              @change="handleToggle(feed.id, $event.target.checked)"
            />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="actions">
        <button class="back-button" @click="$router.push('/')">
          Back to Feed Reader
        </button>
      </div>
    </div>

    <Footer />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFeedStore } from '../stores/feedStore'
import { useUserPreferenceStore } from '../stores/userPreferenceStore'
import Header from '../components/common/Header.vue'
import Footer from '../components/common/Footer.vue'

export default {
  name: 'PreferencesView',
  components: {
    Header,
    Footer
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const feedStore = useFeedStore()
    const userPrefStore = useUserPreferenceStore()
    const loading = ref(true)

    async function loadData() {
      try {
        await feedStore.loadFeeds()
        await userPrefStore.loadPreferences()
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        loading.value = false
      }
    }

    async function handleToggle(feedId, enabled) {
      try {
        await userPrefStore.toggleFeed(feedId, enabled)
      } catch (error) {
        console.error('Error toggling feed:', error)
      }
    }

    onMounted(async () => {
      // Redirect if not authenticated
      if (!authStore.isAuthenticated) {
        router.push('/')
        return
      }
      
      await loadData()
    })

    return {
      loading,
      feedStore,
      userPrefStore,
      handleToggle
    }
  }
}
</script>

<style scoped>
.preferences-view {
  width: 100%;
  min-height: 100vh;
}

.preferences-header {
  margin: 40px 0 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #000000;
}

.preferences-header h1 {
  font-size: 2em;
  font-weight: 700;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: -0.5px;
}

.preferences-header p {
  font-size: 0.95em;
  color: #666666;
}

.feed-list {
  margin: 30px 0;
}

.feed-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  margin-bottom: 15px;
  border: 2px solid #000000;
  background: #ffffff;
}

.feed-info h3 {
  font-size: 1.1em;
  font-weight: 600;
  margin-bottom: 5px;
}

.feed-type {
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #666666;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cccccc;
  transition: 0.2s;
  border: 2px solid #000000;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: #000000;
  transition: 0.2s;
}

input:checked + .slider {
  background-color: #000000;
}

input:checked + .slider:before {
  background-color: #ffffff;
  transform: translateX(24px);
}

.actions {
  margin: 40px 0;
  text-align: center;
}

.back-button {
  padding: 12px 24px;
  background: #000000;
  color: #ffffff;
  border: 2px solid #000000;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.back-button:hover {
  background: #ffffff;
  color: #000000;
}

@media (max-width: 768px) {
  .feed-item {
    padding: 15px;
  }

  .feed-info h3 {
    font-size: 1em;
  }

  .preferences-header h1 {
    font-size: 1.5em;
  }
}
</style>

