# Configuration Module

This directory contains configuration modules for the application.

## Modules

### Environment Configuration (`env.ts`)

The environment configuration module provides type-safe access to environment variables with validation.

### Application Constants (`constants.ts`)

The constants module provides centralized application-wide constants for consistent usage throughout the codebase.

---

## Environment Configuration (`env.ts`)

### Features

- **Type-safe configuration**: All environment variables are typed and validated
- **Startup validation**: Validates required environment variables at application startup
- **Caching**: Configuration is validated once and cached for performance
- **Production checks**: Enforces stricter validation in production environments

### Usage

#### Basic Usage

```typescript
import { getEnvConfig } from '@/shared/config/env';

// Get the validated configuration
const config = getEnvConfig();

console.log('Environment:', config.nodeEnv);
console.log('App URL:', config.appUrl);

// Access optional API keys
if (config.openaiApiKey) {
  console.log('OpenAI is configured');
}
```

#### Startup Validation

Call `validateEnvAtStartup()` early in your application lifecycle to ensure all required environment variables are present:

```typescript
// In your root layout or app entry point
import { validateEnvAtStartup } from '@/shared/config/env';

// This will throw an error if validation fails
validateEnvAtStartup();
```

#### In API Routes

```typescript
import { getEnvConfig } from '@/shared/config/env';

export async function GET(request: Request) {
  const config = getEnvConfig();
  
  // Use the app URL for OAuth redirects
  const redirectUri = `${config.appUrl}/api/oauth/callback`;
  
  return Response.json({ redirectUri });
}
```

#### In Server Components

```typescript
import { getEnvConfig } from '@/shared/config/env';

export default function ServerComponent() {
  const config = getEnvConfig();
  
  return (
    <div>
      <h1>Environment: {config.nodeEnv}</h1>
      <p>App URL: {config.appUrl}</p>
    </div>
  );
}
```

### Environment Variables

The following environment variables are supported:

#### Required

- `NODE_ENV`: Node environment (`development`, `production`, or `test`)
  - Default: `development`

#### Optional

- `NEXT_PUBLIC_APP_URL`: Public application URL for OAuth redirects and external links
  - Used for: OAuth callback URLs, external links
  - Default: Falls back to `VERCEL_URL` or `http://localhost:9002`

- `VERCEL_URL`: Vercel deployment URL (automatically set by Vercel)
  - Used when `NEXT_PUBLIC_APP_URL` is not set

- `OPENAI_API_KEY`: OpenAI API key for AI provider integration
- `GOOGLE_API_KEY`: Google AI API key for AI provider integration
- `ANTHROPIC_API_KEY`: Anthropic API key for AI provider integration

### Production Requirements

In production environments:

1. Either `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` must be set
2. At least one AI provider API key is recommended (warning logged if none are configured)

### Error Handling

The module throws `EnvironmentValidationError` when validation fails:

```typescript
import { getEnvConfig, EnvironmentValidationError } from '@/shared/config/env';

try {
  const config = getEnvConfig();
  // Use config...
} catch (error) {
  if (error instanceof EnvironmentValidationError) {
    console.error('Environment validation failed:', error.message);
    // Handle validation error...
  }
}
```

### Testing

For testing purposes, you can reset the cached configuration:

```typescript
import { resetEnvConfig } from '@/shared/config/env';

// Reset the cache (useful in tests)
resetEnvConfig();
```

### Example .env File

Create a `.env.local` file in your project root:

```env
# Node environment
NODE_ENV=development

# Application URL (for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:9002

# AI Provider API Keys (optional)
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_API_KEY=your-google-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
```

### Migration from Direct `process.env` Access

**Before:**
```typescript
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const openaiKey = process.env.OPENAI_API_KEY;
```

**After:**
```typescript
import { getEnvConfig } from '@/shared/config/env';

const config = getEnvConfig();
const appUrl = config.appUrl;
const openaiKey = config.openaiApiKey;
```

### Benefits

1. **Type Safety**: TypeScript knows the exact shape of your configuration
2. **Validation**: Catches missing or invalid environment variables early
3. **Centralization**: All environment variable access goes through one module
4. **Documentation**: Configuration interface serves as documentation
5. **Testing**: Easy to mock and test with `resetEnvConfig()`

---

## Application Constants (`constants.ts`)

### Features

- **Centralized constants**: All application-wide constants in one location
- **Type-safe access**: TypeScript types for all constant values
- **Organized by domain**: Constants grouped by functionality
- **Immutable**: All constants are readonly using `as const`

### Usage

#### API Routes

```typescript
import { API_ROUTES } from '@/shared/config/constants';

// Use centralized API route paths
const response = await fetch(API_ROUTES.MCP.TOOLS);
const status = await fetch(API_ROUTES.MCP.STATUS);
```

#### Breakpoints

```typescript
import { BREAKPOINTS } from '@/shared/config/constants';

// Use in media queries
const isMobile = window.innerWidth < BREAKPOINTS.MOBILE;

// Use in styled components or CSS-in-JS
const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.MOBILE - 1}px)`);
```

#### Timing Constants

```typescript
import { TIMING } from '@/shared/config/constants';

// Use for intervals and timeouts
const interval = setInterval(fetchStatus, TIMING.MCP_STATUS_POLL_INTERVAL);

// Use for API timeouts
const response = await fetch(url, { 
  signal: AbortSignal.timeout(TIMING.DEFAULT_API_TIMEOUT) 
});
```

#### Storage Keys

```typescript
import { STORAGE_KEYS } from '@/shared/config/constants';

// Use for localStorage/sessionStorage
const theme = localStorage.getItem(STORAGE_KEYS.THEME);
localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));
```

#### Type Constants

```typescript
import { PROVIDER_TYPES, MESSAGE_ROLES, type ProviderType } from '@/shared/config/constants';

// Use constant values
const provider: ProviderType = PROVIDER_TYPES.OPENAI;

// Use in conditionals
if (message.role === MESSAGE_ROLES.USER) {
  // Handle user message
}
```

### Available Constants

#### API_ROUTES
Centralized API endpoint paths:
- `MCP.*` - MCP server endpoints
- `GOOGLE` - Google AI proxy endpoint

#### BREAKPOINTS
Responsive design breakpoints:
- `MOBILE` - 768px
- `TABLET` - 1024px
- `DESKTOP` - 1280px
- `LARGE_DESKTOP` - 1536px

#### TIMING
Timing values in milliseconds:
- `TOAST_REMOVE_DELAY` - Toast notification duration
- `MCP_STATUS_POLL_INTERVAL` - Status polling interval
- `DEFAULT_API_TIMEOUT` - API request timeout
- `TOOLTIP_DELAY` - Tooltip delay

#### UI_LIMITS
UI constraints:
- `TOAST_LIMIT` - Maximum simultaneous toasts

#### DEFAULTS
Default values:
- `MCP_SERVER_URL_PLACEHOLDER` - Default MCP URL placeholder
- `OAUTH_DEFAULT_SCOPE` - Default OAuth scope

#### HTTP_HEADERS
Common HTTP headers:
- `CONTENT_TYPE_JSON` - JSON content type
- `AUTHORIZATION` - Authorization header name

#### STORAGE_KEYS
LocalStorage/SessionStorage keys:
- `THEME` - Theme preference
- `PROVIDERS` - AI providers config
- `MCP_SERVERS` - MCP servers config
- `SELECTED_PROVIDER` - Selected provider ID
- `SELECTED_MCP_SERVERS` - Selected MCP server IDs
- `MESSAGES` - Chat messages

#### PROVIDER_TYPES
AI provider identifiers:
- `OPENAI` - OpenAI provider
- `GOOGLE` - Google AI provider
- `ANTHROPIC` - Anthropic provider

#### TRANSPORT_TYPES
MCP transport protocols:
- `STDIO` - Standard I/O
- `SSE` - Server-Sent Events
- `WEBSOCKET` - WebSocket

#### AUTH_TYPES
Authentication methods:
- `OAUTH` - OAuth 2.0
- `API_KEY` - API key

#### MESSAGE_ROLES
Chat message roles:
- `USER` - User message
- `ASSISTANT` - AI message
- `SYSTEM` - System message
- `TOOL` - Tool result

#### CONNECTION_STATUS
Connection status values:
- `CONNECTING` - Establishing connection
- `CONNECTED` - Active connection
- `DISCONNECTED` - Closed connection
- `ERROR` - Connection error

#### APP_METADATA
Application information:
- `NAME` - Application name
- `VERSION` - Application version
- `DESCRIPTION` - Application description

### Type Exports

The module also exports TypeScript types for constant values:

```typescript
import type { 
  ProviderType, 
  TransportType, 
  AuthType, 
  MessageRole, 
  ConnectionStatus 
} from '@/shared/config/constants';

// Use in type annotations
function handleMessage(role: MessageRole, content: string) {
  // ...
}

interface Server {
  transport: TransportType;
  auth: AuthType;
  status: ConnectionStatus;
}
```

### Migration from Hardcoded Values

**Before:**
```typescript
// Scattered throughout codebase
const response = await fetch('/api/mcp/tools');
const isMobile = window.innerWidth < 768;
const theme = localStorage.getItem('theme');
```

**After:**
```typescript
import { API_ROUTES, BREAKPOINTS, STORAGE_KEYS } from '@/shared/config/constants';

const response = await fetch(API_ROUTES.MCP.TOOLS);
const isMobile = window.innerWidth < BREAKPOINTS.MOBILE;
const theme = localStorage.getItem(STORAGE_KEYS.THEME);
```

### Benefits

1. **Single Source of Truth**: All constants in one location
2. **Type Safety**: TypeScript enforces correct constant usage
3. **Refactoring**: Easy to update values across entire codebase
4. **Discoverability**: Developers can find all available constants
5. **Consistency**: Prevents typos and inconsistent values
6. **Documentation**: Constants are self-documenting with JSDoc comments

### Adding New Constants

When adding new constants:

1. Choose the appropriate category or create a new one
2. Use `as const` to make the object readonly
3. Add JSDoc comments for documentation
4. Export types if the constants represent a union type
5. Update this README with the new constants

Example:

```typescript
/**
 * New category description
 */
export const NEW_CATEGORY = {
  /** Constant description */
  CONSTANT_NAME: 'value',
} as const;

// Export type if needed
export type NewType = typeof NEW_CATEGORY[keyof typeof NEW_CATEGORY];
```
