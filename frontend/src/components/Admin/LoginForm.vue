<template>
  <div class="login-form">
    <h2>Admin Login</h2>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="admin@example.com"
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          required
        />
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <button 
        type="submit"
        class="submit-button"
        :disabled="loading"
      >
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
    </form>
  </div>
</template>

<script>
export default {
  name: 'LoginForm',
  data() {
    return {
      email: '',
      password: '',
      loading: false,
      error: null
    }
  },
  emits: ['login'],
  methods: {
    async handleSubmit() {
      this.error = null
      this.loading = true

      try {
        await this.$emit('login', {
          email: this.email,
          password: this.password
        })
      } catch (err) {
        this.error = err.message || 'Login failed'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 40px auto;
  padding: 30px;
  border: 2px solid #000000;
  background: #ffffff;
}

.login-form h2 {
  margin-bottom: 20px;
  text-align: center;
  font-size: 1.5em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.5px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #000000;
  font-family: inherit;
  font-size: 0.9em;
  outline: none;
}

.form-group input:focus {
  background: #fafafa;
}

.error-message {
  padding: 10px;
  background: #fee;
  border: 1px solid #e53935;
  color: #e53935;
  font-size: 0.85em;
  margin-bottom: 15px;
}

.submit-button {
  width: 100%;
  padding: 12px;
  background: #000000;
  color: #ffffff;
  border: 2px solid #000000;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.submit-button:hover:not(:disabled) {
  background: #ffffff;
  color: #000000;
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

