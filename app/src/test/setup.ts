import '@testing-library/jest-dom'

// Mock IntersectionObserver (used by many UI components)
class MockIntersectionObserver {
  observe() { return null }
  unobserve() { return null }
  disconnect() { return null }
}

if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  window.IntersectionObserver = MockIntersectionObserver as any
}
