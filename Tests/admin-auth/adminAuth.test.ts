/**
 * Test file for Admin Authentication System
 * Run with: npm test -- adminAuth.test.ts
 */

import { isAdmin, getAdminEmails, requireAdmin, isAdminConfigured } from '@/lib/adminAuth'

// Mock environment variable
const mockEnv = {
  ADMIN_EMAILS: 'admin@example.com,test@example.com'
}

describe('Admin Authentication System', () => {
  beforeEach(() => {
    // Mock process.env
    process.env.ADMIN_EMAILS = mockEnv.ADMIN_EMAILS
  })

  afterEach(() => {
    // Clean up
    delete process.env.ADMIN_EMAILS
  })

  describe('isAdmin', () => {
    it('should return true for admin emails', () => {
      expect(isAdmin('admin@example.com')).toBe(true)
      expect(isAdmin('test@example.com')).toBe(true)
    })

    it('should return false for non-admin emails', () => {
      expect(isAdmin('user@example.com')).toBe(false)
      expect(isAdmin('guest@example.com')).toBe(false)
    })

    it('should return false for null/undefined emails', () => {
      expect(isAdmin(null)).toBe(false)
      expect(isAdmin(undefined)).toBe(false)
      expect(isAdmin('')).toBe(false)
    })

    it('should handle emails with extra whitespace', () => {
      process.env.ADMIN_EMAILS = ' admin@example.com , test@example.com '
      expect(isAdmin('admin@example.com')).toBe(true)
      expect(isAdmin('test@example.com')).toBe(true)
    })
  })

  describe('getAdminEmails', () => {
    it('should return array of admin emails', () => {
      const emails = getAdminEmails()
      expect(emails).toEqual(['admin@example.com', 'test@example.com'])
    })

    it('should return empty array when no admin emails configured', () => {
      delete process.env.ADMIN_EMAILS
      const emails = getAdminEmails()
      expect(emails).toEqual([])
    })
  })

  describe('requireAdmin', () => {
    it('should not throw for admin emails', () => {
      expect(() => requireAdmin('admin@example.com')).not.toThrow()
      expect(() => requireAdmin('test@example.com')).not.toThrow()
    })

    it('should throw for non-admin emails', () => {
      expect(() => requireAdmin('user@example.com')).toThrow('Admin access required')
      expect(() => requireAdmin(null)).toThrow('Admin access required')
      expect(() => requireAdmin(undefined)).toThrow('Admin access required')
    })
  })

  describe('isAdminConfigured', () => {
    it('should return true when admin emails are configured', () => {
      expect(isAdminConfigured()).toBe(true)
    })

    it('should return false when no admin emails configured', () => {
      delete process.env.ADMIN_EMAILS
      expect(isAdminConfigured()).toBe(false)
    })

    it('should return false when default placeholder is used', () => {
      process.env.ADMIN_EMAILS = 'your-email@example.com'
      expect(isAdminConfigured()).toBe(false)
    })
  })
})
