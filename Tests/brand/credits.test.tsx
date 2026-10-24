import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import PrivacyPage from '@/app/privacy/page'

describe('privacy page credits', () => {
  beforeEach(() => {
    render(<PrivacyPage />)
  })

  it('has a Credits section', () => {
    expect(screen.getByRole('heading', { name: 'Credits' })).toBeInTheDocument()
  })

  it('credits the Kubernetes icons under CC BY 4.0 with both links', () => {
    expect(screen.getByText(/Kubernetes Authors/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/')
    expect(screen.getByRole('link', { name: 'Kubernetes community icons' })).toHaveAttribute(
      'href',
      'https://github.com/kubernetes/community/tree/master/icons',
    )
  })

  it('names the owners of the AWS, Azure and Google Cloud icons', () => {
    const credits = screen.getByRole('heading', { name: 'Credits' }).parentElement!
    expect(credits).toHaveTextContent('Amazon Web Services')
    expect(credits).toHaveTextContent('Microsoft Azure')
    expect(credits).toHaveTextContent('Google Cloud')
  })
})
