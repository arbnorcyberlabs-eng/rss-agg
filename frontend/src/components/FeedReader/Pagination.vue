<template>
  <div class="pagination" v-if="totalPages > 1">
    <!-- Previous button -->
    <button 
      class="pagination-button"
      :disabled="currentPage === 1"
      @click="changePage(currentPage - 1)"
    >
      ← Prev
    </button>

    <!-- Page numbers -->
    <button
      v-for="page in visiblePages"
      :key="page"
      class="pagination-button"
      :class="{ active: page === currentPage }"
      @click="changePage(page)"
    >
      {{ page }}
    </button>

    <!-- Next button -->
    <button 
      class="pagination-button"
      :disabled="currentPage === totalPages"
      @click="changePage(currentPage + 1)"
    >
      Next →
    </button>

    <!-- Page info -->
    <span class="pagination-info">
      Page {{ currentPage }} of {{ totalPages }}
    </span>
  </div>
</template>

<script>
export default {
  name: 'Pagination',
  props: {
    currentPage: {
      type: Number,
      required: true
    },
    totalPages: {
      type: Number,
      required: true
    },
    maxPagesToShow: {
      type: Number,
      default: 5
    }
  },
  emits: ['page-change'],
  computed: {
    visiblePages() {
      const max = this.maxPagesToShow
      let start = Math.max(1, this.currentPage - Math.floor(max / 2))
      let end = Math.min(this.totalPages, start + max - 1)

      if (end - start < max - 1) {
        start = Math.max(1, end - max + 1)
      }

      const pages = []
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      return pages
    }
  },
  methods: {
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.$emit('page-change', page)
      }
    }
  }
}
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin: 25px 0;
}

.pagination-button {
  padding: 6px 12px;
  background: #ffffff;
  color: #000000;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.pagination-button:hover:not(:disabled) {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.pagination-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pagination-button.active {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.pagination-info {
  padding: 6px 12px;
  font-weight: 500;
  font-size: 0.75em;
  color: #666666;
}

@media (max-width: 768px) {
  .pagination {
    flex-wrap: wrap;
    gap: 4px;
    margin: 20px 0;
  }

  .pagination-button {
    padding: 6px 10px;
    font-size: 0.7em;
  }

  .pagination-info {
    width: 100%;
    text-align: center;
    padding: 6px;
    font-size: 0.7em;
  }
}
</style>

