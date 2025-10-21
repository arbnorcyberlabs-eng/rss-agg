<template>
  <footer>
    <p>Automated RSS Feed Aggregator · Updates twice daily</p>
  </footer>
</template>

<script>
export default {
  name: 'Footer'
}
</script>

<style scoped>
footer {
  text-align: center;
  padding: 25px 20px;
  border-top: 1px solid #e0e0e0;
  margin-top: 30px;
}

footer p {
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.7em;
  color: #666666;
  margin: 0;
}

@media (max-width: 768px) {
  footer {
    padding: 20px 15px;
    margin-top: 25px;
  }

  footer p {
    font-size: 0.65em;
  }
}
</style>

