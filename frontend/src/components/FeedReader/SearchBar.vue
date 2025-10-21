<template>
  <div class="search-container">
    <div class="search-box">
      <input 
        type="text" 
        class="search-input" 
        placeholder="Search feeds..."
        :value="searchQuery"
        @input="handleInput"
      />
      <button 
        class="clear-search" 
        :class="{ visible: searchQuery }"
        @click="handleClear"
      >
        ✕
      </button>
    </div>
    <div class="stats-inline">
      <span class="stat-number">{{ totalItems }}</span>
      <span>items</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SearchBar',
  props: {
    searchQuery: {
      type: String,
      default: ''
    },
    totalItems: {
      type: Number,
      default: 0
    }
  },
  emits: ['search', 'clear'],
  methods: {
    handleInput(event) {
      this.$emit('search', event.target.value)
    },
    handleClear() {
      this.$emit('clear')
    }
  }
}
</script>

<style scoped>
.search-container {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  border: 2px solid #000000;
  background: #ffffff;
  padding: 0;
  max-width: 400px;
  flex: 1;
}

.search-input {
  border: none;
  padding: 8px 12px;
  font-size: 0.85em;
  font-family: inherit;
  flex: 1;
  outline: none;
  min-width: 200px;
}

.search-input::placeholder {
  color: #999;
}

.clear-search {
  padding: 8px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.9em;
  color: #666;
  transition: all 0.15s ease;
  display: none;
}

.clear-search.visible {
  display: block;
}

.clear-search:hover {
  color: #000000;
}

.stats-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  font-size: 0.75em;
  color: #666;
  white-space: nowrap;
}

.stats-inline .stat-number {
  font-weight: 700;
  color: #000000;
  font-size: 1.1em;
}

@media (max-width: 768px) {
  .search-container {
    flex-direction: column;
    gap: 10px;
    margin-bottom: 15px;
  }

  .search-box {
    width: 100%;
    max-width: 100%;
  }

  .search-input {
    min-width: 0;
    font-size: 0.8em;
  }

  .stats-inline {
    width: 100%;
    justify-content: center;
    font-size: 0.7em;
  }
}
</style>

