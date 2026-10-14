'use client'

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isAdmin } from '@/lib/adminAuth'

/**
 * Hook for admin route protection
 * Redirects non-admin users away from admin pages
 */
export function useAdminAuth() {
  const { user, isLoading } = useKindeBrowserClient()
  const router = useRouter()
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      const adminStatus = isAdmin(user?.email)
      setIsAdminUser(adminStatus)
      setIsChecking(false)

      // Redirect non-admin users to dashboard
      if (!adminStatus) {
        router.replace('/dashboard')
      }
    }
  }, [user, isLoading, router])

  return {
    isAdmin: isAdminUser,
    isLoading: isLoading || isChecking,
    user
  }
}
