import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Mock the useAuth hook
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // If app renders without throwing, test passes
    expect(document.body).toBeInTheDocument()
  })

  it('redirects to login when not authenticated', () => {
    render(<App />)

    // Should show login form when not authenticated
    expect(screen.getByText('LoadBlock')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
  })
})