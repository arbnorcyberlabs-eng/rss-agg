import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import FeedReaderView from '../views/FeedReaderView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'reader',
      component: FeedReaderView
    },
    {
      path: '/preferences',
      name: 'preferences',
      component: () => import('../views/PreferencesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('../views/AuthView.vue')
    },
    {
      path: '/auth/confirmed',
      name: 'email-confirmed',
      component: () => import('../views/EmailConfirmedView.vue')
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      redirect: '/auth/confirmed'
    }
  ]
})

let authInitPromise = null

async function ensureAuthInitialized(authStore, needsProtectedAccess) {
  if (!authStore.isReady) {
    if (!authInitPromise) {
      authInitPromise = authStore
        .checkAuth()
        .catch((error) => {
          console.error('[RouteGuard] Failed to initialize auth state', error)
          throw error
        })
        .finally(() => {
          authInitPromise = null
        })
    }

    if (needsProtectedAccess) {
      try {
        await authInitPromise
      } catch (_) {
        // Swallow errors; route guard will handle redirects below
      }
    } else {
      // Avoid unhandled rejection when we don't await
      authInitPromise.catch(() => {})
    }
  }
}

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const needsProtectedAccess = Boolean(to.meta.requiresAuth || to.meta.requiresAdmin)

  await ensureAuthInitialized(authStore, needsProtectedAccess)

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/')
    return
  }

  // Check if route requires admin
  if (to.meta.requiresAdmin) {
    if (!authStore.isAuthenticated) {
      console.warn('[RouteGuard] Admin route blocked: unauthenticated user')
      next('/')
      return
    }
    if (!authStore.isAdmin) {
      console.warn('[RouteGuard] Admin route blocked: non-admin user')
      next('/')
      return
    }
  }

  next()
})

export default router

