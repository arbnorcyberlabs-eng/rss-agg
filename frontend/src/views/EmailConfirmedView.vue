<template>
  <div class="email-confirmed-view">
    <Header />
    
    <div class="container">
      <div class="confirmation-card">
        <div class="success-icon">✅</div>
        <h1>Email Confirmed!</h1>
        <p class="success-message">
          Thank you for confirming your email address.
        </p>
        <p class="info-message">
          Your account is now fully activated and you can access all features of the RSS Feed Aggregator.
        </p>
        
        <div class="features-list">
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
        </div>

        <div class="actions">
          <button class="primary-button" @click="goToHome">
            Start Reading Feeds
          </button>
          <button class="secondary-button" @click="goToPreferences">
            Customize Preferences
          </button>
        </div>
      </div>
    </div>

    <Footer />
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import Header from '../components/common/Header.vue'
import Footer from '../components/common/Footer.vue'

export default {
  name: 'EmailConfirmedView',
  components: {
    Header,
    Footer
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()

    function goToHome() {
      router.push('/')
    }

    function goToPreferences() {
      if (authStore.isAuthenticated) {
        router.push('/preferences')
      } else {
        router.push('/admin')
      }
    }

    return {
      goToHome,
      goToPreferences
    }
  }
}
</script>

<style scoped>
.email-confirmed-view {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.confirmation-card {
  max-width: 600px;
  width: 100%;
  padding: 60px 40px;
  border: 2px solid #000000;
  background: #ffffff;
  text-align: center;
}

.success-icon {
  font-size: 80px;
  margin-bottom: 30px;
  animation: scaleIn 0.5s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

h1 {
  font-size: 2.5em;
  font-weight: 700;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: -0.5px;
}

.success-message {
  font-size: 1.2em;
  line-height: 1.6;
  margin-bottom: 15px;
  color: #2e7d32;
  font-weight: 600;
}

.info-message {
  font-size: 1em;
  line-height: 1.6;
  margin-bottom: 40px;
  color: #333333;
}

.features-list {
  text-align: left;
  max-width: 400px;
  margin: 0 auto 40px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  background: #fafafa;
}

.feature {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 0.95em;
}

.feature:last-child {
  margin-bottom: 0;
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

.actions {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 400px;
  margin: 0 auto;
}

.primary-button,
.secondary-button {
  width: 100%;
  padding: 14px 24px;
  border: 2px solid #000000;
  cursor: pointer;
  font-size: 0.95em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.primary-button {
  background: #000000;
  color: #ffffff;
}

.primary-button:hover {
  background: #ffffff;
  color: #000000;
}

.secondary-button {
  background: #ffffff;
  color: #000000;
}

.secondary-button:hover {
  background: #000000;
  color: #ffffff;
}

@media (max-width: 768px) {
  .confirmation-card {
    padding: 40px 20px;
  }

  h1 {
    font-size: 2em;
  }

  .success-icon {
    font-size: 60px;
  }

  .success-message {
    font-size: 1.1em;
  }
}
</style>

