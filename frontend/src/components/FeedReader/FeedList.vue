<template>
  <div>
    <!-- Feed items container -->
    <div class="feed-items">
      <FeedItem
        v-for="(item, index) in items"
        :key="`${item.link}-${index}`"
        :item="item"
        :is-video="item.source === 'youtube'"
      />
    </div>

    <!-- Empty state -->
    <div v-if="items.length === 0 && !loading" class="empty-state">
      <p>No items found</p>
    </div>

    <!-- Loading state -->
    <Loading v-if="loading" :message="loadingMessage" />

    <!-- Pagination -->
    <Pagination
      v-if="!loading && totalPages > 1"
      :current-page="currentPage"
      :total-pages="totalPages"
      @page-change="$emit('page-change', $event)"
    />
  </div>
</template>

<script>
import FeedItem from './FeedItem.vue'
import Pagination from './Pagination.vue'
import Loading from '../common/Loading.vue'

export default {
  name: 'FeedList',
  components: {
    FeedItem,
    Pagination,
    Loading
  },
  props: {
    items: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    loadingMessage: {
      type: String,
      default: 'Loading...'
    },
    currentPage: {
      type: Number,
      default: 1
    },
    totalPages: {
      type: Number,
      default: 1
    }
  },
  emits: ['page-change']
}
</script>

<style scoped>
.feed-items {
  display: grid;
  gap: 0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

.empty-state p {
  font-size: 1.1em;
  margin: 0;
}
</style>

