import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import UserMenu from '@/app/(routes)/workspace/_components/UserMenu'

const mockSetTheme = jest.fn()

jest.mock('@/app/_context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: mockSetTheme, actualTheme: 'light' }),
}))

const user = { id: 'u1', email: 'faraz@example.com', name: 'Faraz', avatarUrl: null }

const open = async () => {
  const ui = userEvent.setup()
  render(<UserMenu user={user} />)
  await ui.click(screen.getByRole('button', { name: 'Account menu' }))
  return ui
}

describe('UserMenu', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders nothing when nobody is signed in', () => {
    const { container } = render(<UserMenu user={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the email and marks the current theme', async () => {
    await open()

    expect(screen.getByText('faraz@example.com')).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'false')
  })

  it('switches the theme', async () => {
    const ui = await open()
    await ui.click(screen.getByRole('menuitemradio', { name: 'Dark' }))

    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('goes back to the dashboard', async () => {
    const push = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push })
    const ui = await open()
    await ui.click(screen.getByRole('menuitem', { name: 'Back to dashboard' }))

    expect(push).toHaveBeenCalledWith('/dashboard')
  })
})
