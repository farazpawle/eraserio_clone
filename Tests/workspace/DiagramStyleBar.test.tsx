import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiagramStyleBar from '@/app/(routes)/workspace/_components/diagram/DiagramStyleBar'
import { setSetting } from '@/lib/diagram/parse/settings'

function setup(code = 'A > B', diagramType: 'flowchart' | 'cloud' = 'flowchart') {
  const onCode = jest.fn()
  const onType = jest.fn()
  render(<DiagramStyleBar code={code} diagramType={diagramType} onCode={onCode} onType={onType} />)
  return { onCode, onType }
}

describe('DiagramStyleBar', () => {
  it('gives every select an accessible name', () => {
    setup()
    for (const name of ['Type', 'Direction', 'Colour', 'Style', 'Font']) {
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument()
    }
  })

  it('shows the defaults when the code has no settings', () => {
    setup()
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveValue('flowchart')
    expect(screen.getByRole('combobox', { name: 'Direction' })).toHaveValue('right')
    expect(screen.getByRole('combobox', { name: 'Colour' })).toHaveValue('pastel')
    expect(screen.getByRole('combobox', { name: 'Style' })).toHaveValue('plain')
    expect(screen.getByRole('combobox', { name: 'Font' })).toHaveValue('clean')
  })

  it('shows the values written in the code and the type prop', () => {
    setup('direction up\r\ncolorMode bold\nstyleMode shadow\ntypeface mono\nA > B', 'cloud')
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveValue('cloud')
    expect(screen.getByRole('combobox', { name: 'Direction' })).toHaveValue('up')
    expect(screen.getByRole('combobox', { name: 'Colour' })).toHaveValue('bold')
    expect(screen.getByRole('combobox', { name: 'Style' })).toHaveValue('shadow')
    expect(screen.getByRole('combobox', { name: 'Font' })).toHaveValue('mono')
  })

  it('rewrites the code when Direction changes', async () => {
    const { onCode } = setup()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Direction' }), 'down')
    expect(onCode).toHaveBeenCalledWith(setSetting('A > B', 'direction', 'down'))
  })

  it('maps Colour, Style and Font to their setting lines', async () => {
    const { onCode } = setup()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Colour' }), 'outline')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Style' }), 'watercolor')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Font' }), 'rough')
    expect(onCode).toHaveBeenNthCalledWith(1, 'colorMode outline\nA > B')
    expect(onCode).toHaveBeenNthCalledWith(2, 'styleMode watercolor\nA > B')
    expect(onCode).toHaveBeenNthCalledWith(3, 'typeface rough\nA > B')
  })

  it('changes the type without touching the code', async () => {
    const { onCode, onType } = setup()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'cloud')
    expect(onType).toHaveBeenCalledWith('cloud')
    expect(onCode).not.toHaveBeenCalled()
  })

  it('does nothing when the current value is chosen again', async () => {
    const { onCode, onType } = setup('direction down\nA > B')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Direction' }), 'down')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'flowchart')
    expect(onCode).not.toHaveBeenCalled()
    expect(onType).not.toHaveBeenCalled()
  })
})
