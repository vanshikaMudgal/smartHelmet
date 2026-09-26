/**
 * Data formatters for display in industrial safety dashboard
 */

/**
 * Formats a date or timestamp to HH:mm:ss local time
 */
export function formatTime(timestamp?: string | number | Date): string {
  if (!timestamp) return '--:--:--';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '--:--:--';
    return d.toTimeString().split(' ')[0];
  } catch {
    return '--:--:--';
  }
}

/**
 * Formats elapsed time since last seen in human readable format
 */
export function formatTimeAgo(lastSeenMs: number): string {
  const diffSec = Math.floor((Date.now() - lastSeenMs) / 1000);
  if (diffSec < 2) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

/**
 * Formats distance with appropriate units (m or km)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}
