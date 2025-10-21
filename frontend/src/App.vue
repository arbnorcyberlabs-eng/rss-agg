<template>
  <div id="app">
    <div class="container">
      <router-view />
    </div>
  </div>
</template>

<script>
export default {
  name: 'App'
}
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

