<template>
  <div class="feed-form">
    <h3>{{ isEdit ? 'Edit Feed' : 'Add New Feed' }}</h3>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="feedId">Feed ID *</label>
        <input
          id="feedId"
          v-model="formData.id"
          type="text"
          :disabled="isEdit"
          placeholder="e.g., my-feed"
          required
        />
      </div>

      <div class="form-group">
        <label for="feedTitle">Title *</label>
        <input
          id="feedTitle"
          v-model="formData.title"
          type="text"
          placeholder="e.g., My Awesome Feed"
          required
        />
      </div>

      <div class="form-group">
        <label for="feedType">Feed Type *</label>
        <select id="feedType" v-model="formData.type" required>
          <option value="native_rss">Native RSS (Existing Feed URL)</option>
        </select>
      </div>

      <div v-if="formData.type === 'native_rss'" class="form-group">
        <label for="rssUrl">RSS Feed URL *</label>
        <input
          id="rssUrl"
          v-model="formData.rss_url"
          type="url"
          placeholder="https://example.com/feed.xml"
          required
        />
      </div>

      <!-- Scraped feeds are not allowed for creation via UI -->

      <div class="form-group">
        <label for="displayOrder">Display Order</label>
        <input
          id="displayOrder"
          v-model.number="formData.display_order"
          type="number"
          min="0"
        />
      </div>

      <div class="form-actions">
        <button type="submit" class="submit-button">
          {{ isEdit ? 'Update' : 'Create' }}
        </button>
        <button type="button" class="cancel-button" @click="$emit('cancel')">
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script>
export default {
  name: 'FeedForm',
  props: {
    feed: {
      type: Object,
      default: null
    }
  },
  emits: ['submit', 'cancel'],
  data() {
    return {
      formData: {
        id: '',
        title: '',
        type: 'native_rss',
        config: null,
        rss_url: null,
        display_order: 0
      },
      configText: ''
    }
  },
  computed: {
    isEdit() {
      return !!this.feed
    }
  },
  watch: {
    feed: {
      immediate: true,
      handler(newFeed) {
        if (newFeed) {
          this.formData = { ...newFeed }
          this.configText = newFeed.config ? JSON.stringify(newFeed.config, null, 2) : ''
        }
      }
    }
  },
  methods: {
    handleSubmit() {
      const data = { ...this.formData }

      // Enforce only native_rss creation
      data.type = 'native_rss'
      data.config = null

      if (!data.rss_url) {
        alert('RSS Feed URL is required for native RSS feeds')
        return
      }

      // Basic validation for YouTube feed support (allow any valid URL including YouTube RSS)
      try {
        // Throws if invalid
        new URL(data.rss_url)
      } catch (e) {
        alert('Please provide a valid RSS feed URL')
        return
      }

      this.$emit('submit', data)
    }
  }
}
</script>

<style scoped>
.feed-form {
  padding: 20px;
  border: 2px solid #000000;
  background: #ffffff;
  margin-bottom: 20px;
}

.feed-form h3 {
  margin-bottom: 20px;
  font-size: 1.2em;
  font-weight: 700;
  text-transform: uppercase;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #000000;
  font-family: monospace;
  font-size: 0.85em;
  outline: none;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  background: #fafafa;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.submit-button,
.cancel-button {
  flex: 1;
  padding: 12px;
  border: 2px solid #000000;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.submit-button {
  background: #000000;
  color: #ffffff;
}

.submit-button:hover {
  background: #ffffff;
  color: #000000;
}

.cancel-button {
  background: #ffffff;
  color: #000000;
}

.cancel-button:hover {
  background: #f5f5f5;
}
</style>

