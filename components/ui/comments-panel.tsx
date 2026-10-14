'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  Send,
  Clock,
} from 'lucide-react';
import { Comment } from '@/app/_context/CollaborationContext';
import moment from 'moment';
import { toast } from 'sonner';

interface CommentsPanelProps {
  fileId: string;
  comments: Comment[];
  onAddComment: (content: string, position?: any) => Promise<void>;
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
  className?: string;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({
  fileId,
  comments,
  onAddComment,
  currentUser,
  className,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
        <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Comments</h3>
        <Badge variant="secondary" className="ml-auto">
          {comments.length}
        </Badge>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1 p-4">
        {comments.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm">Be the first to add a comment!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment._id}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
              >
                {/* Comment Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                    {getUserInitials(comment.userName)}
                  </div>
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {comment.userName}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    <Clock className="h-3 w-3" />
                    {moment(comment.createdAt).fromNow()}
                  </div>
                </div>
                
                {/* Comment Content */}
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {comment.content}
                </p>
                
                {/* Comment Status */}
                {comment.isResolved && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    Resolved
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Add Comment Form */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Add a comment..."
            className="min-h-[80px] resize-none"
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Press Ctrl+Enter to submit
            </p>
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              {isSubmitting ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsPanel;