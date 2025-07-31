import { renderHook, act } from '@testing-library/react';
import { useDragAndDrop } from '@/app/_hooks/useDragAndDrop';
import { FILE } from '@/app/dashboard/_components/FileList';

// Mock files for testing
const mockFiles: FILE[] = [
  {
    _id: '1',
    fileName: 'File 1',
    createdBy: 'user1',
    teamId: 'team1',
    document: 'content1',
    whiteboard: '',
    archive: false,
    _creationTime: Date.now() - 1000,
  },
  {
    _id: '2',
    fileName: 'File 2',
    createdBy: 'user1',
    teamId: 'team1',
    document: 'content2',
    whiteboard: '',
    archive: false,
    _creationTime: Date.now() - 2000,
  },
  {
    _id: '3',
    fileName: 'File 3',
    createdBy: 'user1',
    teamId: 'team1',
    document: 'content3',
    whiteboard: '',
    archive: false,
    _creationTime: Date.now() - 3000,
  },
];

describe('useDragAndDrop', () => {
  let mockOnReorder: jest.Mock;

  beforeEach(() => {
    mockOnReorder = jest.fn();
    // Mock document.body.classList
    document.body.classList.add = jest.fn();
    document.body.classList.remove = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
      })
    );

    expect(result.current.dragState).toEqual({
      isDragging: false,
      draggedFile: null,
      dragOverFile: null,
      dropPosition: null,
    });
    expect(result.current.disabled).toBe(false);
  });

  it('should handle drag start correctly', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
      })
    );

    act(() => {
      result.current.handlers.onDragStart(mockFiles[0]);
    });

    expect(result.current.dragState.isDragging).toBe(true);
    expect(result.current.dragState.draggedFile).toBe(mockFiles[0]);
    expect(document.body.classList.add).toHaveBeenCalledWith('dragging-file');
  });

  it('should handle drag end correctly', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
      })
    );

    // Start dragging first
    act(() => {
      result.current.handlers.onDragStart(mockFiles[0]);
    });

    // Then end dragging
    act(() => {
      result.current.handlers.onDragEnd();
    });

    expect(result.current.dragState.isDragging).toBe(false);
    expect(result.current.dragState.draggedFile).toBe(null);
    expect(document.body.classList.remove).toHaveBeenCalledWith('dragging-file');
  });

  it('should identify dragged file correctly', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
      })
    );

    act(() => {
      result.current.handlers.onDragStart(mockFiles[0]);
    });

    expect(result.current.isDraggedFile(mockFiles[0])).toBe(true);
    expect(result.current.isDraggedFile(mockFiles[1])).toBe(false);
  });

  it('should handle file reordering correctly', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
      })
    );

    act(() => {
      result.current.handlers.onFileReorder(mockFiles[0], mockFiles[2], 'after');
    });

    expect(mockOnReorder).toHaveBeenCalledWith([
      mockFiles[1], // File 2
      mockFiles[2], // File 3
      mockFiles[0], // File 1 moved to end
    ]);
  });

  it('should handle reordering before target correctly', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
      })
    );

    act(() => {
      result.current.handlers.onFileReorder(mockFiles[2], mockFiles[0], 'before');
    });

    expect(mockOnReorder).toHaveBeenCalledWith([
      mockFiles[2], // File 3 moved to beginning
      mockFiles[0], // File 1
      mockFiles[1], // File 2
    ]);
  });

  it('should not allow dragging when disabled', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
        disabled: true,
      })
    );

    act(() => {
      result.current.handlers.onDragStart(mockFiles[0]);
    });

    expect(result.current.dragState.isDragging).toBe(false);
    expect(document.body.classList.add).not.toHaveBeenCalled();
  });

  it('should handle drag over with position calculation', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
      })
    );

    // Start dragging first
    act(() => {
      result.current.handlers.onDragStart(mockFiles[0]);
    });

    // Mock drag event
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientY: 100,
      currentTarget: {
        getBoundingClientRect: () => ({
          top: 50,
          height: 100,
        }),
      },
    } as any;

    act(() => {
      result.current.handlers.onDragOver(mockEvent, mockFiles[1]);
    });

    expect(result.current.dragState.dragOverFile).toBe(mockFiles[1]);
    expect(result.current.dragState.dropPosition).toBe('after'); // clientY (100) > midpoint (100)
  });

  it('should calculate drop position correctly for before', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
      })
    );

    // Start dragging first
    act(() => {
      result.current.handlers.onDragStart(mockFiles[0]);
    });

    // Mock drag event with clientY before midpoint
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientY: 75, // Before midpoint (100)
      currentTarget: {
        getBoundingClientRect: () => ({
          top: 50,
          height: 100, // midpoint = 50 + 100/2 = 100
        }),
      },
    } as any;

    act(() => {
      result.current.handlers.onDragOver(mockEvent, mockFiles[1]);
    });

    expect(result.current.dragState.dropPosition).toBe('before');
  });

  it('should not handle drag over for same file', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
      })
    );

    // Start dragging
    act(() => {
      result.current.handlers.onDragStart(mockFiles[0]);
    });

    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientY: 100,
      currentTarget: {
        getBoundingClientRect: () => ({
          top: 50,
          height: 100,
        }),
      },
    } as any;

    // Try to drag over the same file
    act(() => {
      result.current.handlers.onDragOver(mockEvent, mockFiles[0]);
    });

    expect(result.current.dragState.dragOverFile).toBe(null);
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('should get drop indicator position correctly', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        files: mockFiles,
        onReorder: mockOnReorder,
      })
    );

    // Start dragging and set drag over state
    act(() => {
      result.current.handlers.onDragStart(mockFiles[0]);
    });

    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientY: 75,
      currentTarget: {
        getBoundingClientRect: () => ({
          top: 50,
          height: 100,
        }),
      },
    } as any;

    act(() => {
      result.current.handlers.onDragOver(mockEvent, mockFiles[1]);
    });

    expect(result.current.getDropIndicatorPosition(mockFiles[1])).toBe('before');
    expect(result.current.getDropIndicatorPosition(mockFiles[2])).toBe(null);
  });
});