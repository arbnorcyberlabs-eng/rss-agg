<template>
  <div class="feed-config-preview">
    <h4>Configuration Preview</h4>
    <pre>{{ formattedConfig }}</pre>
  </div>
</template>

<script>
export default {
  name: 'FeedConfigPreview',
  props: {
    config: {
      type: [Object, String],
      default: null
    }
  },
  computed: {
    formattedConfig() {
      if (!this.config) return '{}'
      
      try {
        const obj = typeof this.config === 'string' 
          ? JSON.parse(this.config) 
          : this.config
        return JSON.stringify(obj, null, 2)
      } catch (e) {
        return 'Invalid JSON'
      }
    }
  }
}
</script>

<style scoped>
.feed-config-preview {
  padding: 15px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  margin-top: 15px;
}

.feed-config-preview h4 {
  margin-bottom: 10px;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.feed-config-preview pre {
  font-family: monospace;
  font-size: 0.75em;
  line-height: 1.5;
  color: #333;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>

