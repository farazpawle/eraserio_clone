import React from 'react'
import { LoadingSpinner } from './loading-spinner'
import { Skeleton } from './skeleton'

interface CanvasLoadingProps {
  message?: string
}

const CanvasLoading: React.FC<CanvasLoadingProps> = ({ 
  message = "Loading canvas..." 
}) => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            {message}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please wait while we prepare your workspace
          </p>
        </div>
        
        {/* Skeleton representation of canvas tools */}
        <div className="mt-8 space-y-4">
          <div className="flex justify-center space-x-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <div className="flex justify-center">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    </div>
  )
}

export { CanvasLoading }