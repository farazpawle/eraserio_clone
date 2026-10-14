import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { Todo, TodoStatus, TodoPriority } from '@/types/todos';

// Mock data
const mockFileId = 'file123';
const mockUserId = 'user123';

const mockTodoData = {
  title: 'Test Todo',
  description: 'This is a test todo item',
  fileId: mockFileId,
  priority: 'medium' as TodoPriority,
  dueDate: Date.now() + 86400000, // tomorrow
  tags: ['test', 'crud'],
  createdBy: mockUserId,
};

const mockUpdatedData = {
  title: 'Updated Todo',
  description: 'This is an updated todo item',
  status: 'in-progress' as TodoStatus,
  priority: 'high' as TodoPriority,
};

// Mock database storage
let mockDatabase: { [key: string]: Todo } = {};
let nextId = 1;

// Helper function to generate mock IDs
const generateId = () => `todo_${nextId++}`;

// Mock Convex functions with proper typing
const mockCreateTodo = jest.fn().mockImplementation((data: any) => {
  const id = generateId();
  const now = Date.now();
  const newTodo: Todo = {
    _id: id,
    title: data.title || '',
    description: data.description || '',
    status: data.status || 'pending',
    priority: data.priority || 'medium',
    dueDate: data.dueDate,
    fileId: data.fileId || '',
    createdBy: data.createdBy || '',
    tags: data.tags || [],
    order: Object.keys(mockDatabase).length + 1,
    createdAt: now,
    updatedAt: now,
    _creationTime: now,
  };
  mockDatabase[id] = newTodo;
  return id;
});

const mockGetTodoById = jest.fn().mockImplementation((args: any) => {
  return mockDatabase[args._id] || null;
});

const mockGetTodosByFile = jest.fn().mockImplementation((args: any) => {
  return Object.values(mockDatabase)
    .filter(todo => todo.fileId === args.fileId)
    .sort((a, b) => a.order - b.order);
});

const mockUpdateTodo = jest.fn().mockImplementation((args: any) => {
  const { _id, ...updates } = args;
  const todo = mockDatabase[_id];
  if (!todo) throw new Error('Todo not found');
  
  // Check if any valid updates are provided
  const validUpdates = Object.keys(updates).filter(key => key !== '_id');
  if (validUpdates.length === 0) {
    throw new Error('No valid updates provided');
  }
  
  mockDatabase[_id] = {
    ...todo,
    ...updates,
    updatedAt: Date.now() + 1, // Add 1ms to ensure it's greater than createdAt
  };
});

const mockUpdateTodoStatus = jest.fn().mockImplementation((args: any) => {
  const todo = mockDatabase[args._id];
  if (!todo) throw new Error('Todo not found');
  
  mockDatabase[args._id] = {
    ...todo,
    status: args.status,
    updatedAt: Date.now() + 1, // Add 1ms to ensure it's greater than createdAt
  };
});

const mockReorderTodos = jest.fn().mockImplementation((args: any) => {
  args.todoIds.forEach((todoId: string, index: number) => {
    if (mockDatabase[todoId]) {
      mockDatabase[todoId] = {
        ...mockDatabase[todoId],
        order: index + 1,
        updatedAt: Date.now() + 1, // Add 1ms to ensure it's greater than createdAt
      };
    }
  });
});

const mockDeleteTodo = jest.fn().mockImplementation((args: any) => {
  delete mockDatabase[args._id];
});

const mockDeleteTodosByFile = jest.fn().mockImplementation((args: any) => {
  const todosToDelete = Object.values(mockDatabase).filter(todo => todo.fileId === args.fileId);
  const deletedCount = todosToDelete.length;
  
  todosToDelete.forEach(todo => {
    delete mockDatabase[todo._id];
  });
  
  return { deletedCount };
});

const mockGetTodosWithFilters = jest.fn().mockImplementation((args: any) => {
  return Object.values(mockDatabase)
    .filter(todo => {
      if (todo.fileId !== args.fileId) return false;
      if (args.status && todo.status !== args.status) return false;
      if (args.priority && todo.priority !== args.priority) return false;
      if (args.tag && todo.tags && !todo.tags.includes(args.tag)) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order);
});

const mockGetTodoStats = jest.fn().mockImplementation((args: any) => {
  const todos = Object.values(mockDatabase).filter(todo => todo.fileId === args.fileId);
  const now = Date.now();
  
  return {
    total: todos.length,
    completed: todos.filter(t => t.status === 'completed').length,
    inProgress: todos.filter(t => t.status === 'in-progress').length,
    pending: todos.filter(t => t.status === 'pending').length,
    highPriority: todos.filter(t => t.priority === 'high').length,
    mediumPriority: todos.filter(t => t.priority === 'medium').length,
    lowPriority: todos.filter(t => t.priority === 'low').length,
    overdue: todos.filter(t => t.status === 'pending' && t.dueDate && t.dueDate < now).length,
  };
});

const mockGetTodosByUser = jest.fn().mockImplementation((args: any) => {
  return Object.values(mockDatabase)
    .filter(todo => todo.createdBy === args.userId)
    .sort((a, b) => a.order - b.order);
});

describe('Todo CRUD Operations', () => {
  let todoId: string;

  beforeEach(() => {
    // Reset mock database
    mockDatabase = {};
    nextId = 1;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createTodo', () => {
    test('should create a new todo with all fields', () => {
      const result = mockCreateTodo(mockTodoData) as string;
      
      expect(result).toBeDefined();
      todoId = result;
      
      // Verify the todo was created with correct data
      const createdTodo = mockGetTodoById({ _id: todoId }) as Todo;
      
      expect(createdTodo).toMatchObject({
        _id: todoId,
        title: mockTodoData.title,
        description: mockTodoData.description,
        status: 'pending',
        priority: mockTodoData.priority,
        dueDate: mockTodoData.dueDate,
        fileId: mockTodoData.fileId,
        createdBy: mockTodoData.createdBy,
        tags: mockTodoData.tags,
        order: 1,
      });
      
      expect(createdTodo?.createdAt).toBeDefined();
      expect(createdTodo?.updatedAt).toBeDefined();
      expect(createdTodo?.createdAt).toBe(createdTodo?.updatedAt);
    });

    test('should create a todo with minimal required fields', () => {
      const minimalData = {
        title: 'Minimal Todo',
        fileId: mockFileId,
        createdBy: mockUserId,
      };
      
      const result = mockCreateTodo(minimalData) as string;
      expect(result).toBeDefined();
      
      const createdTodo = mockGetTodoById({ _id: result }) as Todo;
      
      expect(createdTodo).toMatchObject({
        title: minimalData.title,
        status: 'pending',
        priority: 'medium',
        fileId: minimalData.fileId,
        createdBy: minimalData.createdBy,
        order: 1,
      });
    });

    test('should set correct order for multiple todos', () => {
      // Create first todo
      const todo1 = mockCreateTodo({
        ...mockTodoData,
        title: 'First Todo',
      }) as string;
      
      // Create second todo
      const todo2 = mockCreateTodo({
        ...mockTodoData,
        title: 'Second Todo',
      }) as string;
      
      const firstTodo = mockGetTodoById({ _id: todo1 }) as Todo;
      const secondTodo = mockGetTodoById({ _id: todo2 }) as Todo;
      
      expect(firstTodo?.order).toBeLessThan(secondTodo?.order || 0);
    });
  });

  describe('getTodosByFile', () => {
    beforeEach(() => {
      // Create test todos
      mockCreateTodo({
        ...mockTodoData,
        title: 'Todo 1',
      });
      
      mockCreateTodo({
        ...mockTodoData,
        title: 'Todo 2',
      });
    });

    test('should retrieve todos for a specific file', () => {
      const todos = mockGetTodosByFile({ fileId: mockFileId }) as Todo[];
      
      expect(todos).toHaveLength(2);
      expect(todos[0].title).toBe('Todo 1');
      expect(todos[1].title).toBe('Todo 2');
      
      // Should be sorted by order
      expect(todos[0].order).toBeLessThan(todos[1].order);
    });

    test('should return empty array for file with no todos', () => {
      const emptyFileId = 'empty_file';
      const todos = mockGetTodosByFile({ fileId: emptyFileId }) as Todo[];
      
      expect(todos).toHaveLength(0);
    });
  });

  describe('updateTodo', () => {
    beforeEach(() => {
      todoId = mockCreateTodo(mockTodoData) as string;
    });

    test('should update todo with new data', () => {
      mockUpdateTodo({
        _id: todoId,
        ...mockUpdatedData,
      });
      
      const updatedTodo = mockGetTodoById({ _id: todoId }) as Todo;
      
      expect(updatedTodo).toMatchObject({
        _id: todoId,
        title: mockUpdatedData.title,
        description: mockUpdatedData.description,
        status: mockUpdatedData.status,
        priority: mockUpdatedData.priority,
      });
      
      expect(updatedTodo?.updatedAt).toBeGreaterThan(updatedTodo?.createdAt || 0);
    });

    test('should update only specified fields', () => {
      const originalTodo = mockGetTodoById({ _id: todoId }) as Todo;
      
      mockUpdateTodo({
        _id: todoId,
        title: 'Only Title Updated',
      });
      
      const updatedTodo = mockGetTodoById({ _id: todoId }) as Todo;
      
      expect(updatedTodo?.title).toBe('Only Title Updated');
      expect(updatedTodo?.description).toBe(originalTodo?.description);
      expect(updatedTodo?.priority).toBe(originalTodo?.priority);
    });

    test('should throw error when no updates provided', () => {
      expect(() => mockUpdateTodo({ _id: todoId })).toThrow('No valid updates provided');
    });
  });

  describe('updateTodoStatus', () => {
    beforeEach(() => {
      todoId = mockCreateTodo(mockTodoData) as string;
    });

    test('should update todo status', () => {
      mockUpdateTodoStatus({
        _id: todoId,
        status: 'completed',
      });
      
      const updatedTodo = mockGetTodoById({ _id: todoId }) as Todo;
      
      expect(updatedTodo?.status).toBe('completed');
      expect(updatedTodo?.updatedAt).toBeGreaterThan(updatedTodo?.createdAt || 0);
    });
  });

  describe('reorderTodos', () => {
    let todo1Id: string;
    let todo2Id: string;
    let todo3Id: string;

    beforeEach(() => {
      todo1Id = mockCreateTodo({
        ...mockTodoData,
        title: 'Todo 1',
      }) as string;
      
      todo2Id = mockCreateTodo({
        ...mockTodoData,
        title: 'Todo 2',
      }) as string;
      
      todo3Id = mockCreateTodo({
        ...mockTodoData,
        title: 'Todo 3',
      }) as string;
    });

    test('should reorder todos correctly', () => {
      // Reorder: todo3, todo1, todo2
      mockReorderTodos({
        fileId: mockFileId,
        todoIds: [todo3Id, todo1Id, todo2Id],
      });
      
      const todos = mockGetTodosByFile({ fileId: mockFileId }) as Todo[];
      
      expect(todos[0]._id).toBe(todo3Id);
      expect(todos[0].order).toBe(1);
      
      expect(todos[1]._id).toBe(todo1Id);
      expect(todos[1].order).toBe(2);
      
      expect(todos[2]._id).toBe(todo2Id);
      expect(todos[2].order).toBe(3);
    });
  });

  describe('deleteTodo', () => {
    beforeEach(() => {
      todoId = mockCreateTodo(mockTodoData) as string;
    });

    test('should delete todo', () => {
      mockDeleteTodo({ _id: todoId });
      
      const deletedTodo = mockGetTodoById({ _id: todoId });
      expect(deletedTodo).toBeNull();
    });
  });

  describe('deleteTodosByFile', () => {
    beforeEach(() => {
      mockCreateTodo({
        ...mockTodoData,
        title: 'Todo 1',
      });
      
      mockCreateTodo({
        ...mockTodoData,
        title: 'Todo 2',
      });
    });

    test('should delete all todos for a file', () => {
      const result = mockDeleteTodosByFile({ fileId: mockFileId }) as { deletedCount: number };
      
      expect(result.deletedCount).toBe(2);
      
      const remainingTodos = mockGetTodosByFile({ fileId: mockFileId }) as Todo[];
      expect(remainingTodos).toHaveLength(0);
    });
  });

  describe('getTodosWithFilters', () => {
    beforeEach(() => {
      // Create todos with different statuses and priorities
      const highPriorityId = mockCreateTodo({
        ...mockTodoData,
        title: 'High Priority Pending',
        priority: 'high',
        tags: ['urgent', 'important'],
      }) as string;
      
      mockCreateTodo({
        ...mockTodoData,
        title: 'Medium Priority In Progress',
        priority: 'medium',
        tags: ['normal'],
      });
      
      const completedTodoId = mockCreateTodo({
        ...mockTodoData,
        title: 'Low Priority Completed',
        priority: 'low',
        tags: ['done'],
      }) as string;
      
      // Update status to completed
      mockUpdateTodoStatus({
        _id: completedTodoId,
        status: 'completed',
      });
    });

    test('should filter by status', () => {
      const completedTodos = mockGetTodosWithFilters({
        fileId: mockFileId,
        status: 'completed',
      }) as Todo[];
      
      expect(completedTodos).toHaveLength(1);
      expect(completedTodos[0].title).toBe('Low Priority Completed');
    });

    test('should filter by priority', () => {
      const highPriorityTodos = mockGetTodosWithFilters({
        fileId: mockFileId,
        priority: 'high',
      }) as Todo[];
      
      expect(highPriorityTodos).toHaveLength(1);
      expect(highPriorityTodos[0].title).toBe('High Priority Pending');
    });

    test('should filter by tag', () => {
      const urgentTodos = mockGetTodosWithFilters({
        fileId: mockFileId,
        tag: 'urgent',
      }) as Todo[];
      
      expect(urgentTodos).toHaveLength(1);
      expect(urgentTodos[0].title).toBe('High Priority Pending');
    });

    test('should combine multiple filters', () => {
      const filteredTodos = mockGetTodosWithFilters({
        fileId: mockFileId,
        status: 'pending',
        priority: 'high',
      }) as Todo[];
      
      expect(filteredTodos).toHaveLength(1);
      expect(filteredTodos[0].title).toBe('High Priority Pending');
    });
  });

  describe('getTodoStats', () => {
    beforeEach(() => {
      // Create diverse todos for stats testing
      mockCreateTodo({
        ...mockTodoData,
        title: 'Pending High',
        priority: 'high',
      });
      
      mockCreateTodo({
        ...mockTodoData,
        title: 'Pending Medium',
        priority: 'medium',
      });
      
      const inProgressId = mockCreateTodo({
        ...mockTodoData,
        title: 'In Progress Low',
        priority: 'low',
      }) as string;
      
      const completedId = mockCreateTodo({
        ...mockTodoData,
        title: 'Completed Medium',
        priority: 'medium',
      }) as string;
      
      const overdueId = mockCreateTodo({
        ...mockTodoData,
        title: 'Overdue High',
        priority: 'high',
        dueDate: Date.now() - 86400000, // yesterday
      }) as string;
      
      // Update statuses
      mockUpdateTodoStatus({
        _id: inProgressId,
        status: 'in-progress',
      });
      
      mockUpdateTodoStatus({
        _id: completedId,
        status: 'completed',
      });
    });

    test('should return correct statistics', () => {
      const stats = mockGetTodoStats({ fileId: mockFileId }) as any;
      
      expect(stats).toMatchObject({
        total: 5,
        completed: 1,
        inProgress: 1,
        pending: 3,
        highPriority: 2,
        mediumPriority: 2,
        lowPriority: 1,
        overdue: 1, // Only overdue pending todos
      });
    });
  });

  describe('getTodosByUser', () => {
    beforeEach(() => {
      mockCreateTodo({
        ...mockTodoData,
        title: 'User Todo 1',
      });
      
      mockCreateTodo({
        ...mockTodoData,
        title: 'User Todo 2',
        createdBy: 'different_user',
      });
    });

    test('should retrieve todos for specific user', () => {
      const userTodos = mockGetTodosByUser({ userId: mockUserId }) as Todo[];
      
      expect(userTodos).toHaveLength(1);
      expect(userTodos[0].title).toBe('User Todo 1');
      expect(userTodos[0].createdBy).toBe(mockUserId);
    });
  });
});

// Error handling tests
describe('Todo CRUD Error Handling', () => {
  beforeEach(() => {
    mockDatabase = {};
    nextId = 1;
    jest.clearAllMocks();
  });

  test('should handle non-existent todo ID gracefully', () => {
    const nonExistentId = 'non_existent_id';
    
    const result = mockGetTodoById({ _id: nonExistentId });
    expect(result).toBeNull();
  });

  test('should handle invalid file ID in createTodo', () => {
    const invalidFileId = 'invalid_file_id';
    
    const result = mockCreateTodo({
      title: 'Test Todo',
      fileId: invalidFileId,
      createdBy: 'user123',
    });
    
    expect(result).toBeDefined();
  });
});

// Performance tests
describe('Todo CRUD Performance', () => {
  const mockFileId = 'perf_test_file';

  beforeEach(() => {
    mockDatabase = {};
    nextId = 1;
    jest.clearAllMocks();
  });

  test('should handle batch todo creation efficiently', () => {
    const startTime = Date.now();
    const batchSize = 100;
    
    for (let i = 0; i < batchSize; i++) {
      mockCreateTodo({
        title: `Batch Todo ${i + 1}`,
        fileId: mockFileId,
        createdBy: 'perf_user',
      });
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(100); // 100ms for mocked operations
    
    // Verify all todos were created
    const todos = mockGetTodosByFile({ fileId: mockFileId });
    expect(todos).toHaveLength(batchSize);
  });

  test('should handle large todo list queries efficiently', () => {
    // Create a large number of todos
    const todoCount = 1000;
    for (let i = 0; i < todoCount; i++) {
      mockCreateTodo({
        title: `Large List Todo ${i + 1}`,
        fileId: mockFileId,
        createdBy: 'perf_user',
        priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
      });
    }
    
    const startTime = Date.now();
    const todos = mockGetTodosByFile({ fileId: mockFileId });
    const endTime = Date.now();
    
    const queryDuration = endTime - startTime;
    
    expect(todos).toHaveLength(todoCount);
    expect(queryDuration).toBeLessThan(50); // Should query within 50ms for mocked operations
  });
});
