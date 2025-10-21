<template>
  <div class="controls">
    <!-- Desktop button group -->
    <div class="feed-selector">
      <button
        v-for="feed in feedOptions"
        :key="feed.id"
        class="feed-button"
        :class="{ active: currentFeed === feed.id }"
        @click="selectFeed(feed.id)"
      >
        {{ feed.name }}
      </button>
    </div>

    <!-- Mobile dropdown -->
    <select 
      class="feed-selector-mobile"
      :value="currentFeed"
      @change="handleMobileChange"
    >
      <option
        v-for="feed in feedOptions"
        :key="feed.id"
        :value="feed.id"
      >
        {{ feed.name }}
      </option>
    </select>

    <!-- Update button -->
    <button 
      class="update-button"
      :class="{ updating: isUpdating }"
      :disabled="isUpdating"
      @click="handleUpdate"
    >
      ↻ Update
    </button>
  </div>
</template>

<script>
export default {
  name: 'FeedSelector',
  props: {
    currentFeed: {
      type: String,
      default: 'all'
    },
    feedOptions: {
      type: Array,
      required: true
    },
    isUpdating: {
      type: Boolean,
      default: false
    }
  },
  emits: ['feed-change', 'update'],
  methods: {
    selectFeed(feedId) {
      this.$emit('feed-change', feedId)
    },
    handleMobileChange(event) {
      this.$emit('feed-change', event.target.value)
    },
    handleUpdate() {
      this.$emit('update')
    }
  }
}
</script>

<style scoped>
.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.feed-selector {
  display: flex;
  gap: 0;
  flex-wrap: wrap;
  border: 2px solid #000000;
  width: fit-content;
}

.feed-selector-mobile {
  display: none;
  width: 100%;
  padding: 10px 15px;
  background: #ffffff;
  border: 2px solid #000000;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
  color: #000000;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23000000' d='M0 0l6 8 6-8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px;
  padding-right: 35px;
}

.feed-selector-mobile:focus {
  outline: none;
  background-color: #f5f5f5;
}

.update-button {
  padding: 8px 16px;
  background: #000000;
  color: #ffffff;
  border: 2px solid #000000;
  cursor: pointer;
  font-size: 0.75em;
  font-weight: 600;
  transition: all 0.15s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
}

.update-button:hover {
  background: #ffffff;
  color: #000000;
}

.update-button:active {
  transform: scale(0.96);
}

.update-button.updating {
  opacity: 0.5;
  cursor: not-allowed;
}

.feed-button {
  padding: 8px 16px;
  background: #ffffff;
  border: none;
  border-right: 2px solid #000000;
  cursor: pointer;
  font-size: 0.75em;
  font-weight: 600;
  transition: all 0.15s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
}

.feed-button:last-child {
  border-right: none;
}

.feed-button:hover {
  background: #f5f5f5;
}

.feed-button.active {
  background: #000000;
  color: #ffffff;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .feed-selector {
    display: none;
  }

  .feed-selector-mobile {
    display: block;
  }
  
  .feed-button {
    width: 100%;
    border-right: none;
    border-bottom: 2px solid #000000;
    padding: 8px 15px;
    font-size: 0.7em;
  }

  .feed-button:last-child {
    border-bottom: none;
  }

  .update-button {
    width: 100%;
    padding: 8px 15px;
    font-size: 0.7em;
  }
}
</style>

