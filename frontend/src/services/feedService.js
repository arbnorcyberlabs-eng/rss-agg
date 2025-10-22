import { supabase } from './supabase'

/**
 * Fetch all feeds from Supabase
 * @returns {Promise<Array>} Array of feed objects
 */
export async function fetchFeeds() {
  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching feeds:', error)
    throw error
  }
}

/**
 * Create a new feed
 * @param {Object} feedData - The feed data to create
 * @returns {Promise<Object>} Created feed object
 */
export async function createFeed(feedData) {
  try {
    // Enforce only native_rss feeds are creatable via UI
    if (feedData.type !== 'native_rss') {
      throw new Error('Only native RSS feeds can be created')
    }
    if (!feedData.rss_url) {
      throw new Error('RSS URL is required for native RSS feeds')
    }

    const { data, error } = await supabase
      .from('feeds')
      .insert([feedData])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating feed:', error)
    throw error
  }
}

/**
 * Update an existing feed
 * @param {string} id - Feed ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated feed object
 */
export async function updateFeed(id, updates) {
  try {
    const { data, error } = await supabase
      .from('feeds')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating feed:', error)
    throw error
  }
}

/**
 * Delete a feed
 * @param {string} id - Feed ID to delete
 * @returns {Promise<void>}
 */
export async function deleteFeed(id) {
  try {
    const { error } = await supabase
      .from('feeds')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting feed:', error)
    throw error
  }
}

/**
 * Toggle feed enabled/disabled status
 * @param {string} id - Feed ID
 * @param {boolean} enabled - New enabled status
 * @returns {Promise<Object>} Updated feed object
 */
export async function toggleFeedStatus(id, enabled) {
  try {
    return await updateFeed(id, { enabled })
  } catch (error) {
    console.error('Error toggling feed status:', error)
    throw error
  }
}

