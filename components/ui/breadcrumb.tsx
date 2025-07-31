'use client'

import * as React from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
  isCurrentPage?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
  homeHref?: string
}

const Breadcrumb = React.forwardRef<
  HTMLElement,
  BreadcrumbProps
>(({ items, className, showHome = true, homeHref = '/dashboard', ...props }, ref) => {
  return (
    <nav
      ref={ref}
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400', className)}
      {...props}
    >
      {showHome && (
        <>
          <Link
            href={homeHref}
            className="flex items-center hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
          {items.length > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          )}
        </>
      )}
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        
        return (
          <React.Fragment key={index}>
            {item.href && !item.isCurrentPage ? (
              <Link
                href={item.href}
                className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'font-medium',
                  item.isCurrentPage || isLast
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-400'
                )}
                aria-current={item.isCurrentPage || isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
})

Breadcrumb.displayName = 'Breadcrumb'

export { Breadcrumb, type BreadcrumbItem, type BreadcrumbProps }