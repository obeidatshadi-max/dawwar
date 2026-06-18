import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Spinner from './Spinner'

describe('Spinner', () => {
  it('renders an animated spinner element', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('.animate-spin')).toBeTruthy()
  })
})
