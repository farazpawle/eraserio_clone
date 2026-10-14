import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new todo item
export const createTodo = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    fileId: v.id("files"),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get the current highest order number for this file
    const existingTodos = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("fileId"), args.fileId))
      .collect();
    
    const maxOrder = existingTodos.length > 0 
      ? Math.max(...existingTodos.map(todo => todo.order))
      : 0;

    const result = await ctx.db.insert("todos", {
      title: args.title,
      description: args.description,
      status: "pending",
      priority: args.priority || "medium",
      dueDate: args.dueDate,
      fileId: args.fileId,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      order: maxOrder + 1,
      tags: args.tags,
    });
    
    return result;
  },
});

// Get all todos for a specific file
export const getTodosByFile = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("fileId"), args.fileId))
      .order("asc")
      .collect();
    
    // Sort by order field for custom ordering
    return result.sort((a, b) => a.order - b.order);
  },
});

// Get a specific todo by ID
export const getTodoById = query({
  args: {
    _id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args._id);
    return result;
  },
});

// Get todos by user (across all files)
export const getTodosByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("createdBy"), args.userId))
      .order("desc")
      .collect();
    return result;
  },
});

// Update a todo item
export const updateTodo = mutation({
  args: {
    _id: v.id("todos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed"))),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { _id, ...updates } = args;
    
    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(cleanUpdates).length === 0) {
      throw new Error("No valid updates provided");
    }
    
    const result = await ctx.db.patch(_id, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
    
    return result;
  },
});

// Update todo status specifically
export const updateTodoStatus = mutation({
  args: {
    _id: v.id("todos"),
    status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.patch(args._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return result;
  },
});

// Reorder todos within a file
export const reorderTodos = mutation({
  args: {
    fileId: v.id("files"),
    todoIds: v.array(v.id("todos")),
  },
  handler: async (ctx, args) => {
    // Update the order field for each todo based on the new order
    const updates = args.todoIds.map(async (todoId, index) => {
      return await ctx.db.patch(todoId, {
        order: index + 1,
        updatedAt: Date.now(),
      });
    });
    
    await Promise.all(updates);
    return { success: true };
  },
});

// Delete a todo item
export const deleteTodo = mutation({
  args: {
    _id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.delete(args._id);
    return result;
  },
});

// Delete all todos for a specific file
export const deleteTodosByFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("fileId"), args.fileId))
      .collect();
    
    const deletions = todos.map(todo => ctx.db.delete(todo._id));
    await Promise.all(deletions);
    
    return { deletedCount: todos.length };
  },
});

// Get todos with filters
export const getTodosWithFilters = query({
  args: {
    fileId: v.id("files"),
    status: v.optional(v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed"))),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("fileId"), args.fileId));
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    if (args.priority) {
      query = query.filter((q) => q.eq(q.field("priority"), args.priority));
    }
    
    const todos = await query.collect();
    
    // Filter by tag if provided (since we can't use complex queries on arrays in Convex)
    let filteredTodos = todos;
    if (args.tag) {
      filteredTodos = todos.filter(todo => 
        todo.tags && todo.tags.includes(args.tag!)
      );
    }
    
    // Sort by order field
    return filteredTodos.sort((a, b) => a.order - b.order);
  },
});

// Get todo statistics for a file
export const getTodoStats = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("fileId"), args.fileId))
      .collect();
    
    const stats = {
      total: todos.length,
      completed: todos.filter(t => t.status === "completed").length,
      inProgress: todos.filter(t => t.status === "in-progress").length,
      pending: todos.filter(t => t.status === "pending").length,
      highPriority: todos.filter(t => t.priority === "high").length,
      mediumPriority: todos.filter(t => t.priority === "medium").length,
      lowPriority: todos.filter(t => t.priority === "low").length,
      overdue: todos.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== "completed").length,
    };
    
    return stats;
  },
});
