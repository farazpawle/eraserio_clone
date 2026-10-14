# System Patterns - Eraser.io Clone

## Architectural Patterns

### Multi-Tenant Architecture
**Pattern**: Team-scoped data with role-based access control
```typescript
// All data operations include teamId
const files = useQuery(api.files.getFiles, { teamId });
const createFile = useMutation(api.files.createFile, { 
  fileName, teamId, createdBy 
});
```

**Key Principles**:
- Every data operation scoped by `teamId`
- Role-based permissions at database level: `owner`, `admin`, `member`, `viewer`
- Team isolation ensures data security between organizations

### Real-time Collaboration Pattern
**Pattern**: Convex subscriptions with optimistic updates
```typescript
// Real-time data sync
const activeUsers = useQuery(api.userPresence.getActiveUsers, { fileId });
const liveCursors = useQuery(api.liveCursors.getLiveCursors, { fileId });

// Optimistic mutations
const updateCursor = useMutation(api.liveCursors.updateCursor);
```

**Components**:
- **User Presence**: Track who's viewing/editing files
- **Live Cursors**: Real-time cursor positions with user colors
- **Conflict Resolution**: Automatic and manual conflict handling
- **Comments System**: Threaded comments with @mentions

### Context Provider Pattern
**Pattern**: Global state management via React Context
```typescript
// Theme management
<ThemeProvider>
  <CollaborationProvider>
    <FileManagementProvider>
      <App />
    </FileManagementProvider>
  </CollaborationProvider>
</ThemeProvider>
```

**Contexts**:
- `ThemeContext`: Dark/light/system theme with localStorage persistence
- `CollaborationContext`: Real-time collaboration state
- `FileListContext`: File management and filtering
- `KeyboardShortcutsContext`: Configurable shortcuts

## Component Design Patterns

### shadcn/ui Component Pattern
**Pattern**: Radix primitives + CVA variants + forwardRef
```typescript
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

### Composition Pattern
**Pattern**: Flexible component composition using Radix Slot
```typescript
// Usage allows polymorphic components
<Button asChild>
  <Link href="/dashboard">Go to Dashboard</Link>
</Button>
```

### Hook-Based State Management
**Pattern**: Custom hooks for reusable logic
```typescript
export const useUserSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load from localStorage + Convex sync
  // Return structured interface
  return { settings, updateTheme, updatePreferences, isLoading };
};
```

## Data Flow Patterns

### Convex-First Backend Pattern
**Pattern**: No REST APIs, only Convex mutations/queries
```typescript
// ❌ Avoid fetch/axios
const response = await fetch('/api/files');

// ✅ Use Convex mutations/queries
const files = useQuery(api.files.getFiles, { teamId });
const createFile = useMutation(api.files.createFile);
```

### Optimistic Updates Pattern
**Pattern**: Immediate UI updates with server reconciliation
```typescript
const handleCreateFile = async (fileName: string) => {
  // Optimistic update
  setFiles(prev => [...prev, { id: 'temp', fileName, status: 'creating' }]);
  
  try {
    const newFile = await createFile({ fileName, teamId });
    // Server reconciliation happens automatically via Convex
  } catch (error) {
    // Revert optimistic update on error
    setFiles(prev => prev.filter(f => f.id !== 'temp'));
    toast.error('Failed to create file');
  }
};
```

### Error Handling Pattern
**Pattern**: Consistent error handling with user feedback
```typescript
import { toast } from "sonner";

try {
  await mutation();
  toast.success("Operation completed successfully");
} catch (error) {
  console.error('Operation failed:', error);
  toast.error("Something went wrong. Please try again.");
}
```

## UI/UX Patterns

### Loading State Pattern
**Pattern**: Consistent loading states across components
```typescript
// Standard loading pattern
const { data, isLoading } = useQuery(api.files.getFiles, args);

if (isLoading) {
  return <FileListSkeleton />;
}

return <FileList files={data} />;
```

### Theme System Pattern
**Pattern**: CSS custom properties with Tailwind integration
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
}

[data-theme="dark"] {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
}
```

### Export System Pattern
**Pattern**: Progressive enhancement with feedback
```typescript
const handleExport = async (format: 'pdf' | 'png' | 'svg') => {
  setExportProgress({ isExporting: true, progress: 0 });
  
  try {
    switch (format) {
      case 'pdf':
        await exportToPDF(canvasRef.current);
        break;
      case 'png':
        await exportToPNG(canvasRef.current);
        break;
      case 'svg':
        await exportToSVG(canvasRef.current);
        break;
    }
    toast.success(`Exported as ${format.toUpperCase()}`);
  } finally {
    setExportProgress({ isExporting: false, progress: 100 });
  }
};
```

## Security Patterns

### Authentication Integration Pattern
**Pattern**: Kinde authentication with Convex auth
```typescript
// ConvexClientProvider integration
<ConvexProviderWithKinde>
  <App />
</ConvexProviderWithKinde>

// Usage in components
const { user, isAuthenticated } = useKindeBrowserClient();
```

### Permission Checking Pattern
**Pattern**: Role-based access control at component level
```typescript
const canEdit = useMemo(() => {
  const userRole = teamMembers?.find(m => m.userId === user?.id)?.role;
  return ['owner', 'admin', 'member'].includes(userRole);
}, [teamMembers, user]);

// Conditional rendering based on permissions
{canEdit && <EditButton />}
```

## Performance Patterns

### Real-time Update Optimization
**Pattern**: Debounced updates for high-frequency events
```typescript
// Cursor position updates
const debouncedUpdateCursor = useMemo(
  () => debounce((position) => {
    updateCursorMutation({ fileId, position });
  }, 100),
  [updateCursorMutation, fileId]
);
```

### Canvas Integration Pattern
**Pattern**: Excalidraw event handlers for collaboration
```typescript
// Canvas change handler
const handleCanvasChange = useCallback((elements, appState) => {
  // Throttled auto-save
  debouncedSave(elements, appState);
  
  // Update user presence
  updateUserActivity('editing');
}, [debouncedSave, updateUserActivity]);
```

### Component Splitting Pattern
**Pattern**: Code splitting for large components
```typescript
// Lazy load heavy components
const CanvasEditor = lazy(() => import('./CanvasEditor'));
const DocumentEditor = lazy(() => import('./DocumentEditor'));

// Usage with Suspense
<Suspense fallback={<CanvasLoading />}>
  <CanvasEditor />
</Suspense>
```

## Key Design Principles

1. **Convex-First**: All backend operations use Convex, not REST
2. **Real-time by Default**: Live collaboration is core, not an add-on
3. **Composition over Configuration**: Flexible component APIs
4. **Progressive Enhancement**: Features work without JavaScript, enhanced with it
5. **Type Safety**: TypeScript throughout with strict mode
6. **Performance-Conscious**: Debounced updates, optimistic UI, lazy loading
7. **Accessible by Default**: Radix primitives ensure accessibility compliance
