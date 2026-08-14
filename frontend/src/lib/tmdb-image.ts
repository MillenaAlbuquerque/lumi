export function getTmdbImageUrl(url: string | null, size: 'w500' | 'w1280') {
  if (!url) return null
  if (url.startsWith('/')) return `https://image.tmdb.org/t/p/${size}${url}`
  return url.replace(/\/t\/p\/(?:original|w\d+)\//, `/t/p/${size}/`)
}

