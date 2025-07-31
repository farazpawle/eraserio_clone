'use client'

import { useState, useCallback, useRef } from 'react'
import { FILE } from '@/app/dashboard/_components/FileList'

export interface DragState {
  isDragging: boolean
  draggedFile: FILE | null
  dragOverFile: FILE | null
  dropPosition: 'before' | 'after' | null
}

export interface DragAndDropHandlers {
  onDragStart: (file: FILE) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, file: FILE) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, targetFile: FILE) => void
  onFileReorder: (draggedFile: FILE, targetFile: FILE, position: 'before' | 'after') => void
}

export interface UseDragAndDropProps {
  files: FILE[]
  onReorder?: (files: FILE[]) => void
  disabled?: boolean
}

export const useDragAndDrop = ({
  files,
  onReorder,
  disabled = false
}: UseDragAndDropProps) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedFile: null,
    dragOverFile: null,
    dropPosition: null
  })
  
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleDragStart = useCallback((file: FILE) => {
    if (disabled) return
    
    setDragState({
      isDragging: true,
      draggedFile: file,
      dragOverFile: null,
      dropPosition: null
    })
    
    // Add visual feedback class to body
    document.body.classList.add('dragging-file')
  }, [disabled])
  
  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedFile: null,
      dragOverFile: null,
      dropPosition: null
    })
    
    // Remove visual feedback class from body
    document.body.classList.remove('dragging-file')
    
    // Clear any pending timeouts
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
      dragTimeoutRef.current = null
    }
  }, [])
  
  const handleDragOver = useCallback((e: React.DragEvent, file: FILE) => {
    if (disabled || !dragState.draggedFile || dragState.draggedFile._id === file._id) {
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    // Calculate drop position based on mouse position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const position = e.clientY < midpoint ? 'before' : 'after'
    
    setDragState(prev => ({
      ...prev,
      dragOverFile: file,
      dropPosition: position
    }))
  }, [disabled, dragState.draggedFile])
  
  const handleDragLeave = useCallback(() => {
    // Use timeout to prevent flickering when moving between child elements
    dragTimeoutRef.current = setTimeout(() => {
      setDragState(prev => ({
        ...prev,
        dragOverFile: null,
        dropPosition: null
      }))
    }, 50)
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent, targetFile: FILE) => {
    if (disabled || !dragState.draggedFile || dragState.draggedFile._id === targetFile._id) {
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    const { draggedFile, dropPosition } = dragState
    
    if (draggedFile && dropPosition) {
      handleFileReorder(draggedFile, targetFile, dropPosition)
    }
    
    handleDragEnd()
  }, [disabled, dragState])
  
  const handleFileReorder = useCallback((draggedFile: FILE, targetFile: FILE, position: 'before' | 'after') => {
    if (!onReorder) return
    
    const newFiles = [...files]
    const draggedIndex = newFiles.findIndex(f => f._id === draggedFile._id)
    const targetIndex = newFiles.findIndex(f => f._id === targetFile._id)
    
    if (draggedIndex === -1 || targetIndex === -1) return
    
    // Remove dragged file from its current position
    const [removed] = newFiles.splice(draggedIndex, 1)
    
    // Calculate new insertion index
    let insertIndex = targetIndex
    if (draggedIndex < targetIndex) {
      insertIndex = targetIndex - 1
    }
    
    if (position === 'after') {
      insertIndex += 1
    }
    
    // Insert at new position
    newFiles.splice(insertIndex, 0, removed)
    
    onReorder(newFiles)
  }, [files, onReorder])
  
  const isDraggedFile = useCallback((file: FILE) => {
    return dragState.draggedFile?._id === file._id
  }, [dragState.draggedFile])
  
  const isDragOverFile = useCallback((file: FILE) => {
    return dragState.dragOverFile?._id === file._id
  }, [dragState.dragOverFile])
  
  const getDropIndicatorPosition = useCallback((file: FILE) => {
    if (!isDragOverFile(file)) return null
    return dragState.dropPosition
  }, [isDragOverFile, dragState.dropPosition])
  
  const handlers: DragAndDropHandlers = {
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onFileReorder: handleFileReorder
  }
  
  return {
    dragState,
    handlers,
    isDraggedFile,
    isDragOverFile,
    getDropIndicatorPosition,
    disabled
  }
}

export default useDragAndDrop