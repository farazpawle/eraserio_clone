# Project Rules - Eraser.io Clone

## Development Rules & Guidelines

### 🔒 **Mandatory Technical Rules**

#### 1. Backend Architecture Rules
- **NEVER use REST APIs or fetch()** - All backend operations MUST use Convex mutations/queries
- **Convex-First Pattern**: `useQuery(api.files.getFiles)` and `useMutation(api.files.create)`
- **Multi-tenant Data**: Every operation MUST include `teamId` for data isolation
- **Real-time by Default**: Use Convex subscriptions for live data, not polling

#### 2. Canvas Integration Rules
- **NEVER modify canvas directly** - Excalidraw handles ALL drawing operations
- **Event Handlers Only**: Only integrate via Excalidraw event handlers
- **No Custom Drawing Engine**: Use Excalidraw's built-in functionality
- **Collaboration Integration**: Canvas events trigger real-time updates

#### 3. Component Architecture Rules
- **shadcn/ui Pattern**: All components MUST follow `forwardRef + CVA + Radix` pattern
- **Composition API**: Use `asChild` prop for polymorphic components
- **Type Safety**: All components MUST have proper TypeScript interfaces
- **Accessibility First**: Use Radix primitives for accessible components

#### 4. Authentication Rules
- **Kinde Integration**: Use Kinde for ALL authentication operations
- **No Custom Auth**: Don't implement custom authentication flows
- **Convex Auth**: Integrate Kinde with Convex via ConvexProviderWithKinde
- **Role-based Access**: Check permissions at component and database level

### 🎯 **Code Quality Standards**

#### TypeScript Requirements
```typescript
// ✅ REQUIRED: Strict TypeScript throughout
interface ComponentProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive';
}

// ✅ REQUIRED: Proper generic typing
const useQuery = <T>(api: ConvexQuery<T>, args: QueryArgs) => { ... }

// ❌ FORBIDDEN: Any types
const data: any = getData();
```

#### Component Pattern Requirements
```typescript
// ✅ REQUIRED: Standard component pattern
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
Button.displayName = "Button"
```

#### State Management Rules
```typescript
// ✅ REQUIRED: Context for global state
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ✅ REQUIRED: Custom hooks for logic
export const useUserSettings = () => {
  // Implementation with proper error handling
};

// ❌ FORBIDDEN: Redux, Zustand, or other state libraries
```

### 📁 **File Organization Rules**

#### App Router Structure (REQUIRED)
```
app/
├── layout.tsx                 # Root layout with providers
├── page.tsx                  # Landing page
├── (routes)/                 # Route groups for organization
├── _components/              # Page-specific components
├── _context/                 # React Context providers
├── _hooks/                   # Custom hooks
└── api/                      # Minimal API routes (prefer Convex)
```

#### Component Organization (REQUIRED)
```
components/ui/                # Reusable UI components only
lib/                         # Utilities and helpers
hooks/                       # Shared custom hooks
convex/                      # Backend functions and schema
```

#### Naming Conventions (REQUIRED)
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase starting with 'use' (`useUserSettings.tsx`)
- **Files**: camelCase for utilities, PascalCase for components
- **Folders**: kebab-case (`user-management/`)

### 🔄 **Real-time Collaboration Rules**

#### Performance Requirements
- **Cursor Updates**: MUST be debounced to 100ms maximum
- **Auto-save**: MUST be throttled to 2-3 second intervals
- **Presence Updates**: Automatic cleanup of inactive users
- **Optimistic UI**: Immediate feedback with server reconciliation

#### Collaboration Patterns
```typescript
// ✅ REQUIRED: Real-time collaboration hook pattern
const {
  activeUsers,
  liveCursors,
  comments,
  updateCursorPosition,
  addComment
} = useRealTimeCollaboration({ fileId, userId });
```

### 🎨 **UI/UX Rules**

#### Theme System Requirements
- **CSS Custom Properties**: Use CSS variables for theming
- **Theme Persistence**: localStorage + Convex user settings sync
- **System Preference**: Respect user's OS theme preference
- **Dark Mode First**: Design for both light and dark modes

#### Loading State Requirements
```typescript
// ✅ REQUIRED: Consistent loading states
const { data, isLoading } = useQuery(api.files.getFiles, args);

if (isLoading) {
  return <FileListSkeleton />; // Specific skeleton component
}

return <FileList files={data} />;
```

#### Error Handling Requirements
```typescript
// ✅ REQUIRED: User-friendly error handling
import { toast } from "sonner";

try {
  await mutation();
  toast.success("Operation completed");
} catch (error) {
  console.error('Operation failed:', error);
  toast.error("Something went wrong. Please try again.");
}
```

### 🧪 **Testing Requirements**

#### Test Structure (REQUIRED)
```
Tests/
├── design-system/           # Design system tests
├── enhanced-navigation/     # Navigation tests
├── export-functionality/   # Export feature tests
├── file-management/        # File operations tests
├── keyboard-shortcuts/     # Shortcut tests
└── workspace-improvements/ # Workspace tests
```

#### Test Standards
- **Unit Tests**: REQUIRED for all new components and hooks
- **Integration Tests**: REQUIRED for feature workflows
- **React Testing Library**: Use for component testing
- **Jest**: Use for unit tests and mocking

### 🚫 **Forbidden Patterns**

#### What NOT to do
```typescript
// ❌ FORBIDDEN: Direct fetch calls
const response = await fetch('/api/files');

// ❌ FORBIDDEN: Direct canvas manipulation
canvasRef.current.getContext('2d').drawRect();

// ❌ FORBIDDEN: Non-Radix primitives for complex components
<div onClick={handleClick}>Custom Dialog</div>

// ❌ FORBIDDEN: Inline styles (use Tailwind classes)
<div style={{marginTop: '20px'}}>

// ❌ FORBIDDEN: Global state libraries
import { createStore } from 'redux';
```

### ✅ **Required Patterns**

#### What you MUST do
```typescript
// ✅ REQUIRED: Convex operations
const files = useQuery(api.files.getFiles, { teamId });
const createFile = useMutation(api.files.createFile);

// ✅ REQUIRED: Radix + CVA components
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(...);

// ✅ REQUIRED: Proper error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <Component />
</ErrorBoundary>

// ✅ REQUIRED: Tailwind classes
<div className="mt-5 flex items-center justify-between">
```

### 📋 **Code Review Checklist**

Before any code is merged, verify:
- [ ] Uses Convex for all backend operations
- [ ] Follows shadcn/ui component pattern
- [ ] Includes proper TypeScript types
- [ ] Has appropriate tests
- [ ] Follows accessibility guidelines
- [ ] Uses Tailwind CSS classes (no inline styles)
- [ ] Implements proper error handling
- [ ] Includes loading states where appropriate
- [ ] Follows file organization standards
- [ ] Updates documentation if needed

### 🎯 **Performance Standards**

#### Required Performance Metrics
- **Real-time Updates**: < 100ms latency for collaboration
- **Page Load**: < 2s initial load time
- **Bundle Size**: < 500KB initial JavaScript
- **Lighthouse Score**: > 90 for Performance and Accessibility

#### Optimization Requirements
- **Code Splitting**: Use React.lazy() for large components
- **Image Optimization**: Use Next.js Image component
- **Debounced Updates**: For high-frequency operations
- **Memoization**: Use React.memo and useMemo appropriately

These rules ensure consistency, maintainability, and scalability of the Eraser.io clone project.
