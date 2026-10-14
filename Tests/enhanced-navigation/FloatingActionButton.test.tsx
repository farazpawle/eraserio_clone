import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FloatingActionButton, FloatingActionItem } from '@/components/ui/floating-action-button';
import { FileText, Image, Users } from 'lucide-react';

describe('FloatingActionButton Component', () => {
  const mockOnClick = jest.fn();
  
  const singleAction: FloatingActionItem[] = [
    {
      id: 'new-file',
      label: 'New Project',
      icon: FileText,
      onClick: mockOnClick,
    },
  ];

  const multipleActions: FloatingActionItem[] = [
    {
      id: 'new-file',
      label: 'New Project',
      icon: FileText,
      onClick: mockOnClick,
    },
    {
      id: 'new-canvas',
      label: 'New Canvas',
      icon: Image,
      onClick: mockOnClick,
    },
    {
      id: 'invite-team',
      label: 'Invite Team',
      icon: Users,
      onClick: mockOnClick,
    },
  ];

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe('Single Action Mode', () => {
    it('renders as simple button for single action', () => {
      render(<FloatingActionButton items={singleAction} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'New Project');
    });

    it('calls onClick when single action button is clicked', () => {
      render(<FloatingActionButton items={singleAction} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('disables button when action is disabled', () => {
      const disabledAction = [{ ...singleAction[0], disabled: true }];
      render(<FloatingActionButton items={disabledAction} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Multiple Actions Mode', () => {
    it('renders as dropdown for multiple actions', () => {
      render(<FloatingActionButton items={multipleActions} />);
      
      const triggerButton = screen.getByRole('button');
      expect(triggerButton).toBeInTheDocument();
      
      // Should show plus icon for multiple actions
      const plusIcon = triggerButton.querySelector('svg');
      expect(plusIcon).toBeInTheDocument();
    });

    it('opens dropdown menu when clicked', () => {
      render(<FloatingActionButton items={multipleActions} />);
      
      const triggerButton = screen.getByRole('button');
      fireEvent.click(triggerButton);
      
      // Check if dropdown items are visible
      expect(screen.getByText('New Project')).toBeInTheDocument();
      expect(screen.getByText('New Canvas')).toBeInTheDocument();
      expect(screen.getByText('Invite Team')).toBeInTheDocument();
    });

    it('calls correct onClick when dropdown item is selected', () => {
      render(<FloatingActionButton items={multipleActions} />);
      
      const triggerButton = screen.getByRole('button');
      fireEvent.click(triggerButton);
      
      const newFileItem = screen.getByText('New Project');
      fireEvent.click(newFileItem);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('rotates plus icon when dropdown is open', () => {
      render(<FloatingActionButton items={multipleActions} />);
      
      const triggerButton = screen.getByRole('button');
      fireEvent.click(triggerButton);
      
      expect(triggerButton).toHaveClass('rotate-45');
    });
  });

  describe('Positioning and Styling', () => {
    it('applies correct position classes', () => {
      const { container } = render(
        <FloatingActionButton items={singleAction} position="top-left" />
      );
      
      const button = container.querySelector('button');
      expect(button).toHaveClass('top-6', 'left-6');
    });

    it('applies correct size classes', () => {
      const { container } = render(
        <FloatingActionButton items={singleAction} size="lg" />
      );
      
      const button = container.querySelector('button');
      expect(button).toHaveClass('h-16', 'w-16');
    });

    it('applies correct variant classes', () => {
      const { container } = render(
        <FloatingActionButton items={singleAction} variant="secondary" />
      );
      
      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-gray-600');
    });

    it('applies custom className', () => {
      const { container } = render(
        <FloatingActionButton items={singleAction} className="custom-fab" />
      );
      
      const button = container.querySelector('button');
      expect(button).toHaveClass('custom-fab');
    });
  });

  describe('Default Items', () => {
    it('uses default items when none provided', () => {
      render(<FloatingActionButton />);
      
      const triggerButton = screen.getByRole('button');
      fireEvent.click(triggerButton);
      
      // Should show default items
      expect(screen.getByText('New Project')).toBeInTheDocument();
      expect(screen.getByText('New Canvas')).toBeInTheDocument();
      expect(screen.getByText('Invite Team')).toBeInTheDocument();
    });
  });
});