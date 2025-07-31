import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { GridRulerToggle } from '@/components/ui/grid-ruler-toggle';

describe('GridRulerToggle', () => {
  const defaultProps = {
    showGrid: false,
    showRuler: false,
    gridSize: 20,
    gridColor: '#e5e7eb',
    rulerColor: '#9ca3af',
    onToggleGrid: jest.fn(),
    onToggleRuler: jest.fn(),
    onGridSizeChange: jest.fn(),
    onGridColorChange: jest.fn(),
    onRulerColorChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders grid and ruler toggle buttons', () => {
    render(<GridRulerToggle {...defaultProps} />);
    
    expect(screen.getByTitle('Toggle Grid (Ctrl + G)')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Ruler (Ctrl + R)')).toBeInTheDocument();
  });

  it('shows active state when grid is enabled', () => {
    render(<GridRulerToggle {...defaultProps} showGrid={true} />);
    
    const gridButton = screen.getByTitle('Toggle Grid (Ctrl + G)');
    expect(gridButton).toHaveClass('bg-blue-500');
  });

  it('shows active state when ruler is enabled', () => {
    render(<GridRulerToggle {...defaultProps} showRuler={true} />);
    
    const rulerButton = screen.getByTitle('Toggle Ruler (Ctrl + R)');
    expect(rulerButton).toHaveClass('bg-blue-500');
  });

  it('calls onToggleGrid when grid button is clicked', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} />);
    
    const gridButton = screen.getByTitle('Toggle Grid (Ctrl + G)');
    await user.click(gridButton);
    
    expect(defaultProps.onToggleGrid).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleRuler when ruler button is clicked', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} />);
    
    const rulerButton = screen.getByTitle('Toggle Ruler (Ctrl + R)');
    await user.click(rulerButton);
    
    expect(defaultProps.onToggleRuler).toHaveBeenCalledTimes(1);
  });

  it('opens grid settings dropdown when settings button is clicked', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} />);
    
    const gridSettingsButtons = screen.getAllByTitle('Grid Settings');
    await user.click(gridSettingsButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Grid Settings')).toBeInTheDocument();
      expect(screen.getByText('Show Grid')).toBeInTheDocument();
      expect(screen.getByText('Grid Size')).toBeInTheDocument();
      expect(screen.getByText('Grid Color')).toBeInTheDocument();
    });
  });

  it('opens ruler settings dropdown when settings button is clicked', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} />);
    
    const rulerSettingsButtons = screen.getAllByTitle('Ruler Settings');
    await user.click(rulerSettingsButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Ruler Settings')).toBeInTheDocument();
      expect(screen.getByText('Show Ruler')).toBeInTheDocument();
      expect(screen.getByText('Ruler Color')).toBeInTheDocument();
    });
  });

  it('shows grid size options in dropdown', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} />);
    
    const gridSettingsButtons = screen.getAllByTitle('Grid Settings');
    await user.click(gridSettingsButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('10px')).toBeInTheDocument();
      expect(screen.getByText('20px')).toBeInTheDocument();
      expect(screen.getByText('25px')).toBeInTheDocument();
      expect(screen.getByText('50px')).toBeInTheDocument();
      expect(screen.getByText('100px')).toBeInTheDocument();
    });
  });

  it('shows color options in grid dropdown', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} />);
    
    const gridSettingsButtons = screen.getAllByTitle('Grid Settings');
    await user.click(gridSettingsButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Light Gray')).toBeInTheDocument();
      expect(screen.getByText('Gray')).toBeInTheDocument();
      expect(screen.getByText('Dark Gray')).toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();
      expect(screen.getByText('Green')).toBeInTheDocument();
      expect(screen.getByText('Red')).toBeInTheDocument();
    });
  });

  it('calls onGridSizeChange when grid size is selected', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} />);
    
    const gridSettingsButtons = screen.getAllByTitle('Grid Settings');
    await user.click(gridSettingsButtons[0]);
    
    const size50px = await screen.findByText('50px');
    await user.click(size50px);
    
    expect(defaultProps.onGridSizeChange).toHaveBeenCalledWith(50);
  });

  it('calls onGridColorChange when grid color is selected', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} />);
    
    const gridSettingsButtons = screen.getAllByTitle('Grid Settings');
    await user.click(gridSettingsButtons[0]);
    
    const blueColor = await screen.findByText('Blue');
    await user.click(blueColor);
    
    expect(defaultProps.onGridColorChange).toHaveBeenCalledWith('#3b82f6');
  });

  it('calls onRulerColorChange when ruler color is selected', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} />);
    
    const rulerSettingsButtons = screen.getAllByTitle('Ruler Settings');
    await user.click(rulerSettingsButtons[0]);
    
    const greenColor = await screen.findByText('Green');
    await user.click(greenColor);
    
    expect(defaultProps.onRulerColorChange).toHaveBeenCalledWith('#10b981');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<GridRulerToggle {...defaultProps} disabled={true} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <GridRulerToggle {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows current grid size as selected in dropdown', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} gridSize={25} />);
    
    const gridSettingsButtons = screen.getAllByTitle('Grid Settings');
    await user.click(gridSettingsButtons[0]);
    
    await waitFor(() => {
      // The 25px option should be checked/selected
      const size25px = screen.getByText('25px');
      expect(size25px.closest('[role="menuitemcheckbox"]')).toHaveAttribute('data-state', 'checked');
    });
  });

  it('shows current grid color as selected in dropdown', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} gridColor="#3b82f6" />);
    
    const gridSettingsButtons = screen.getAllByTitle('Grid Settings');
    await user.click(gridSettingsButtons[0]);
    
    await waitFor(() => {
      // The Blue color should show as selected with indicator
      const blueColorText = screen.getByText('Blue');
      expect(blueColorText).toHaveClass('font-medium');
    });
  });

  it('toggles grid state in dropdown when Show Grid is clicked', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} showGrid={false} />);
    
    const gridSettingsButtons = screen.getAllByTitle('Grid Settings');
    await user.click(gridSettingsButtons[0]);
    
    const showGridOption = await screen.findByText('Show Grid');
    await user.click(showGridOption);
    
    expect(defaultProps.onToggleGrid).toHaveBeenCalledTimes(1);
  });

  it('toggles ruler state in dropdown when Show Ruler is clicked', async () => {
    const user = userEvent.setup();
    render(<GridRulerToggle {...defaultProps} showRuler={false} />);
    
    const rulerSettingsButtons = screen.getAllByTitle('Ruler Settings');
    await user.click(rulerSettingsButtons[0]);
    
    const showRulerOption = await screen.findByText('Show Ruler');
    await user.click(showRulerOption);
    
    expect(defaultProps.onToggleRuler).toHaveBeenCalledTimes(1);
  });
});