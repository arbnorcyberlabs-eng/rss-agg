<template>
  <div 
    class="feed-item"
    :class="{ video: isVideo }"
  >
    <!-- Video thumbnail (if video) -->
    <a 
      v-if="isVideo && item.thumbnailUrl"
      :href="item.link"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img 
        :src="item.thumbnailUrl"
        :alt="item.title"
        class="video-thumbnail"
      />
    </a>

    <!-- Content section -->
    <div :class="{ 'video-content': isVideo }">
      <span class="feed-source">{{ item.source || 'unknown' }}</span>
      
      <h3>
        <a 
          :href="item.link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ item.title }}
        </a>
        <span v-if="isVideo" class="video-indicator">▶ Video</span>
      </h3>

      <div v-if="item.pubDate" class="feed-date">
        {{ formatDate(item.pubDate) }}
      </div>

      <div v-if="item.content" class="feed-content">
        {{ truncateText(item.content, 200) }}
      </div>

      <!-- Video stats (if video) -->
      <div v-if="isVideo && item.views" class="video-stats">
        <div class="video-stat">
          <span>👁 Views:</span>
          <span class="video-stat-value">{{ formatNumber(item.views) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FeedItem',
  props: {
    item: {
      type: Object,
      required: true
    },
    isVideo: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    truncateText(text, maxLength = 200) {
      if (!text) return ''
      // Strip HTML tags
      const stripped = text.replace(/<[^>]*>/g, '')
      if (stripped.length <= maxLength) return stripped
      return stripped.substring(0, maxLength).trim() + '...'
    },
    formatDate(dateString) {
      if (!dateString) return ''
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch (e) {
        return dateString
      }
    },
    formatNumber(num) {
      if (!num) return '0'
      return new Intl.NumberFormat().format(num)
    }
  }
}
</script>

<style scoped>
.feed-item {
  background: #ffffff;
  padding: 18px 0;
  border-bottom: 1px solid #e8e8e8;
  transition: all 0.15s ease;
}

.feed-item:last-child {
  border-bottom: 2px solid #000000;
}

.feed-item:hover {
  background: #fafafa;
  padding-left: 12px;
}

.feed-item h3 {
  font-size: 1.15em;
  margin-bottom: 6px;
  color: #000000;
  font-weight: 600;
  line-height: 1.35;
}

.feed-item h3 a {
  color: #000000;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.feed-item h3 a:hover {
  opacity: 0.6;
}

.feed-source {
  display: inline-block;
  background: #000000;
  color: #ffffff;
  padding: 3px 8px;
  font-size: 0.6em;
  margin-bottom: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.feed-date {
  color: #888888;
  font-size: 0.7em;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.feed-content {
  color: #555555;
  line-height: 1.5;
  margin-top: 6px;
  font-size: 0.85em;
  max-width: 100%;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feed-content img {
  display: none;
}

.video-indicator {
  display: inline-block;
  background: #e53935;
  color: #ffffff;
  padding: 2px 6px;
  font-size: 0.55em;
  margin-left: 6px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.feed-item.video {
  background: #fafafa;
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.feed-item.video:hover {
  background: #f0f0f0;
}

.video-thumbnail {
  flex-shrink: 0;
  width: 180px;
  height: auto;
  border: 1px solid #ddd;
  transition: all 0.15s ease;
}

.video-thumbnail:hover {
  border-color: #000000;
}

.video-content {
  flex: 1;
  min-width: 0;
}

.video-stats {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #e0e0e0;
}

.video-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7em;
  color: #888888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.video-stat-value {
  color: #000000;
  font-weight: 600;
}

@media (max-width: 768px) {
  .feed-item {
    padding: 15px 0;
  }

  .feed-item h3 {
    font-size: 1.05em;
  }

  .feed-source {
    font-size: 0.58em;
    padding: 2px 6px;
  }

  .feed-date {
    font-size: 0.68em;
  }

  .feed-content {
    font-size: 0.8em;
  }
  
  .feed-item.video {
    flex-direction: column;
  }

  .video-thumbnail {
    width: 100%;
  }
}
</style>

