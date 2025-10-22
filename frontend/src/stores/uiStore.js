import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // State
  const searchQuery = ref('')
  const currentPage = ref(1)
  const itemsPerPage = ref(15)
  const allItems = ref([])

  // Getters
  const filteredItems = computed(() => {
    if (!searchQuery.value.trim()) {
      return allItems.value
    }

    const query = searchQuery.value.toLowerCase().trim()
    return allItems.value.filter(item => {
      const title = item.title?.toLowerCase() || ''
      const content = item.content?.toLowerCase() || ''
      return title.includes(query) || content.includes(query)
    })
  })

  const totalPages = computed(() => {
    return Math.ceil(filteredItems.value.length / itemsPerPage.value)
  })

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredItems.value.slice(start, end)
  })

  const currentItemRange = computed(() => {
    if (filteredItems.value.length === 0) {
      return { start: 0, end: 0, total: 0 }
    }

    const start = (currentPage.value - 1) * itemsPerPage.value + 1
    const end = Math.min(start + itemsPerPage.value - 1, filteredItems.value.length)
    
    return {
      start,
      end,
      total: filteredItems.value.length
    }
  })

  // Actions
  function setSearch(query) {
    searchQuery.value = query
    currentPage.value = 1 // Reset to first page on search
  }

  function clearSearch() {
    searchQuery.value = ''
    currentPage.value = 1
  }

  function resetUI() {
    searchQuery.value = ''
    currentPage.value = 1
    itemsPerPage.value = 15
    allItems.value = []
  }

  function setPage(page) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  function nextPage() {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }

  function previousPage() {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  function setItemsPerPage(count) {
    itemsPerPage.value = count
    currentPage.value = 1 // Reset to first page
  }

  function setAllItems(items) {
    allItems.value = items
    currentPage.value = 1 // Reset to first page
  }

  function resetPagination() {
    currentPage.value = 1
  }

  return {
    searchQuery,
    currentPage,
    itemsPerPage,
    allItems,
    filteredItems,
    totalPages,
    paginatedItems,
    currentItemRange,
    setSearch,
    clearSearch,
    resetUI,
    setPage,
    nextPage,
    previousPage,
    setItemsPerPage,
    setAllItems,
    resetPagination
  }
})

