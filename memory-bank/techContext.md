# Technical Context - Eraser.io Clone

## Technology Stack

### Frontend Framework
- **Next.js 14** with App Router (not Pages Router)
- **TypeScript** for type safety throughout
- **React 18** with modern hooks and patterns

### Backend & Real-time
- **Convex** for real-time backend (primary choice, not REST APIs)
- **Real-time subscriptions** via Convex for live collaboration
- **Optimistic updates** for immediate UI feedback

### Authentication & Authorization
- **Kinde** for user authentication and management
- **Role-based permissions** (owner, admin, member, viewer)
- **Multi-tenant architecture** with team-based access control

### UI & Styling
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** component library pattern
- **Radix UI** primitives for accessible components
- **Class Variance Authority (CVA)** for component variants
- **next-themes** for dark/light mode support

### Canvas & Drawing
- **Excalidraw** for canvas drawing functionality
- **No custom drawing engine** - Excalidraw handles all canvas operations
- **Canvas event handlers** for collaboration integration

### Rich Text Editing
- **EditorJS** for rich text and structured content
- **Custom EditorJS plugins** for enhanced functionality
- **Markdown-like syntax** support

### Export & File Operations
- **jsPDF** for PDF generation
- **html2canvas** for image export
- **SVG export** via Excalidraw native functionality

### Development Tools
- **Jest** for unit testing with @testing-library/react
- **TypeScript** strict mode for type safety
- **ESLint** and **Prettier** for code quality
- **Framer Motion** for animations and transitions

## Technical Constraints

### Architecture Decisions
1. **Convex-First Backend**: All data operations must use Convex mutations/queries
2. **No Direct Canvas Modification**: Excalidraw handles all drawing operations
3. **Component Library Pattern**: All UI follows shadcn/ui + Radix patterns
4. **App Router Only**: Use Next.js 14 App Router, not Pages Router

### Performance Requirements
- **Real-time Updates**: Sub-100ms cursor and presence updates
- **Auto-save**: Throttled to 2-3 second intervals
- **Optimistic UI**: Immediate feedback with server reconciliation
- **Efficient Subscriptions**: Minimal re-renders on real-time updates

### Data Architecture
- **Multi-tenant**: All data scoped by `teamId`
- **Permission-based**: Role checking at database level
- **Real-time Sync**: Convex subscriptions for live data
- **Conflict Resolution**: Automatic and manual conflict handling

## Development Environment

### Required Tools
- **Node.js** (latest LTS)
- **npm** or **yarn** for package management
- **Convex CLI** for backend development
- **TypeScript** for development tooling

### Environment Variables
```env
# Kinde Authentication
KINDE_CLIENT_ID=
KINDE_CLIENT_SECRET=
KINDE_ISSUER_URL=
KINDE_SITE_URL=
KINDE_POST_LOGOUT_REDIRECT_URL=
KINDE_POST_LOGIN_REDIRECT_URL=

# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Production build
npm test            # Run Jest tests
npm run test:watch  # Watch mode testing
npm run test:coverage # Test coverage
```

## Dependencies

### Core Production Dependencies
- **Next.js**: `^14.2.3` (App Router)
- **React**: `^18` (modern hooks)
- **Convex**: `^1.11.3` (real-time backend)
- **@kinde-oss/kinde-auth-nextjs**: `^2.2.4` (auth)
- **@excalidraw/excalidraw**: `^0.17.6` (canvas)
- **@editorjs/editorjs**: `^2.29.1` (rich text)

### UI & Styling
- **@radix-ui/react-***: Various Radix primitives
- **tailwindcss**: `^3.4.1` (styling)
- **class-variance-authority**: `^0.7.0` (variants)
- **lucide-react**: `^0.378.0` (icons)
- **next-themes**: `^0.3.0` (theme management)

### Utilities
- **clsx** + **tailwind-merge**: Class name utilities
- **lodash**: `^4.17.21` (utility functions)
- **moment**: `^2.30.1` (date handling)
- **sonner**: `^1.4.41` (toast notifications)

### Export & File Handling
- **jspdf**: `^3.0.1` (PDF generation)
- **html2canvas**: `^1.4.1` (image capture)

## File Structure Patterns

### App Router Structure
```
app/
├── layout.tsx                  # Root layout with providers
├── page.tsx                   # Landing page
├── globals.css                # Global styles
├── (routes)/                  # Route groups
│   ├── dashboard/             # Dashboard pages
│   ├── teams/                 # Team management
│   └── workspace/             # Workspace/file editing
├── _components/               # Page-specific components
├── _context/                  # React Context providers
├── _hooks/                    # Custom hooks
└── api/                       # API routes (minimal with Convex)
```

### Component Organization
```
components/ui/                 # Reusable UI components
├── button.tsx                # shadcn/ui pattern
├── dialog.tsx                # Radix primitives
├── input.tsx                 # Form components
└── ...                       # Other UI primitives
```

### Backend Structure (Convex)
```
convex/
├── schema.ts                 # Database schema
├── files.ts                  # File operations
├── teams.ts                  # Team management
├── user.ts                   # User operations
├── userPresence.ts           # Real-time presence
├── liveCursors.ts            # Live cursor tracking
├── comments.ts               # Comment system
└── _generated/               # Auto-generated types
```

## Integration Patterns

### Real-time Collaboration
```typescript
// Standard Convex hook pattern
const files = useQuery(api.files.getFiles, { teamId });
const createFile = useMutation(api.files.createFile);

// Real-time updates via Convex subscriptions
const activeUsers = useQuery(api.userPresence.getActiveUsers, { fileId });
```

### Context Providers
```typescript
// Global state management via Context
const { theme, setTheme } = useTheme();
const { activeUsers, updateCursor } = useCollaboration();
```

### Component Patterns
```typescript
// shadcn/ui component pattern with CVA
const buttonVariants = cva("base-classes", {
  variants: { variant: { default: "...", destructive: "..." } }
});
```
