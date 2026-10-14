'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { LiveCursor } from '@/app/_context/CollaborationContext';
import { MousePointer2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveCursorsProps {
  cursors: LiveCursor[];
  containerRef?: React.RefObject<HTMLElement>;
  className?: string;
}

interface CursorPosition {
  x: number;
  y: number;
  type: 'canvas' | 'document';
  elementId?: string;
}

const LiveCursors: React.FC<LiveCursorsProps> = ({
  cursors,
  containerRef,
  className,
}) => {
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);

  // Update container bounds when container changes
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef?.current) {
        setContainerBounds(containerRef.current.getBoundingClientRect());
      }
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds);

    return () => {
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds);
    };
  }, [containerRef]);

  const getRelativePosition = (cursor: LiveCursor): CursorPosition | null => {
    try {
      const position: CursorPosition = JSON.parse(cursor.position);
      
      if (!containerBounds) return position;

      // For canvas cursors, position is relative to canvas
      if (position.type === 'canvas') {
        return {
          ...position,
          x: position.x - containerBounds.left,
          y: position.y - containerBounds.top,
        };
      }

      // For document cursors, position might be relative to document
      return position;
    } catch (error) {
      console.error('Failed to parse cursor position:', error);
      return null;
    }
  };

  const isRecentCursor = (cursor: LiveCursor) => {
    const thirtySecondsAgo = Date.now() - 30 * 1000;
    return cursor.timestamp > thirtySecondsAgo;
  };

  const visibleCursors = cursors.filter(cursor => 
    cursor.isVisible && isRecentCursor(cursor)
  );

  if (visibleCursors.length === 0) {
    return null;
  }

  return (
    <div className={cn('absolute inset-0 pointer-events-none z-50', className)}>
      <AnimatePresence>
        {visibleCursors.map((cursor) => {
          const position = getRelativePosition(cursor);
          if (!position) return null;

          return (
            <CursorComponent
              key={cursor._id}
              cursor={cursor}
              position={position}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
};

interface CursorComponentProps {
  cursor: LiveCursor;
  position: CursorPosition;
}

const CursorComponent: React.FC<CursorComponentProps> = ({ cursor, position }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Hide cursor after inactivity
  useEffect(() => {
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 5000); // Hide after 5 seconds of inactivity

    return () => clearTimeout(hideTimer);
  }, [cursor.timestamp]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: position.x,
        y: position.y,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ 
        type: 'spring',
        stiffness: 500,
        damping: 30,
        duration: 0.1,
      }}
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: 0,
        zIndex: 1000,
      }}
    >
      {/* Cursor pointer */}
      <div className="relative">
        <MousePointer2
          className="h-5 w-5 transform -rotate-12"
          style={{ color: cursor.color }}
          fill={cursor.color}
        />
        
        {/* User name label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute top-6 left-2 whitespace-nowrap"
        >
          <div
            className="px-2 py-1 rounded-md text-white text-xs font-medium shadow-lg flex items-center gap-1"
            style={{ backgroundColor: cursor.color }}
          >
            <User className="h-3 w-3" />
            {cursor.userName}
          </div>
          
          {/* Arrow pointing to cursor */}
          <div
            className="absolute -top-1 left-2 w-2 h-2 transform rotate-45"
            style={{ backgroundColor: cursor.color }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

// Hook for tracking mouse position and updating live cursor
export const useLiveCursor = (
  fileId: string | null,
  updateLiveCursor: (fileId: string, position: { x: number; y: number; type: string; elementId?: string }) => void,
  hideLiveCursor: (fileId: string) => void,
  containerRef?: React.RefObject<HTMLElement>
) => {
  const [isActive, setIsActive] = useState(false);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!fileId || !containerRef?.current) return;

    const container = containerRef.current;
    let hideTimeout: NodeJS.Timeout;
    let updateTimeout: NodeJS.Timeout;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Only update if position changed significantly
      if (!lastPosition || 
          Math.abs(x - lastPosition.x) > 5 || 
          Math.abs(y - lastPosition.y) > 5) {
        
        setLastPosition({ x, y });
        setIsActive(true);

        // Debounce cursor updates
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          updateLiveCursor(fileId, {
            x: event.clientX,
            y: event.clientY,
            type: 'canvas',
          });
        }, 50);
      }

      // Reset hide timer
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        setIsActive(false);
        hideLiveCursor(fileId);
      }, 2000); // Hide after 2 seconds of inactivity
    };

    const handleMouseLeave = () => {
      setIsActive(false);
      hideLiveCursor(fileId);
    };

    const handleMouseEnter = () => {
      setIsActive(true);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseenter', handleMouseEnter);
      clearTimeout(hideTimeout);
      clearTimeout(updateTimeout);
      
      if (fileId && isActive) {
        hideLiveCursor(fileId);
      }
    };
  }, [fileId, containerRef, updateLiveCursor, hideLiveCursor, lastPosition, isActive]);

  return { isActive };
};

export default LiveCursors;

// Document cursor component for text editor
export const DocumentLiveCursors: React.FC<{
  cursors: LiveCursor[];
  editorRef?: React.RefObject<HTMLElement>;
}> = ({ cursors, editorRef }) => {
  const documentCursors = cursors.filter(cursor => {
    try {
      const position = JSON.parse(cursor.position);
      return position.type === 'document';
    } catch {
      return false;
    }
  });

  if (documentCursors.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {documentCursors.map((cursor) => {
        try {
          const position = JSON.parse(cursor.position);
          
          return (
            <motion.div
              key={cursor._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute"
              style={{
                left: position.x,
                top: position.y,
                zIndex: 100,
              }}
            >
              {/* Text cursor line */}
              <motion.div
                className="w-0.5 h-5"
                style={{ backgroundColor: cursor.color }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
              
              {/* User label */}
              <div
                className="absolute -top-6 left-0 px-1 py-0.5 rounded text-white text-xs whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.userName}
              </div>
            </motion.div>
          );
        } catch {
          return null;
        }
      })}
    </div>
  );
};