<template>
  <div id="app">
    <div class="container">
      <div v-if="showInitialLoader" class="app-loading">
        <p class="loading-text">Initializing...</p>
      </div>
      <router-view v-else />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
const showInitialLoader = computed(() => !authStore.isReady && authStore.loading)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  background: #ffffff;
  min-height: 100vh;
  padding: 0;
  color: #000000;
  line-height: 1.4;
  font-size: 14px;
}

#app {
  width: 100%;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.app-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 40px 20px;
}

.loading-text {
  font-size: 1.1em;
  color: #666666;
  font-weight: 500;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
}

@media (max-width: 768px) {
  body {
    font-size: 13px;
  }
  
  .container {
    padding: 0 15px;
  }
}
</style>

