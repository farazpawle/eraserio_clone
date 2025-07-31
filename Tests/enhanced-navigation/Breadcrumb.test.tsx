import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Breadcrumb, BreadcrumbItem } from '@/components/ui/breadcrumb';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Breadcrumb Component', () => {
  const mockItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/dashboard/projects' },
    { label: 'Current Project', isCurrentPage: true },
  ];

  it('renders breadcrumb items correctly', () => {
    render(<Breadcrumb items={mockItems} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Current Project')).toBeInTheDocument();
  });

  it('renders home icon when showHome is true', () => {
    render(<Breadcrumb items={mockItems} showHome={true} />);
    
    const homeIcon = screen.getByRole('link', { name: /home/i });
    expect(homeIcon).toBeInTheDocument();
    expect(homeIcon).toHaveAttribute('href', '/dashboard');
  });

  it('does not render home icon when showHome is false', () => {
    render(<Breadcrumb items={mockItems} showHome={false} />);
    
    const homeIcon = screen.queryByRole('link', { name: /home/i });
    expect(homeIcon).not.toBeInTheDocument();
  });

  it('renders links for non-current pages', () => {
    render(<Breadcrumb items={mockItems} />);
    
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const projectsLink = screen.getByRole('link', { name: 'Projects' });
    
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    expect(projectsLink).toHaveAttribute('href', '/dashboard/projects');
  });

  it('does not render link for current page', () => {
    render(<Breadcrumb items={mockItems} />);
    
    const currentPageElement = screen.getByText('Current Project');
    expect(currentPageElement).not.toHaveAttribute('href');
    expect(currentPageElement).toHaveAttribute('aria-current', 'page');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Breadcrumb items={mockItems} className="custom-breadcrumb" />
    );
    
    const breadcrumbNav = container.querySelector('nav');
    expect(breadcrumbNav).toHaveClass('custom-breadcrumb');
  });

  it('uses custom home href', () => {
    render(<Breadcrumb items={mockItems} homeHref="/custom-home" />);
    
    const homeIcon = screen.getByRole('link', { name: /home/i });
    expect(homeIcon).toHaveAttribute('href', '/custom-home');
  });

  it('renders empty breadcrumb with only home when no items provided', () => {
    render(<Breadcrumb items={[]} />);
    
    const homeIcon = screen.getByRole('link', { name: /home/i });
    expect(homeIcon).toBeInTheDocument();
    
    // Should not have any chevron icons when no items
    const chevrons = screen.queryAllByTestId('chevron-right');
    expect(chevrons).toHaveLength(0);
  });
});