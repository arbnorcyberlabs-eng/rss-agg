/**
 * Fetch feed configuration from Supabase and generate feeds.toml
 * This script runs in GitHub Actions before feed generation
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing required environment variables')
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fetchFeedConfig() {
  try {
    console.log('Fetching feed configuration from Supabase...')

    // Fetch all enabled feeds, ordered by display_order
    const { data: feeds, error } = await supabase
      .from('feeds')
      .select('*')
      .eq('enabled', true)
      .eq('type', 'scraped') // Only fetch scraped feeds for feed-me-up-scotty
      .order('display_order', { ascending: true })

    if (error) {
      throw error
    }

    console.log(`Found ${feeds.length} enabled scraped feeds`)

    return feeds
  } catch (error) {
    console.error('Error fetching feeds from Supabase:', error)
    throw error
  }
}

function escapeTomlString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
}

function formatUrl(config) {
  const urlValue = config?.url

  if (Array.isArray(urlValue) && urlValue.length > 0) {
    const urls = urlValue.map(url => `"${escapeTomlString(url)}"`)
    return `url = [${urls.join(', ')}]`
  }

  if (typeof urlValue === 'string' && urlValue.trim().length > 0) {
    return `url = "${escapeTomlString(urlValue)}"`
  }

  throw new Error('Feed configuration is missing a valid URL')
}

function generateFeedsToml(feeds) {
  if (!Array.isArray(feeds)) {
    throw new Error('Expected feeds to be an array when generating feeds.toml')
  }

  let toml = `# Feed me up, Scotty! Configuration
# Auto-generated from Supabase on ${new Date().toISOString()}
# DO NOT EDIT MANUALLY - Changes will be overwritten

[default]
timeout = 30

`

  feeds.forEach(feed => {
    const feedId = String(feed.id || '').trim()
    const title = String(feed.title || '').trim()
    const config = feed.config || {}

    if (!feedId) {
      console.warn('Skipping feed without an id:', feed)
      return
    }

    if (!title) {
      console.warn(`Skipping feed "${feedId}" because it is missing a title`)
      return
    }

    let urlLine
    try {
      urlLine = formatUrl(config)
    } catch (error) {
      console.warn(`Skipping feed "${feedId}" due to invalid URL configuration:`, error.message)
      return
    }

    toml += `# ${escapeTomlString(title)}\n`
    toml += `[${escapeTomlString(feedId)}]\n`
    toml += `title = "${escapeTomlString(title)}"\n`
    toml += `${urlLine}\n`

    // Add selectors
    if (config.entrySelector) {
      toml += `entrySelector = "${escapeTomlString(config.entrySelector)}"\n`
    }
    if (config.titleSelector) {
      toml += `titleSelector = "${escapeTomlString(config.titleSelector)}"\n`
    }
    if (config.linkSelector) {
      toml += `linkSelector = "${escapeTomlString(config.linkSelector)}"\n`
    }
    if (config.linkAttribute) {
      toml += `linkAttribute = "${escapeTomlString(config.linkAttribute)}"\n`
    }
    if (config.contentSelector) {
      toml += `contentSelector = "${escapeTomlString(config.contentSelector)}"\n`
    }

    toml += '\n'
  })

  return toml
}

async function main() {
  try {
    // Fetch feeds from Supabase
    const feeds = await fetchFeedConfig()

    if (feeds.length === 0) {
      console.warn('Warning: No enabled scraped feeds found in Supabase')
      console.log('Creating empty feeds.toml with default settings only')
    }

    // Generate TOML content
    const tomlContent = generateFeedsToml(feeds)

    // Write to feeds.toml
    writeFileSync('feeds.toml', tomlContent, 'utf8')
    console.log('✓ Successfully generated feeds.toml')
    console.log(`✓ Configured ${feeds.length} feeds for scraping`)

    // Log feed IDs for debugging
    if (feeds.length > 0) {
      console.log('Feed IDs:', feeds.map(f => f.id).join(', '))
    }

  } catch (error) {
    console.error('Fatal error:', error.message)
    process.exit(1)
  }
}

main()

