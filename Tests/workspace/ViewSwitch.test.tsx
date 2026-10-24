import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ViewSwitch from '@/app/(routes)/workspace/_components/ViewSwitch'

describe('ViewSwitch', () => {
  it('shows Document, Both and Canvas with the current one selected', () => {
    render(<ViewSwitch value="both" onChange={jest.fn()} narrow={false} />)

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Document', 'Both', 'Canvas'])
    expect(screen.getByRole('tab', { name: 'Both' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Canvas' })).toHaveAttribute('aria-selected', 'false')
  })

  it('reports the clicked view', async () => {
    const onChange = jest.fn()
    render(<ViewSwitch value="both" onChange={onChange} narrow={false} />)

    await userEvent.click(screen.getByRole('tab', { name: 'Canvas' }))

    expect(onChange).toHaveBeenCalledWith('canvas')
  })

  it('moves with the arrow keys', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<ViewSwitch value="both" onChange={onChange} narrow={false} />)

    screen.getByRole('tab', { name: 'Both' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('canvas')

    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith('both') // focus moved to Canvas, so Left goes back to Both
  })

  it('leaves out Both on narrow screens', () => {
    render(<ViewSwitch value="doc" onChange={jest.fn()} narrow />)

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Document', 'Canvas'])
  })
})
