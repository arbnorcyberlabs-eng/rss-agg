import { supabase } from './supabase'

export async function fetchUserPreferences(userId) {
  const { data, error } = await supabase
    .from('user_feed_preferences')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}

export async function toggleFeedPreference(userId, feedId, enabled) {
  // Check if preference exists
  const { data: existing } = await supabase
    .from('user_feed_preferences')
    .select('id')
    .eq('user_id', userId)
    .eq('feed_id', feedId)
    .single()

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('user_feed_preferences')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('user_feed_preferences')
      .insert({ user_id: userId, feed_id: feedId, enabled })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function initializeDefaultPreferences(userId, feedIds) {
  // When a user signs up, enable all feeds by default
  const preferences = feedIds.map(feedId => ({
    user_id: userId,
    feed_id: feedId,
    enabled: true
  }))

  const { data, error } = await supabase
    .from('user_feed_preferences')
    .insert(preferences)
    .select()

  if (error) throw error
  return data
}

