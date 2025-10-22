<template>
  <header>
    <div class="container">
      <div class="header-content">
        <div class="header-title" @click="$router.push('/')">
          <h1>RSS</h1>
          <p class="subtitle">Real Simple Syndication</p>
        </div>
        
        <nav class="header-nav">
          <div v-if="authStore.isAuthenticated" class="user-menu">
            <span class="user-email">{{ authStore.user.email }}</span>
            <router-link to="/preferences" class="nav-link">Preferences</router-link>
            <router-link v-if="authStore.isAdmin" to="/admin" class="nav-link admin">Admin</router-link>
            <button class="logout-btn" @click="handleLogout">Logout</button>
          </div>
          <div v-else class="auth-actions">
            <button class="login-btn" @click="handleLogin">Login</button>
            <button class="signup-btn" @click="handleSignup">Sign Up</button>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>

<script>
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useUserPreferenceStore } from '../../stores/userPreferenceStore'
import { useRouter } from 'vue-router'

export default {
  name: 'Header',
  setup() {
    const authStore = useAuthStore()
    const uiStore = useUIStore()
    const userPrefStore = useUserPreferenceStore()
    const router = useRouter()

    async function handleLogout() {
      try {
        console.log('Header: Starting logout process...')
        await authStore.logout()
        // Reset client-side state to avoid stale data after logout
        try { uiStore.clearSearch && uiStore.clearSearch() } catch {}
        try { uiStore.setPage && uiStore.setPage(1) } catch {}
        try { userPrefStore.clearPreferences && userPrefStore.clearPreferences() } catch {}

        // Absolute redirect to base URL to avoid incorrect cached paths
        const base = import.meta.env.VITE_BASE_URL || '/'
        console.log('Header: Logout successful, redirecting to base:', base)
        window.location.assign(base)
      } catch (error) {
        console.error('Header: Logout error:', error)
        // Even if logout fails, redirect to home and clear any local state
        try { userPrefStore.clearPreferences && userPrefStore.clearPreferences() } catch {}
        try { uiStore.clearSearch && uiStore.clearSearch() } catch {}
        const base = import.meta.env.VITE_BASE_URL || '/'
        window.location.assign(base)
      }
    }

    function handleLogin() {
      router.push('/auth')
    }

    function handleSignup() {
      router.push('/auth')
    }

    return {
      authStore,
      uiStore,
      userPrefStore,
      handleLogout,
      handleLogin,
      handleSignup
    }
  }
}
</script>

<style scoped>
header {
  color: #000000;
  margin-bottom: 20px;
  padding: 30px 20px 20px;
  border-bottom: 2px solid #000000;
}

header::after {
  display: none;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.header-title {
  cursor: pointer;
  text-align: left;
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

.header-nav {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.user-email {
  font-size: 0.85em;
  color: #666666;
}

.nav-link {
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #000000;
  text-decoration: none;
  padding: 6px 12px;
  border: 2px solid transparent;
  transition: all 0.15s ease;
}

.nav-link:hover {
  border-color: #000000;
}

.nav-link.admin {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.logout-btn, .login-btn, .signup-btn {
  padding: 6px 12px;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: inherit;
  cursor: pointer;
  border: 2px solid #000000;
  transition: all 0.15s ease;
}

.logout-btn, .login-btn {
  background: #ffffff;
  color: #000000;
}

.signup-btn {
  background: #000000;
  color: #ffffff;
}

.logout-btn:hover, .login-btn:hover {
  background: #000000;
  color: #ffffff;
}

.signup-btn:hover {
  background: #ffffff;
  color: #000000;
}

.auth-actions {
  display: flex;
  gap: 10px;
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

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .header-title {
    text-align: left;
  }

  .header-nav {
    width: 100%;
  }

  .user-menu {
    width: 100%;
    justify-content: space-between;
  }

  .user-email {
    flex: 1;
  }

  .auth-actions {
    width: 100%;
  }

  .login-btn, .signup-btn {
    flex: 1;
  }
}
</style>

