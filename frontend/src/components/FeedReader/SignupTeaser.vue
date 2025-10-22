<template>
  <div class="signup-teaser">
    <div class="teaser-overlay"></div>
    <div class="teaser-content">
      <div class="teaser-icon">🔒</div>
      <h2>Want to see more?</h2>
      <p>Sign up for free to access all feeds and customize your reading experience</p>
      <div class="teaser-features">
        <div class="feature">
          <span class="check">✓</span>
          <span>Access to all RSS feeds</span>
        </div>
        <div class="feature">
          <span class="check">✓</span>
          <span>Personalize your feed selection</span>
        </div>
        <div class="feature">
          <span class="check">✓</span>
          <span>Real-time updates</span>
        </div>
        <div class="feature">
          <span class="check">✓</span>
          <span>No ads, forever free</span>
        </div>
      </div>
      <button class="signup-button" @click="handleSignup">
        Create Free Account
      </button>
      <button class="login-link" @click="handleLogin">
        Already have an account? Login
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SignupTeaser',
  emits: ['signup', 'login'],
  methods: {
    handleSignup() {
      this.$emit('signup')
    },
    handleLogin() {
      this.$emit('login')
    }
  }
}
</script>

<style scoped>
.signup-teaser {
  position: relative;
  margin: 40px 0;
  padding: 60px 20px;
  border: 2px solid #000000;
  background: #ffffff;
}

.teaser-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, 
    rgba(255, 255, 255, 0) 0%, 
    rgba(255, 255, 255, 0.8) 40%, 
    rgba(255, 255, 255, 1) 100%
  );
  pointer-events: none;
}

.teaser-content {
  position: relative;
  z-index: 1;
  max-width: 500px;
  margin: 0 auto;
  text-align: center;
}

.teaser-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.teaser-content h2 {
  font-size: 1.8em;
  font-weight: 700;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: -0.5px;
}

.teaser-content > p {
  font-size: 1em;
  line-height: 1.5;
  margin-bottom: 30px;
  color: #333333;
}

.teaser-features {
  text-align: left;
  max-width: 350px;
  margin: 0 auto 30px;
}

.feature {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 0.95em;
}

.check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 10px;
  background: #000000;
  color: #ffffff;
  font-size: 0.8em;
  font-weight: bold;
  flex-shrink: 0;
}

.signup-button {
  width: 100%;
  max-width: 350px;
  padding: 14px 24px;
  background: #000000;
  color: #ffffff;
  border: 2px solid #000000;
  cursor: pointer;
  font-size: 0.95em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
  transition: all 0.15s ease;
  margin-bottom: 15px;
}

.signup-button:hover {
  background: #ffffff;
  color: #000000;
}

.login-link {
  background: none;
  border: none;
  color: #000000;
  font-size: 0.85em;
  text-decoration: underline;
  cursor: pointer;
  font-family: inherit;
  padding: 5px;
}

.login-link:hover {
  color: #666666;
}

@media (max-width: 768px) {
  .signup-teaser {
    padding: 40px 15px;
  }

  .teaser-content h2 {
    font-size: 1.4em;
  }

  .teaser-icon {
    font-size: 36px;
  }
}
</style>

