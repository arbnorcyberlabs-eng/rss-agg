const fetch = (...args) => (global.fetch ? global.fetch(...args) : require('node-fetch')(...args));

function buildFeedUrlFromChannelId(channelId) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

function buildFeedUrlFromPlaylistId(playlistId) {
  return `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
}

function buildFeedUrlFromUser(userName) {
  return `https://www.youtube.com/feeds/videos.xml?user=${userName}`;
}

async function resolveYoutubeFeedUrl(rawUrl) {
  if (!rawUrl) return null;
  const url = rawUrl.trim();

  // Already a feed URL
  if (/feeds\/videos\.xml/.test(url)) return url;

  // Playlist
  const playlistMatch = url.match(/[?&]list=([^&]+)/i);
  if (playlistMatch?.[1]) return buildFeedUrlFromPlaylistId(playlistMatch[1]);

  // Channel ID
  const channelMatch = url.match(/channel\/(UC[\w-]+)/i);
  if (channelMatch?.[1]) return buildFeedUrlFromChannelId(channelMatch[1]);

  // User
  const userMatch = url.match(/user\/([\w-]+)/i);
  if (userMatch?.[1]) return buildFeedUrlFromUser(userMatch[1]);

  // Handle (@handle)
  const handleMatch = url.match(/youtube\.com\/@([\w\.-]+)/i);
  if (handleMatch?.[1]) {
    const possibleUrls = [
      url,
      `${url}/about`,
      `https://www.youtube.com/@${handleMatch[1]}/about`
    ];
    for (const handleUrl of possibleUrls) {
      try {
        const res = await fetch(handleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; YoutubeHandleResolver/1.0; +https://example.com/bot)'
          },
          timeout: 12000
        });
        if (!res.ok) continue;
        const html = await res.text();
        const channelIdMatch =
          html.match(/"channelId":"(UC[\w-]+)"/) ||
          html.match(/"browseId":"(UC[\w-]+)"/) ||
          html.match(/channelId=?(UC[\w-]+)/) ||
          html.match(/youtube\.com\/channel\/(UC[\w-]+)/);
        if (channelIdMatch?.[1]) {
          return buildFeedUrlFromChannelId(channelIdMatch[1]);
        }
      } catch (err) {
        console.warn(`Failed to resolve YouTube handle ${handleUrl}: ${err.message}`);
      }
    }
  }

  return null;
}

module.exports = { resolveYoutubeFeedUrl };

