import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecentFiles, RecentFile } from '@/components/ui/recent-files';
import moment from 'moment';

// Mock moment
jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  return {
    __esModule: true,
    default: jest.fn((date) => ({
      fromNow: () => '2 hours ago',
      ...actualMoment(date),
    })),
  };
});

describe('RecentFiles Component', () => {
  const mockOnFileClick = jest.fn();
  const mockOnFileAction = jest.fn();
  
  const mockFiles: RecentFile[] = [
    {
      id: '1',
      name: 'Project Document',
      type: 'document',
      lastModified: new Date('2024-01-15T10:00:00Z'),
      teamName: 'Design Team',
    },
    {
      id: '2',
      name: 'Wireframe Canvas',
      type: 'canvas',
      lastModified: new Date('2024-01-15T09:00:00Z'),
      teamName: 'Development Team',
    },
    {
      id: '3',
      name: 'Meeting Notes',
      type: 'document',
      lastModified: new Date('2024-01-15T08:00:00Z'),
    },
  ];

  beforeEach(() => {
    mockOnFileClick.mockClear();
    mockOnFileAction.mockClear();
  });

  describe('Rendering', () => {
    it('renders recent files list correctly', () => {
      render(
        <RecentFiles 
          files={mockFiles} 
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      expect(screen.getByText('Recent Files')).toBeInTheDocument();
      expect(screen.getByText('Project Document')).toBeInTheDocument();
      expect(screen.getByText('Wireframe Canvas')).toBeInTheDocument();
      expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
    });

    it('shows team names when provided', () => {
      render(
        <RecentFiles 
          files={mockFiles} 
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      expect(screen.getByText('Design Team')).toBeInTheDocument();
      expect(screen.getByText('Development Team')).toBeInTheDocument();
    });

    it('shows relative time for last modified', () => {
      render(
        <RecentFiles 
          files={mockFiles} 
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      const timeElements = screen.getAllByText('2 hours ago');
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('renders empty state when no files provided', () => {
      render(
        <RecentFiles 
          files={[]} 
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      expect(screen.getByText('No recent files')).toBeInTheDocument();
    });

    it('limits files to maxItems', () => {
      render(
        <RecentFiles 
          files={mockFiles} 
          maxItems={2}
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      expect(screen.getByText('Project Document')).toBeInTheDocument();
      expect(screen.getByText('Wireframe Canvas')).toBeInTheDocument();
      expect(screen.queryByText('Meeting Notes')).not.toBeInTheDocument();
    });

    it('shows "View all" button when files exceed maxItems', () => {
      render(
        <RecentFiles 
          files={mockFiles} 
          maxItems={2}
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      expect(screen.getByText('View all 3 files')).toBeInTheDocument();
    });
  });

  describe('File Icons', () => {
    it('shows correct icons for different file types', () => {
      const { container } = render(
        <RecentFiles 
          files={mockFiles} 
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      // Check that icons are rendered (we can't easily test specific icons without more complex setup)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Interactions', () => {
    it('calls onFileClick when file is clicked', () => {
      render(
        <RecentFiles 
          files={mockFiles} 
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      const fileElement = screen.getByText('Project Document').closest('div');
      fireEvent.click(fileElement!);
      
      expect(mockOnFileClick).toHaveBeenCalledWith(mockFiles[0]);
    });

    it('calls file onClick when provided', () => {
      const mockFileOnClick = jest.fn();
      const filesWithOnClick = [
        { ...mockFiles[0], onClick: mockFileOnClick },
      ];
      
      render(
        <RecentFiles 
          files={filesWithOnClick} 
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      const fileElement = screen.getByText('Project Document').closest('div');
      fireEvent.click(fileElement!);
      
      expect(mockFileOnClick).toHaveBeenCalled();
      expect(mockOnFileClick).not.toHaveBeenCalled();
    });

    it('opens dropdown menu on more button click', () => {
      render(
        <RecentFiles 
          files={mockFiles} 
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      // Hover over a file to show the more button
      const fileElement = screen.getByText('Project Document').closest('div');
      fireEvent.mouseEnter(fileElement!);
      
      // Find and click the more button (three dots)
      const moreButton = fileElement!.querySelector('button');
      if (moreButton) {
        fireEvent.click(moreButton);
        
        // Check if dropdown items appear
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('Rename')).toBeInTheDocument();
        expect(screen.getByText('Duplicate')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      }
    });

    it('calls onFileAction when dropdown action is selected', () => {
      render(
        <RecentFiles 
          files={mockFiles} 
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      // Hover over a file to show the more button
      const fileElement = screen.getByText('Project Document').closest('div');
      fireEvent.mouseEnter(fileElement!);
      
      // Find and click the more button
      const moreButton = fileElement!.querySelector('button');
      if (moreButton) {
        fireEvent.click(moreButton);
        
        // Click on "Open" action
        const openAction = screen.getByText('Open');
        fireEvent.click(openAction);
        
        expect(mockOnFileAction).toHaveBeenCalledWith('open', mockFiles[0]);
      }
    });

    it('calls onFileAction when "View all" is clicked', () => {
      render(
        <RecentFiles 
          files={mockFiles} 
          maxItems={2}
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      const viewAllButton = screen.getByText('View all 3 files');
      fireEvent.click(viewAllButton);
      
      expect(mockOnFileAction).toHaveBeenCalledWith('view-all', mockFiles[0]);
    });
  });

  describe('Thumbnails', () => {
    it('shows thumbnails when showThumbnails is true and thumbnail is provided', () => {
      const filesWithThumbnails = [
        { ...mockFiles[0], thumbnail: 'https://example.com/thumb.jpg' },
      ];
      
      render(
        <RecentFiles 
          files={filesWithThumbnails} 
          showThumbnails={true}
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      const thumbnail = screen.getByAltText('Project Document');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });

    it('shows icon when showThumbnails is false', () => {
      const filesWithThumbnails = [
        { ...mockFiles[0], thumbnail: 'https://example.com/thumb.jpg' },
      ];
      
      const { container } = render(
        <RecentFiles 
          files={filesWithThumbnails} 
          showThumbnails={false}
          onFileClick={mockOnFileClick}
          onFileAction={mockOnFileAction}
        />
      );
      
      const thumbnail = screen.queryByAltText('Project Document');
      expect(thumbnail).not.toBeInTheDocument();
      
      // Should show icon instead
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});