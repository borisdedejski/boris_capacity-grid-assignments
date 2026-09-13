import { setupServer } from 'msw/node'

// Starts with no handlers: each test registers the responses it needs with server.use().
export const server = setupServer()
