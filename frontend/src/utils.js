/**
 * Utility function to format milliseconds into a human-readable duration string.
 * 
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted string like "X days, Y hours, Z minutes"
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return "0 minutes";
  
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  
  const days = totalDays;
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  
  const parts = [];
  
  if (days > 0) {
    parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }
  
  return parts.join(', ');
}

/**
 * Utility function to format milliseconds into hours and minutes.
 * 
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted string like "X hrs Y mins"
 */
export function formatDurationShort(ms) {
  if (!ms || ms < 0) return "0 mins";
  
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours} hrs ${minutes} mins`;
  }
  
  return `${minutes} mins`;
}

/**
 * Alias for formatDuration - format time in milliseconds to human-readable string.
 * 
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted string like "X days, Y hours, Z minutes"
 */
export function formatTime(ms) {
  return formatDuration(ms);
}
