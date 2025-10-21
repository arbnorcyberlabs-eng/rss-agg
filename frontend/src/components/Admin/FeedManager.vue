<template>
  <div class="feed-manager">
    <h3>Manage Feeds</h3>
    
    <div class="feed-list">
      <div 
        v-for="feed in feeds"
        :key="feed.id"
        class="feed-row"
      >
        <div class="feed-info">
          <strong>{{ feed.title }}</strong>
          <span class="feed-meta">{{ feed.id }} · {{ feed.type }}</span>
        </div>
        
        <div class="feed-actions">
          <button 
            class="toggle-button"
            :class="{ active: feed.enabled }"
            @click="$emit('toggle', feed.id, !feed.enabled)"
          >
            {{ feed.enabled ? 'Enabled' : 'Disabled' }}
          </button>
          <button class="edit-button" @click="$emit('edit', feed)">
            Edit
          </button>
          <button class="delete-button" @click="handleDelete(feed)">
            Delete
          </button>
        </div>
      </div>
    </div>

    <div v-if="feeds.length === 0" class="empty-state">
      <p>No feeds yet. Create your first feed!</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FeedManager',
  props: {
    feeds: {
      type: Array,
      default: () => []
    }
  },
  emits: ['toggle', 'edit', 'delete'],
  methods: {
    handleDelete(feed) {
      if (confirm(`Delete feed "${feed.title}"?`)) {
        this.$emit('delete', feed.id)
      }
    }
  }
}
</script>

<style scoped>
.feed-manager {
  padding: 20px;
  border: 2px solid #000000;
  background: #ffffff;
}

.feed-manager h3 {
  margin-bottom: 20px;
  font-size: 1.2em;
  font-weight: 700;
  text-transform: uppercase;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feed-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e0e0e0;
  background: #fafafa;
}

.feed-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feed-info strong {
  font-size: 0.95em;
}

.feed-meta {
  font-size: 0.7em;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.feed-actions {
  display: flex;
  gap: 8px;
}

.toggle-button,
.edit-button,
.delete-button {
  padding: 6px 12px;
  border: 1px solid #000000;
  cursor: pointer;
  font-size: 0.7em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.toggle-button {
  background: #e0e0e0;
  color: #000000;
}

.toggle-button.active {
  background: #4caf50;
  color: #ffffff;
  border-color: #4caf50;
}

.edit-button {
  background: #ffffff;
  color: #000000;
}

.edit-button:hover {
  background: #000000;
  color: #ffffff;
}

.delete-button {
  background: #e53935;
  color: #ffffff;
  border-color: #e53935;
}

.delete-button:hover {
  background: #c62828;
  border-color: #c62828;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #888;
}

@media (max-width: 768px) {
  .feed-row {
    flex-direction: column;
    gap: 12px;
  }

  .feed-actions {
    width: 100%;
  }

  .feed-actions button {
    flex: 1;
  }
}
</style>

