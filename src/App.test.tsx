import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the planner title and introduction', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'NPD Planner' })).toBeInTheDocument()
    expect(screen.getByText('Estructura inicial del proyecto')).toBeInTheDocument()
  })
})
