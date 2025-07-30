import React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ProgressIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'idle'
  message?: string
  progress?: number
  className?: string
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  status,
  message,
  progress,
  className
}) => {
  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600 dark:text-blue-400'
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (status === 'idle') return null

  return (
    <div className={cn('flex items-center gap-2 p-2', className)}>
      {getIcon()}
      {message && (
        <span className={cn('text-sm', getStatusColor())}>
          {message}
        </span>
      )}
      {progress !== undefined && status === 'loading' && (
        <div className="flex-1 max-w-xs">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  )
}

export { ProgressIndicator }