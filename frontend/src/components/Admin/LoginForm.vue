<template>
  <div class="auth-form">
    <h2>{{ isSignup ? 'Create Account' : 'Login' }}</h2>
    
    <form @submit.prevent="handleSubmit">
      <div v-if="isSignup" class="form-group">
        <label for="fullName">Full Name</label>
        <input
          id="fullName"
          v-model="fullName"
          type="text"
          placeholder="John Doe"
          required
        />
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          :placeholder="isSignup ? 'you@example.com' : 'admin@example.com'"
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
          :minlength="isSignup ? 6 : undefined"
          required
        />
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div v-if="success" class="success-message">
        {{ success }}
      </div>

      <button 
        type="submit"
        class="submit-button"
        :disabled="loading"
      >
        {{ loading ? 'Processing...' : (isSignup ? 'Sign Up' : 'Login') }}
      </button>
    </form>

    <div class="toggle-mode">
      <button 
        type="button"
        class="toggle-button" 
        @click="toggleMode"
      >
        {{ isSignup ? 'Already have an account? Login' : 'Need an account? Sign up' }}
      </button>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../../stores/authStore'
import { useRouter } from 'vue-router'

export default {
  name: 'AuthForm',
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    return { authStore, router }
  },
  data() {
    return {
      isSignup: false,
      email: '',
      password: '',
      fullName: '',
      loading: false,
      error: null,
      success: null
    }
  },
  methods: {
    async handleSubmit() {
      this.error = null
      this.success = null
      this.loading = true

      try {
        if (this.isSignup) {
          const result = await this.authStore.signup(this.email, this.password, this.fullName)
          
          // Check if email confirmation is required
          if (result.user && !result.user.email_confirmed_at && result.user.identities?.length === 0) {
            this.success = 'Account created! Please check your email to confirm your account.'
          } else {
            this.success = 'Account created! You can now use all features.'
            // Redirect to home after successful signup
            setTimeout(() => {
              this.router.push('/')
            }, 1500)
          }
        } else {
          await this.authStore.login(this.email, this.password)
          // Login successful, redirect will happen via auth state change
        }
      } catch (err) {
        console.error('Auth error:', err)
        this.error = err.message || (this.isSignup ? 'Signup failed' : 'Login failed')
      } finally {
        this.loading = false
      }
    },
    toggleMode() {
      this.isSignup = !this.isSignup
      this.error = null
      this.success = null
      this.email = ''
      this.password = ''
      this.fullName = ''
    }
  }
}
</script>

<style scoped>
.auth-form {
  max-width: 400px;
  margin: 40px auto;
  padding: 30px;
  border: 2px solid #000000;
  background: #ffffff;
}

.auth-form h2 {
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

.success-message {
  padding: 10px;
  background: #e8f5e9;
  border: 1px solid #4caf50;
  color: #2e7d32;
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

.toggle-mode {
  margin-top: 20px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.toggle-button {
  background: none;
  border: none;
  color: #000000;
  font-size: 0.85em;
  text-decoration: underline;
  cursor: pointer;
  font-family: inherit;
  padding: 5px;
}

.toggle-button:hover {
  color: #666666;
}
</style>

