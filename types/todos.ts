// Todo Status enum
export type TodoStatus = "pending" | "in-progress" | "completed";

// Todo Priority enum
export type TodoPriority = "low" | "medium" | "high";

// Main Todo interface
export interface Todo {
  _id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate?: number; // timestamp
  fileId: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  order: number;
  tags?: string[];
  _creationTime: number;
}

// Input interfaces for CRUD operations
export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: TodoPriority;
  dueDate?: number;
  tags?: string[];
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: number;
  tags?: string[];
}

// Todo statistics interface
export interface TodoStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  overdue: number;
}

// Todo filter interface
export interface TodoFilter {
  status?: TodoStatus;
  priority?: TodoPriority;
  tag?: string;
  searchQuery?: string;
  showCompleted?: boolean;
  dueDateBefore?: number;
  dueDateAfter?: number;
}

// Todo sort options
export type TodoSortField = "title" | "createdAt" | "updatedAt" | "dueDate" | "priority" | "status" | "order";
export type TodoSortDirection = "asc" | "desc";

export interface TodoSortConfig {
  field: TodoSortField;
  direction: TodoSortDirection;
}

// Todo bulk operations
export interface TodoBulkOperation {
  action: "delete" | "complete" | "updateStatus" | "updatePriority";
  todoIds: string[];
  newStatus?: TodoStatus;
  newPriority?: TodoPriority;
}

// Todo export options
export interface TodoExportOptions {
  format: "csv" | "json" | "pdf";
  includeCompleted?: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
  priorities?: TodoPriority[];
  statuses?: TodoStatus[];
}

// Todo template interface
export interface TodoTemplate {
  id: string;
  name: string;
  description: string;
  todos: Omit<CreateTodoInput, "fileId" | "createdBy">[];
  tags: string[];
  category: string;
}

// Todo notification interface
export interface TodoNotification {
  id: string;
  todoId: string;
  type: "due_soon" | "overdue" | "reminder";
  message: string;
  scheduledAt: number;
  sentAt?: number;
  dismissed?: boolean;
}

// Todo progress tracking
export interface TodoProgress {
  fileId: string;
  totalTodos: number;
  completedTodos: number;
  completionPercentage: number;
  lastUpdated: number;
  trends: {
    todayAdded: number;
    todayCompleted: number;
    weeklyCompletion: number;
    avgCompletionTime: number; // in milliseconds
  };
}

// Todo context interface for React context
export interface TodoContextType {
  // State
  todos: Todo[];
  filteredTodos: Todo[];
  isLoading: boolean;
  error: string | null;
  filter: TodoFilter;
  sortConfig: TodoSortConfig;
  selectedTodos: Set<string>;
  
  // Actions
  createTodo: (input: CreateTodoInput) => Promise<string>;
  updateTodo: (id: string, input: UpdateTodoInput) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  updateTodoStatus: (id: string, status: TodoStatus) => Promise<void>;
  reorderTodos: (todoIds: string[]) => Promise<void>;
  
  // Filtering and sorting
  setFilter: (filter: Partial<TodoFilter>) => void;
  clearFilter: () => void;
  setSortConfig: (config: TodoSortConfig) => void;
  
  // Selection
  selectTodo: (id: string) => void;
  deselectTodo: (id: string) => void;
  toggleTodoSelection: (id: string) => void;
  selectAllTodos: () => void;
  clearSelection: () => void;
  
  // Bulk operations
  bulkOperation: (operation: TodoBulkOperation) => Promise<void>;
  
  // Utilities
  getTodoStats: () => TodoStats;
  getOverdueTodos: () => Todo[];
  getTodosByPriority: (priority: TodoPriority) => Todo[];
  getTodosByStatus: (status: TodoStatus) => Todo[];
}

// Todo component props interfaces
export interface TodoItemProps {
  todo: Todo;
  onUpdate: (id: string, input: UpdateTodoInput) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TodoStatus) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (todo: Todo) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, todo: Todo) => void;
  onDrop?: (e: React.DragEvent, todo: Todo) => void;
}

export interface TodoListProps {
  fileId: string;
  todos: Todo[];
  onTodoUpdate: (id: string, input: UpdateTodoInput) => void;
  onTodoDelete: (id: string) => void;
  onTodoCreate: (input: CreateTodoInput) => void;
  onReorder: (todoIds: string[]) => void;
  isLoading?: boolean;
  className?: string;
}

export interface TodoFormProps {
  todo?: Todo; // For editing existing todo
  onSubmit: (input: CreateTodoInput | UpdateTodoInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface TodoFilterProps {
  filter: TodoFilter;
  onFilterChange: (filter: Partial<TodoFilter>) => void;
  onClearFilter: () => void;
  showCompletedCount?: number;
  totalCount?: number;
}

export interface TodoStatsProps {
  stats: TodoStats;
  className?: string;
  showTrends?: boolean;
}

// Drag and drop interfaces
export interface TodoDragState {
  isDragging: boolean;
  draggedTodo: Todo | null;
  dragOverTodo: Todo | null;
  dropPosition: "above" | "below" | null;
}

export interface TodoDragHandlers {
  onDragStart: (todo: Todo) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, todo: Todo) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, todo: Todo) => void;
}

// Todo panel props for workspace integration
export interface TodoPanelProps {
  fileId: string;
  isVisible: boolean;
  onToggle: () => void;
  onResize?: (width: number) => void;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}

// Hook return types
export interface UseTodoReturn {
  todos: Todo[];
  createTodo: (input: CreateTodoInput) => Promise<string>;
  updateTodo: (id: string, input: UpdateTodoInput) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  updateTodoStatus: (id: string, status: TodoStatus) => Promise<void>;
  reorderTodos: (todoIds: string[]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface UseTodoFilterReturn {
  filteredTodos: Todo[];
  filter: TodoFilter;
  setFilter: (filter: Partial<TodoFilter>) => void;
  clearFilter: () => void;
  sortConfig: TodoSortConfig;
  setSortConfig: (config: TodoSortConfig) => void;
}

export interface UseTodoSelectionReturn {
  selectedTodos: Set<string>;
  selectTodo: (id: string) => void;
  deselectTodo: (id: string) => void;
  toggleTodoSelection: (id: string) => void;
  selectAllTodos: (todoIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}
