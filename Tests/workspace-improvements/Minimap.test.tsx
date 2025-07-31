import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Minimap } from '@/components/ui/minimap';

// Mock canvas context
const mockContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  set fillStyle(value: string) {},
  set strokeStyle(value: string) {},
  set lineWidth(value: number) {},
} as Partial<CanvasRenderingContext2D>;

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
  if (contextId === '2d') {
    return mockContext as CanvasRenderingContext2D;
  }
  return null;
}) as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

describe('Minimap', () => {
  const defaultProps = {
    canvasRef: { current: document.createElement('canvas') },
    viewportBounds: { x: 0, y: 0, width: 800, height: 600 },
    canvasBounds: { x: -1000, y: -1000, width: 2000, height: 2000 },
    zoom: 1,
    onViewportChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders minimap when visible', () => {
    render(<Minimap {...defaultProps} isVisible={true} />);
    
    expect(screen.getByText('Minimap')).toBeInTheDocument();
    expect(screen.getByText('Zoom: 100%')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<Minimap {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByText('Minimap')).not.toBeInTheDocument();
  });

  it('renders collapse/expand button', () => {
    render(<Minimap {...defaultProps} isVisible={true} />);
    
    const collapseButton = screen.getByTitle('Collapse');
    expect(collapseButton).toBeInTheDocument();
  });

  it('renders close button when onClose is provided', () => {
    const onClose = jest.fn();
    render(<Minimap {...defaultProps} isVisible={true} onClose={onClose} />);
    
    const closeButton = screen.getByTitle('Close Minimap');
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Minimap {...defaultProps} isVisible={true} onClose={onClose} />);
    
    const closeButton = screen.getByTitle('Close Minimap');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles collapsed state when collapse button is clicked', () => {
    render(<Minimap {...defaultProps} isVisible={true} />);
    
    const collapseButton = screen.getByTitle('Collapse');
    fireEvent.click(collapseButton);
    
    // Canvas should be hidden when collapsed
    const canvas = screen.queryByRole('img'); // Canvas elements have img role
    expect(canvas).not.toBeInTheDocument();
    
    // Button title should change
    expect(screen.getByTitle('Expand')).toBeInTheDocument();
  });

  it('displays correct zoom percentage', () => {
    const { rerender } = render(
      <Minimap {...defaultProps} isVisible={true} zoom={0.5} />
    );
    expect(screen.getByText('Zoom: 50%')).toBeInTheDocument();

    rerender(<Minimap {...defaultProps} isVisible={true} zoom={2} />);
    expect(screen.getByText('Zoom: 200%')).toBeInTheDocument();

    rerender(<Minimap {...defaultProps} isVisible={true} zoom={1.25} />);
    expect(screen.getByText('Zoom: 125%')).toBeInTheDocument();
  });

  it('calls onViewportChange when canvas is clicked', () => {
    render(<Minimap {...defaultProps} isVisible={true} />);
    
    const canvas = document.querySelector('canvas');
    
    // Mock getBoundingClientRect
    canvas!.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 200,
      height: 150,
    })) as any;
    
    fireEvent.mouseDown(canvas!, { clientX: 100, clientY: 75 });
    
    expect(defaultProps.onViewportChange).toHaveBeenCalled();
  });

  it('handles mouse drag on canvas', () => {
    render(<Minimap {...defaultProps} isVisible={true} />);
    
    const canvas = document.querySelector('canvas');
    
    // Mock getBoundingClientRect
    canvas!.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 200,
      height: 150,
    })) as any;
    
    // Start dragging
    fireEvent.mouseDown(canvas!, { clientX: 50, clientY: 50 });
    
    // Move mouse
    fireEvent.mouseMove(canvas!, { clientX: 100, clientY: 75 });
    
    expect(defaultProps.onViewportChange).toHaveBeenCalledTimes(2);
  });

  it('stops dragging on mouse up', () => {
    render(<Minimap {...defaultProps} isVisible={true} />);
    
    const canvas = document.querySelector('canvas');
    
    // Mock getBoundingClientRect
    canvas!.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 200,
      height: 150,
    })) as any;
    
    // Start dragging
    fireEvent.mouseDown(canvas!, { clientX: 50, clientY: 50 });
    
    // Stop dragging
    fireEvent.mouseUp(canvas!);
    
    // Move mouse (should not trigger viewport change)
    fireEvent.mouseMove(canvas!, { clientX: 100, clientY: 75 });
    
    expect(defaultProps.onViewportChange).toHaveBeenCalledTimes(1);
  });

  it('stops dragging on mouse leave', () => {
    render(<Minimap {...defaultProps} isVisible={true} />);
    
    const canvas = document.querySelector('canvas');
    
    // Mock getBoundingClientRect
    canvas!.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 200,
      height: 150,
    })) as any;
    
    // Start dragging
    fireEvent.mouseDown(canvas!, { clientX: 50, clientY: 50 });
    
    // Leave canvas
    fireEvent.mouseLeave(canvas!);
    
    // Move mouse (should not trigger viewport change)
    fireEvent.mouseMove(canvas!, { clientX: 100, clientY: 75 });
    
    expect(defaultProps.onViewportChange).toHaveBeenCalledTimes(1);
  });

  it('changes cursor style during drag', () => {
    render(<Minimap {...defaultProps} isVisible={true} />);
    
    const canvas = document.querySelector('canvas');
    
    // Start dragging
    fireEvent.mouseDown(canvas!, { clientX: 50, clientY: 50 });
    
    expect(canvas).toHaveStyle('cursor: grabbing');
    
    // Stop dragging
    fireEvent.mouseUp(canvas!);
    
    expect(canvas).toHaveStyle('cursor: grab');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Minimap {...defaultProps} isVisible={true} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('does not render canvas when collapsed', () => {
    render(<Minimap {...defaultProps} isVisible={true} />);
    
    // Collapse the minimap
    const collapseButton = screen.getByTitle('Collapse');
    fireEvent.click(collapseButton);
    
    // Canvas should not be in the document
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeInTheDocument();
  });

  it('calculates viewport coordinates correctly', () => {
    render(<Minimap {...defaultProps} isVisible={true} />);
    
    const canvas = document.querySelector('canvas');
    
    // Mock getBoundingClientRect
    canvas!.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 200,
      height: 150,
    })) as any;
    
    // Click at center of minimap
    fireEvent.mouseDown(canvas!, { clientX: 100, clientY: 75 });
    
    // Should call onViewportChange with calculated coordinates
    expect(defaultProps.onViewportChange).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('updates canvas when dependencies change', () => {
    const { rerender } = render(
      <Minimap {...defaultProps} isVisible={true} zoom={1} />
    );
    
    // Change zoom
    rerender(
      <Minimap {...defaultProps} isVisible={true} zoom={2} />
    );
    
    expect(screen.getByText('Zoom: 200%')).toBeInTheDocument();
  });

  it('handles missing canvas ref gracefully', () => {
    const propsWithoutCanvas = {
      ...defaultProps,
      canvasRef: { current: null },
    };
    
    expect(() => {
      render(<Minimap {...propsWithoutCanvas} isVisible={true} />);
    }).not.toThrow();
  });

  it('handles missing canvas context gracefully', () => {
    // Mock getContext to return null
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
    
    expect(() => {
      render(<Minimap {...defaultProps} isVisible={true} />);
    }).not.toThrow();
    
    // Restore mock
    HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
      if (contextId === '2d') {
        return mockContext as CanvasRenderingContext2D;
      }
      return null;
    }) as any;
  });
});