/**
 * Parse RSS/Atom XML feed text
 * @param {string} xmlText - The XML feed content
 * @returns {Object} Parsed feed object with items
 */
export function parseFeed(xmlText) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml')

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror')
  if (parserError) {
    throw new Error('XML parsing error: ' + parserError.textContent)
  }

  // Detect feed type (RSS vs Atom)
  const isAtom = xmlDoc.querySelector('feed') !== null
  
  // Extract feed items
  const items = extractFeedItems(xmlDoc, isAtom)

  return {
    isAtom,
    items,
    totalItems: items.length
  }
}

/**
 * Extract feed items from XML document
 * @param {Document} xmlDoc - Parsed XML document
 * @param {boolean} isAtom - Whether this is an Atom feed
 * @returns {Array} Array of feed items
 */
export function extractFeedItems(xmlDoc, isAtom) {
  const itemElements = isAtom
    ? xmlDoc.querySelectorAll('entry')
    : xmlDoc.querySelectorAll('item')

  return Array.from(itemElements).map(item => extractItemData(item, isAtom))
}

/**
 * Extract data from a single feed item
 * @param {Element} item - The item/entry element
 * @param {boolean} isAtom - Whether this is an Atom feed
 * @returns {Object} Extracted item data
 */
export function extractItemData(item, isAtom) {
  if (isAtom) {
    // Atom feed format
    const link = item.querySelector('link')
    const linkHref = link?.getAttribute('href') || ''
    
    // Extract content from summary, content, or media:description
    const contentEl = item.querySelector('content')
    const summaryEl = item.querySelector('summary')
    const mediaDescEl = item.getElementsByTagName('media:description')[0]
    const content = contentEl?.textContent || summaryEl?.textContent || mediaDescEl?.textContent || ''
    
    // Extract YouTube-specific metadata (for media namespace elements, use getElementsByTagName)
    const mediaThumbnail = item.getElementsByTagName('media:thumbnail')[0]
    const thumbnailUrl = mediaThumbnail?.getAttribute('url') || ''
    
    const mediaGroup = item.getElementsByTagName('media:group')[0]
    const mediaCommunity = mediaGroup?.getElementsByTagName('media:community')[0]
    const mediaStats = mediaCommunity?.getElementsByTagName('media:statistics')[0]
    const views = mediaStats?.getAttribute('views') || ''
    
    return {
      title: item.querySelector('title')?.textContent || 'Untitled',
      link: linkHref,
      content,
      pubDate: item.querySelector('published, updated')?.textContent || '',
      source: detectFeedSource(linkHref),
      thumbnailUrl,
      views
    }
  } else {
    // RSS feed format
    const linkText = item.querySelector('link')?.textContent || ''
    
    return {
      title: item.querySelector('title')?.textContent || 'Untitled',
      link: linkText,
      content: item.querySelector('description, content\\:encoded')?.textContent || '',
      pubDate: item.querySelector('pubDate')?.textContent || '',
      source: detectFeedSource(linkText)
    }
  }
}

/**
 * Detect feed source from URL
 * @param {string} link - The item link URL
 * @returns {string} Detected source name
 */
export function detectFeedSource(link) {
  if (!link) return 'unknown'
  
  const url = link.toLowerCase()
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('wikipedia.org')) return 'wikipedia'
  if (url.includes('wikivoyage.org')) return 'wikivoyage'
  if (url.includes('news.ycombinator.com')) return 'hackernews'
  if (url.includes('medium.com')) return 'medium'
  
  return 'other'
}

