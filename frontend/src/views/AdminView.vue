<template>
  <div class="admin-view">
    <Header />
    
    <!-- Auth Form (if not authenticated) -->
    <AuthForm v-if="!authStore.isAuthenticated" />
    
    <!-- Admin Panel (if authenticated) -->
    <div v-else class="admin-panel">
      <div class="admin-header">
        <h2>Feed Management</h2>
        <button class="logout-button" @click="handleLogout">Logout</button>
      </div>

      <!-- Show restriction message if not admin -->
      <div v-if="!authStore.isAdmin" class="restriction-message">
        <p>⚠️ You don't have admin access to manage feeds.</p>
        <p>You can still customize your feed preferences in the <router-link to="/preferences">Preferences</router-link> page.</p>
      </div>

      <!-- Admin-only section -->
      <div v-else>
        <!-- Add/Edit Feed Form -->
        <FeedForm
          v-if="showForm"
          :feed="editingFeed"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
        
        <button 
          v-if="!showForm"
          class="add-button" 
          @click="handleAdd"
        >
          + Add New Feed
        </button>
        
        <!-- Feed Manager -->
        <FeedManager
          :feeds="feedStore.feeds"
          @toggle="handleToggle"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>
    
    <Footer />
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFeedStore } from '../stores/feedStore'
import Header from '../components/common/Header.vue'
import Footer from '../components/common/Footer.vue'
import AuthForm from '../components/Admin/LoginForm.vue'
import FeedForm from '../components/Admin/FeedForm.vue'
import FeedManager from '../components/Admin/FeedManager.vue'

export default {
  name: 'AdminView',
  components: {
    Header,
    Footer,
    AuthForm,
    FeedForm,
    FeedManager
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const feedStore = useFeedStore()
    
    const showForm = ref(false)
    const editingFeed = ref(null)
    
    async function handleLogout() {
      await authStore.logout()
    }
    
    function handleAdd() {
      editingFeed.value = null
      showForm.value = true
    }
    
    function handleEdit(feed) {
      editingFeed.value = feed
      showForm.value = true
    }
    
    function handleCancel() {
      showForm.value = false
      editingFeed.value = null
    }
    
    async function handleSubmit(feedData) {
      try {
        console.log('[Admin] handleSubmit received', feedData)
        if (editingFeed.value) {
          await feedStore.updateFeed(feedData.id, feedData)
        } else {
          await feedStore.addFeed(feedData)
        }
        await feedStore.loadFeeds()
        handleCancel()
      } catch (error) {
        console.error('Error saving feed:', error)
        alert('Error saving feed: ' + error.message)
      }
    }
    
    async function handleToggle(id, enabled) {
      try {
        await feedStore.toggleFeed(id, enabled)
      } catch (error) {
        console.error('Error toggling feed:', error)
        alert('Error toggling feed: ' + error.message)
      }
    }
    
    async function handleDelete(id) {
      try {
        await feedStore.deleteFeed(id)
      } catch (error) {
        console.error('Error deleting feed:', error)
        alert('Error deleting feed: ' + error.message)
      }
    }
    
    // Load feeds on mount if authenticated
    if (authStore.isAuthenticated) {
      feedStore.loadFeeds()
    }
    
    return {
      authStore,
      feedStore,
      showForm,
      editingFeed,
      handleLogout,
      handleAdd,
      handleEdit,
      handleCancel,
      handleSubmit,
      handleToggle,
      handleDelete
    }
  }
}
</script>

<style scoped>
.admin-view {
  width: 100%;
}

.admin-panel {
  padding: 20px 0;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.admin-header h2 {
  font-size: 1.5em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.5px;
}

.restriction-message {
  padding: 20px;
  background: #fff3cd;
  border: 2px solid #ffc107;
  margin-bottom: 20px;
  text-align: center;
}

.restriction-message p {
  margin: 10px 0;
  font-size: 0.95em;
}

.restriction-message a {
  color: #000000;
  text-decoration: underline;
  font-weight: 600;
}

.restriction-message a:hover {
  color: #666666;
}

.logout-button {
  padding: 8px 16px;
  background: #000000;
  color: #ffffff;
  border: 2px solid #000000;
  cursor: pointer;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.logout-button:hover {
  background: #ffffff;
  color: #000000;
}

.add-button {
  width: 100%;
  padding: 15px;
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
  margin-bottom: 20px;
}

.add-button:hover {
  background: #ffffff;
  color: #000000;
}
</style>

