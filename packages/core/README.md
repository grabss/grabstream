<div align="center">

# @grabstream/core

*Core library for grabstream packages.*

[![NPM Version](https://img.shields.io/npm/v/@grabstream/core.svg)](https://www.npmjs.com/package/@grabstream/core)
[![License](https://img.shields.io/npm/l/@grabstream/core.svg)](https://github.com/grabss/grabstream/blob/main/LICENSE)

</div>

## Installation

```bash
npm install @grabstream/core
```

## How to use

```ts
import { 
  logger, 
  validateDisplayName, 
  validateRoomId,
  type ClientToServerMessage,
  isClientToServerMessage 
} from '@grabstream/core'

// Validation
const result = validateDisplayName('John Doe')
if (!result.success) {
  console.error(result.error)
}

// Logger
logger.info('user:joined', { userId: '123' })

// Message type guards
if (isClientToServerMessage(message)) {
  // TypeScript knows this is ClientToServerMessage
  console.log(message.type)
}
```

## What's included

- **Validation**: Input validation functions with detailed error information
- **Logger**: Structured logging with consistent format
- **Messages**: WebRTC message type definitions and type guards
- **Constants**: Shared constants for validation limits and patterns
