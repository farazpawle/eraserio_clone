import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResizablePane } from '@/components/ui/resizable-pane';

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

describe('ResizablePane', () => {
  const defaultProps = {
    children: null,
    leftPanel: <div data-testid="left-panel">Left Panel</div>,
    rightPanel: <div data-testid="right-panel">Right Panel</div>,
    onResize: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders left and right panels', () => {
    render(<ResizablePane {...defaultProps} />);
    
    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
  });

  it('renders with initial left width', () => {
    const { container } = render(
      <ResizablePane {...defaultProps} initialLeftWidth={60} />
    );
    
    const leftPanel = container.querySelector('[style*="width: 60%"]');
    const rightPanel = container.querySelector('[style*="width: 40%"]');
    
    expect(leftPanel).toBeInTheDocument();
    expect(rightPanel).toBeInTheDocument();
  });

  it('shows resizer handle', () => {
    const { container } = render(<ResizablePane {...defaultProps} />);
    
    const resizer = container.querySelector('.cursor-col-resize');
    expect(resizer).toBeInTheDocument();
  });

  it('starts dragging when mouse down on resizer', () => {
    const { container } = render(<ResizablePane {...defaultProps} />);
    
    const resizer = container.querySelector('.cursor-col-resize');
    fireEvent.mouseDown(resizer!, { clientX: 100 });
    
    // Check if dragging state is active by looking for drag indicator
    expect(container.querySelector('.opacity-100')).toBeInTheDocument();
  });

  it('calls onResize when dragging', () => {
    const { container } = render(
      <ResizablePane {...defaultProps} initialLeftWidth={50} />
    );
    
    const resizer = container.querySelector('.cursor-col-resize');
    
    // Start dragging
    fireEvent.mouseDown(resizer!, { clientX: 100 });
    
    // Mock container dimensions
    Object.defineProperty(container.firstChild, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 1000 }),
    });
    
    // Simulate mouse move
    fireEvent.mouseMove(document, { clientX: 300 });
    
    expect(defaultProps.onResize).toHaveBeenCalled();
  });

  it('respects minimum and maximum width constraints', () => {
    const { container } = render(
      <ResizablePane 
        {...defaultProps} 
        minLeftWidth={20}
        maxLeftWidth={80}
        initialLeftWidth={50}
      />
    );
    
    const resizer = container.querySelector('.cursor-col-resize');
    
    // Mock container dimensions
    Object.defineProperty(container.firstChild, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 1000 }),
    });
    
    // Start dragging
    fireEvent.mouseDown(resizer!, { clientX: 500 });
    
    // Try to drag beyond minimum (to 10%)
    fireEvent.mouseMove(document, { clientX: 100 });
    
    // Should be constrained to minimum
    const calls = defaultProps.onResize.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBeGreaterThanOrEqual(20);
    
    // Try to drag beyond maximum (to 90%)
    fireEvent.mouseMove(document, { clientX: 900 });
    
    const newCalls = defaultProps.onResize.mock.calls;
    const newLastCall = newCalls[newCalls.length - 1];
    expect(newLastCall[0]).toBeLessThanOrEqual(80);
  });

  it('shows snap indicators when dragging', () => {
    const { container } = render(
      <ResizablePane 
        {...defaultProps} 
        snapPoints={[25, 50, 75]}
        showSnapIndicators={true}
      />
    );
    
    const resizer = container.querySelector('.cursor-col-resize');
    fireEvent.mouseDown(resizer!, { clientX: 100 });
    
    // Should show snap indicators
    const snapIndicators = container.querySelectorAll('[style*="left: 25%"]');
    expect(snapIndicators.length).toBeGreaterThan(0);
  });

  it('snaps to snap points when within threshold', () => {
    const { container } = render(
      <ResizablePane 
        {...defaultProps} 
        snapPoints={[50]}
        snapThreshold={5}
        initialLeftWidth={30}
      />
    );
    
    const resizer = container.querySelector('.cursor-col-resize');
    
    // Mock container dimensions
    Object.defineProperty(container.firstChild, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 1000 }),
    });
    
    // Start dragging
    fireEvent.mouseDown(resizer!, { clientX: 300 });
    
    // Move close to snap point (52% - within threshold of 50%)
    fireEvent.mouseMove(document, { clientX: 520 });
    
    // Should snap to 50%
    const calls = defaultProps.onResize.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe(50);
  });

  it('stops dragging on mouse up', () => {
    const { container } = render(<ResizablePane {...defaultProps} />);
    
    const resizer = container.querySelector('.cursor-col-resize');
    fireEvent.mouseDown(resizer!, { clientX: 100 });
    fireEvent.mouseUp(document);
    
    // Drag indicator should be hidden
    expect(container.querySelector('.opacity-100')).not.toBeInTheDocument();
  });

  it('shows resize feedback overlay when dragging', () => {
    const { container } = render(
      <ResizablePane {...defaultProps} initialLeftWidth={60} />
    );
    
    const resizer = container.querySelector('.cursor-col-resize');
    fireEvent.mouseDown(resizer!, { clientX: 100 });
    
    // Should show feedback overlay with percentages
    expect(screen.getByText(/60%.*40%/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ResizablePane {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies custom resizer className', () => {
    const { container } = render(
      <ResizablePane {...defaultProps} resizerClassName="custom-resizer" />
    );
    
    const resizer = container.querySelector('.cursor-col-resize');
    expect(resizer).toHaveClass('custom-resizer');
  });

  it('disables resizing when disabled prop is true', () => {
    const { container } = render(
      <ResizablePane {...defaultProps} disabled={true} />
    );
    
    const resizer = container.querySelector('.cursor-not-allowed');
    expect(resizer).toBeInTheDocument();
    
    fireEvent.mouseDown(resizer!, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 200 });
    
    expect(defaultProps.onResize).not.toHaveBeenCalled();
  });

  it('hides snap indicators when showSnapIndicators is false', () => {
    const { container } = render(
      <ResizablePane 
        {...defaultProps} 
        snapPoints={[25, 50, 75]}
        showSnapIndicators={false}
      />
    );
    
    const resizer = container.querySelector('.cursor-col-resize');
    fireEvent.mouseDown(resizer!, { clientX: 100 });
    
    // Should not show snap indicators
    const snapIndicators = container.querySelectorAll('[style*="left: 25%"]');
    expect(snapIndicators.length).toBe(0);
  });

  it('triggers haptic feedback when snapping (if available)', () => {
    const { container } = render(
      <ResizablePane 
        {...defaultProps} 
        snapPoints={[50]}
        snapThreshold={5}
      />
    );
    
    const resizer = container.querySelector('.cursor-col-resize');
    
    // Mock container dimensions
    Object.defineProperty(container.firstChild, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 1000 }),
    });
    
    // Start dragging
    fireEvent.mouseDown(resizer!, { clientX: 400 });
    
    // Move to snap point
    fireEvent.mouseMove(document, { clientX: 500 });
    
    expect(navigator.vibrate).toHaveBeenCalledWith(50);
  });

  it('cleans up event listeners on unmount', () => {
    const { container, unmount } = render(<ResizablePane {...defaultProps} />);
    
    const resizer = container.querySelector('.cursor-col-resize');
    fireEvent.mouseDown(resizer!, { clientX: 100 });
    
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('shows snap preview text when near snap point', () => {
    const { container } = render(
      <ResizablePane 
        {...defaultProps} 
        snapPoints={[50]}
        snapThreshold={5}
      />
    );
    
    const resizer = container.querySelector('.cursor-col-resize');
    
    // Mock container dimensions
    Object.defineProperty(container.firstChild, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 1000 }),
    });
    
    // Start dragging
    fireEvent.mouseDown(resizer!, { clientX: 400 });
    
    // Move close to snap point
    fireEvent.mouseMove(document, { clientX: 520 });
    
    expect(screen.getByText(/snap to 50%/)).toBeInTheDocument();
  });

  describe('show', () => {
    const wrappers = (container: HTMLElement) => {
      const left = screen.getByTestId('left-panel').parentElement as HTMLElement;
      const right = screen.getByTestId('right-panel').parentElement as HTMLElement;
      const resizer = container.querySelector('.cursor-col-resize') as HTMLElement;
      return { left, right, resizer };
    };

    it('hides the right panel and resizer but keeps it mounted when show is left', () => {
      const { container } = render(<ResizablePane {...defaultProps} show="left" />);
      const { left, right, resizer } = wrappers(container);

      expect(right).toHaveClass('hidden');
      expect(resizer).toHaveClass('hidden');
      expect(left.style.width).toBe('100%');
      expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    });

    it('hides the left panel and resizer but keeps it mounted when show is right', () => {
      const { container } = render(<ResizablePane {...defaultProps} show="right" />);
      const { left, right, resizer } = wrappers(container);

      expect(left).toHaveClass('hidden');
      expect(resizer).toHaveClass('hidden');
      expect(right.style.width).toBe('100%');
      expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    });

    it('shows both panels by default', () => {
      const { container } = render(<ResizablePane {...defaultProps} initialLeftWidth={40} />);
      const { left, right, resizer } = wrappers(container);

      expect(left).not.toHaveClass('hidden');
      expect(right).not.toHaveClass('hidden');
      expect(resizer).not.toHaveClass('hidden');
      expect(left.style.width).toBe('40%');
    });
  });
});
