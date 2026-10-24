import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import IconPicker from '@/app/(routes)/workspace/_components/diagram/IconPicker'
import { createRegistry, type IconEntry } from '@/lib/diagram/icons/registry'

const entry = (id: string, label: string, keywords: string[] = []): IconEntry => ({ id, provider: 'aws', label, keywords, aliases: [] })
const icons = createRegistry({ version: 1, icons: [entry('aws-ec2', 'Amazon EC2'), entry('aws-s3', 'Simple Storage Service', ['bucket'])] })

function setup(over: { icons?: typeof icons | null; line?: number; code?: string } = {}) {
  const onCode = jest.fn()
  render(
    <IconPicker
      icons={over.icons === undefined ? icons : over.icons}
      code={over.code ?? 'Web\nWeb > DB'}
      cursorLine={{ current: over.line ?? 1 }}
      onCode={onCode}
    />,
  )
  return { onCode, user: userEvent.setup() }
}

describe('IconPicker', () => {
  it('sets the icon found by keyword on the cursor line', async () => {
    const { onCode, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Icon' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search icons' }), 'bucket')

    expect(screen.queryByRole('button', { name: /Amazon EC2/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Simple Storage Service/ }))

    expect(onCode).toHaveBeenCalledWith('Web [icon: aws-s3]\nWeb > DB')
    expect(screen.queryByRole('group', { name: 'Icon picker' })).not.toBeInTheDocument()
  })

  it('disables the choices and says why when the cursor is not on a node line', async () => {
    const { onCode, user } = setup({ line: 2 })
    await user.click(screen.getByRole('button', { name: 'Icon' }))

    expect(screen.getByText('Put the cursor on a node line first.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Amazon EC2/ })).toBeDisabled()
    expect(onCode).not.toHaveBeenCalled()
  })

  it('is disabled while the icons are loading', () => {
    setup({ icons: null })
    expect(screen.getByRole('button', { name: 'Icon' })).toBeDisabled()
  })
})
