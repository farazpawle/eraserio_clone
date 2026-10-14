/**
 * Admin Authentication Utilities
 * Provides admin identification and access control functions
 */

/**
 * Check if a user email is in the admin list
 * @param userEmail - The email address to check
 * @returns boolean - True if user is admin, false otherwise
 */
export function isAdmin(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false;
  
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
  return adminEmails.includes(userEmail);
}

/**
 * Get list of admin emails from environment
 * @returns string[] - Array of admin email addresses
 */
export function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
}

/**
 * Validate admin access and throw error if not authorized
 * @param userEmail - The email address to validate
 * @throws Error if user is not admin
 */
export function requireAdmin(userEmail: string | null | undefined): void {
  if (!isAdmin(userEmail)) {
    throw new Error('Admin access required');
  }
}

/**
 * Check if admin system is properly configured
 * @returns boolean - True if admin emails are configured
 */
export function isAdminConfigured(): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.length > 0 && adminEmails[0] !== 'your-email@example.com';
}
