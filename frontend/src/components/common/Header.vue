<template>
  <header>
    <h1>RSS</h1>
    <p class="subtitle">Real Simple Syndication</p>
  </header>
</template>

<script>
export default {
  name: 'Header'
}
</script>

<style scoped>
header {
  text-align: center;
  color: #000000;
  margin-bottom: 20px;
  padding: 30px 20px 20px;
  border-bottom: 2px solid #000000;
}

header::after {
  display: none;
}

h1 {
  font-size: 2em;
  margin-bottom: 6px;
  font-weight: 800;
  letter-spacing: -1px;
  text-transform: uppercase;
}

.subtitle {
  font-size: 0.75em;
  opacity: 0.5;
  font-weight: 400;
  letter-spacing: 1px;
  text-transform: uppercase;
}

@media (max-width: 768px) {
  h1 {
    font-size: 1.6em;
  }

  .subtitle {
    font-size: 0.7em;
  }

  header {
    padding: 25px 15px 15px;
    margin-bottom: 15px;
  }
}
</style>

