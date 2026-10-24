"use client";
import React from "react";
import moment from "moment";
import { AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";

const block = "bg-g-hover";

// Shown while the file loads. Mirrors the real layout: header bar, document column, canvas.
export const WorkspaceSkeleton = () => (
  <div className="flex h-screen flex-col bg-g-bg text-g-text">
    <div className="flex h-[52px] flex-none items-center justify-between gap-3 border-b border-g-line bg-g-panel px-3">
      <div className="flex items-center gap-3">
        <Skeleton className={`h-8 w-8 rounded-lg ${block}`} />
        <Skeleton className={`h-5 w-40 ${block}`} />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className={`h-8 w-36 rounded-lg ${block}`} />
        <Skeleton className={`h-8 w-16 ${block}`} />
      </div>
    </div>

    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <div className="space-y-4 text-center">
        <div data-testid="loading-spinner" className="flex justify-center text-g-accent">
          <LoadingSpinner size="lg" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium text-g-text">Loading your workspace...</p>
          <p className="text-sm text-g-muted">Please wait while we fetch your file data</p>
        </div>

        <div className="mx-auto mt-8 hidden w-full max-w-3xl gap-4 sm:flex" aria-hidden="true">
          <div className="flex-1 space-y-3">
            <Skeleton className={`h-8 w-full ${block}`} />
            <Skeleton className={`h-4 w-3/4 ${block}`} />
            <Skeleton className={`h-4 w-1/2 ${block}`} />
            <Skeleton className={`h-32 w-full ${block}`} />
          </div>
          <div className="w-px bg-g-line" />
          <div className="flex-1 space-y-3">
            <div className="flex justify-center gap-2">
              <Skeleton className={`h-8 w-8 rounded ${block}`} />
              <Skeleton className={`h-8 w-8 rounded ${block}`} />
              <Skeleton className={`h-8 w-8 rounded ${block}`} />
            </div>
            <Skeleton className={`h-48 w-full rounded-lg ${block}`} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const WorkspaceError = ({ message }: { message: string }) => (
  <div className="flex h-screen items-center justify-center bg-g-bg p-4 text-g-text">
    <div className="max-w-md space-y-4 text-center">
      <AlertTriangle className="mx-auto h-14 w-14 text-g-danger" aria-hidden="true" />
      <h2 className="text-xl font-semibold">Failed to Load File</h2>
      <p className="text-g-muted">{message}</p>
      <div className="flex justify-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex h-10 items-center rounded-md bg-g-accent px-4 text-sm font-semibold text-g-accent-ink hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent focus-visible:ring-offset-2 focus-visible:ring-offset-g-bg max-md:min-h-11"
        >
          Try Again
        </button>
        <button
          onClick={() => window.history.back()}
          className="inline-flex h-10 items-center rounded-md border border-g-line-2 bg-g-panel-2 px-4 text-sm font-medium hover:bg-g-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:min-h-11"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
);

export const DocEyebrow = ({ updatedAt }: { updatedAt: string }) => (
  <p className="mb-2 text-xs text-g-faint">Document · edited {moment(updatedAt).fromNow()}</p>
);
