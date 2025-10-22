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

let didInitAuth = false

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Initialize auth state once on first navigation (fixes refresh white-screen)
  if (!didInitAuth) {
    didInitAuth = true
    // Fire-and-forget to avoid blocking navigation on refresh
    authStore.checkAuth().catch(() => {})
  }

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

