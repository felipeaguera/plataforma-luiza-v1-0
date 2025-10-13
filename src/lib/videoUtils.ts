/**
 * Converts YouTube and Vimeo URLs to embed URLs
 */
export function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo patterns
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // If it's already an embed URL or a direct video file, return as is
  if (url.includes('/embed/') || url.includes('player.vimeo.com') || url.match(/\.(mp4|webm|ogg)$/i)) {
    return url;
  }

  return null;
}

/**
 * Checks if URL is a direct video file
 */
export function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg)$/i.test(url);
}
