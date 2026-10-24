import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkspaceLayout from '@/app/(routes)/workspace/_components/WorkspaceLayout';

const renderLayout = (shown: 'doc' | 'both' | 'canvas', extra = {}) =>
  render(
    <WorkspaceLayout
      header={<div data-testid="header" />}
      doc={<div data-testid="doc" />}
      canvas={<div data-testid="canvas" />}
      shown={shown}
      {...extra}
    />
  );

const wrapper = (testId: string) => screen.getByTestId(testId).parentElement as HTMLElement;
// The doc and canvas wrappers sit inside the ResizablePane's own panel divs.
const panel = (testId: string) => wrapper(testId).parentElement as HTMLElement;

describe('WorkspaceLayout', () => {
  it('shows both panes at 40% document width by default', () => {
    renderLayout('both');

    expect(panel('doc')).not.toHaveClass('hidden');
    expect(panel('canvas')).not.toHaveClass('hidden');
    expect(panel('doc').style.width).toBe('40%');
  });

  it('hides the canvas but keeps it mounted in doc view', () => {
    renderLayout('doc');

    expect(panel('canvas')).toHaveClass('hidden');
    expect(panel('doc')).not.toHaveClass('hidden');
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('hides the document but keeps it mounted in canvas view', () => {
    renderLayout('canvas');

    expect(panel('doc')).toHaveClass('hidden');
    expect(panel('canvas')).not.toHaveClass('hidden');
    expect(screen.getByTestId('doc')).toBeInTheDocument();
  });

  it('renders the header and banner above the panes', () => {
    renderLayout('both', { banner: <div data-testid="banner" /> });

    const header = screen.getByTestId('header');
    const banner = screen.getByTestId('banner');
    const docNode = screen.getByTestId('doc');
    expect(header.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(banner.compareDocumentPosition(docNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('gives the panes their scroll and theme hooks', () => {
    renderLayout('both');

    expect(wrapper('doc')).toHaveClass('ws-doc', 'overflow-auto');
    expect(wrapper('canvas')).toHaveClass('ws-canvas');
  });
});
