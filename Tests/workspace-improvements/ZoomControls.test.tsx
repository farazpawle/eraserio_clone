import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ZoomControls } from '@/components/ui/zoom-controls';

describe('ZoomControls', () => {
  const defaultProps = {
    zoom: 1,
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    onResetZoom: jest.fn(),
    onFitToScreen: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders zoom controls with correct zoom percentage', () => {
    render(<ZoomControls {...defaultProps} />);
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom In (Ctrl + +)')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out (Ctrl + -)')).toBeInTheDocument();
    expect(screen.getByTitle('Reset Zoom (Ctrl + 0)')).toBeInTheDocument();
    expect(screen.getByTitle('Fit to Screen (Ctrl + Shift + 0)')).toBeInTheDocument();
  });

  it('displays correct zoom percentage for different zoom values', () => {
    const { rerender } = render(<ZoomControls {...defaultProps} zoom={0.5} />);
    expect(screen.getByText('50%')).toBeInTheDocument();

    rerender(<ZoomControls {...defaultProps} zoom={2} />);
    expect(screen.getByText('200%')).toBeInTheDocument();

    rerender(<ZoomControls {...defaultProps} zoom={1.25} />);
    expect(screen.getByText('125%')).toBeInTheDocument();
  });

  it('calls onZoomIn when zoom in button is clicked', () => {
    render(<ZoomControls {...defaultProps} />);
    
    const zoomInButton = screen.getByTitle('Zoom In (Ctrl + +)');
    fireEvent.click(zoomInButton);
    
    expect(defaultProps.onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('calls onZoomOut when zoom out button is clicked', () => {
    render(<ZoomControls {...defaultProps} />);
    
    const zoomOutButton = screen.getByTitle('Zoom Out (Ctrl + -)');
    fireEvent.click(zoomOutButton);
    
    expect(defaultProps.onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('calls onResetZoom when reset button is clicked', () => {
    render(<ZoomControls {...defaultProps} />);
    
    const resetButton = screen.getByTitle('Reset Zoom (Ctrl + 0)');
    fireEvent.click(resetButton);
    
    expect(defaultProps.onResetZoom).toHaveBeenCalledTimes(1);
  });

  it('calls onFitToScreen when fit to screen button is clicked', () => {
    render(<ZoomControls {...defaultProps} />);
    
    const fitToScreenButton = screen.getByTitle('Fit to Screen (Ctrl + Shift + 0)');
    fireEvent.click(fitToScreenButton);
    
    expect(defaultProps.onFitToScreen).toHaveBeenCalledTimes(1);
  });

  it('disables zoom in button when at maximum zoom', () => {
    render(<ZoomControls {...defaultProps} zoom={5} maxZoom={5} />);
    
    const zoomInButton = screen.getByTitle('Zoom In (Ctrl + +)');
    expect(zoomInButton).toBeDisabled();
  });

  it('disables zoom out button when at minimum zoom', () => {
    render(<ZoomControls {...defaultProps} zoom={0.1} minZoom={0.1} />);
    
    const zoomOutButton = screen.getByTitle('Zoom Out (Ctrl + -)');
    expect(zoomOutButton).toBeDisabled();
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<ZoomControls {...defaultProps} disabled={true} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <ZoomControls {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles edge case zoom values correctly', () => {
    const { rerender } = render(<ZoomControls {...defaultProps} zoom={0.001} />);
    expect(screen.getByText('0%')).toBeInTheDocument();

    rerender(<ZoomControls {...defaultProps} zoom={10.999} />);
    expect(screen.getByText('1100%')).toBeInTheDocument();
  });

  it('maintains button functionality when zoom changes', () => {
    const { rerender } = render(<ZoomControls {...defaultProps} zoom={1} />);
    
    const zoomInButton = screen.getByTitle('Zoom In (Ctrl + +)');
    fireEvent.click(zoomInButton);
    expect(defaultProps.onZoomIn).toHaveBeenCalledTimes(1);

    rerender(<ZoomControls {...defaultProps} zoom={2} />);
    
    fireEvent.click(zoomInButton);
    expect(defaultProps.onZoomIn).toHaveBeenCalledTimes(2);
  });
});