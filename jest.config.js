const nextJest = require('next/jest')

// Providing the path to your Next.js app so it can load your Next.js config and .env files
const createJestConfig = nextJest({
  dir: './',
})

// Custom Jest configuration
const customJestConfig = {
  // This tells Jest to simulate a web browser environment so it can render your React components
  testEnvironment: 'jest-environment-jsdom',
}

// Export the configuration so Jest can use it
module.exports = createJestConfig(customJestConfig)