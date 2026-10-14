import React from 'react'
import { Skeleton } from './skeleton'

interface FileListSkeletonProps {
  rows?: number
}

const FileListSkeleton: React.FC<FileListSkeletonProps> = ({ rows = 5 }) => {
  return (
    <div className="mt-10">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y-2 divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 text-sm">
          <thead className="ltr:text-left rtl:text-right bg-gray-50 dark:bg-gray-900">
            <tr>
              <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                Project Name
              </td>
              <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                Created At
              </td>
              <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                Edited
              </td>
              <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                Author
              </td>
              <td className="whitespace-nowrap px-4 py-2"></td>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="whitespace-nowrap px-4 py-2">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <Skeleton className="h-4 w-6" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { FileListSkeleton }