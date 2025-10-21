import { createRouter, createWebHistory } from 'vue-router'
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
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue')
    }
  ]
})

export default router

