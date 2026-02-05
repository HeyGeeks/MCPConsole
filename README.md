# MCPConsole

A modern web application for chatting with AI providers while leveraging Model Context Protocol (MCP) servers to extend AI capabilities with external tools and data sources.

## Overview

MCPConsole is a Next.js 15 + React 19 TypeScript application that provides:

- **Multi-Provider AI Chat**: Connect to various AI providers (Google Gemini, OpenAI, Anthropic Claude, etc.) and chat with their models
- **MCP Server Integration**: Add and manage MCP servers to extend AI capabilities with external tools, APIs, and data sources
- **OAuth2 Authentication**: Secure OAuth2 flows for MCP servers requiring authentication, with automatic token refresh
- **Persistent Configuration**: All settings, chat history, and OAuth tokens persist in localStorage and sync across browser tabs
- **Modern UI**: Clean, responsive interface built with Tailwind CSS, Radix UI, and shadcn-style components

## Features

### AI Provider Management
- Add multiple AI providers with custom API keys and endpoints
- Support for various API types: OpenAI-compatible, Google, Anthropic, Ollama
- Configure multiple models per provider
- Easy switching between providers and models during chat

### MCP Server Management
- Add HTTP, SSE, and HTTP-direct MCP servers
- OAuth2 authentication with PKCE flow
- Automatic token refresh and persistence
- Connection status monitoring
- Server-side connection management with fallback strategies

### Chat Interface
- Real-time streaming responses
- Markdown rendering with syntax highlighting
- Tool call execution from connected MCP servers
- Chat history persistence

### Cross-Tab Synchronization
- Settings and configurations sync across browser tabs in real-time
- OAuth tokens persist and restore automatically on page reload
- Consistent state management across multiple windows

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI, lucide-react icons
- **Forms**: react-hook-form, zod validation
- **MCP SDK**: @modelcontextprotocol/sdk
- **State**: React Context with localStorage persistence
- **Deployment**: Firebase App Hosting (configurable)

## Getting Started

### Prerequisites

- Node.js 20+ (or Bun)
- npm, pnpm, or bun package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mcpconsole
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
# or
bun install
```

3. Set up environment variables (optional):

Create a `.env.local` file in the root directory:

```env
# Application URL (used for OAuth callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:9002

# Optional: Firebase configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
```

### Running the Development Server

```bash
npm run dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application base URL (for OAuth redirects) | `http://localhost:9002` |
| `FIREBASE_API_KEY` | Firebase API key (if using Firebase) | - |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain | - |
| `FIREBASE_PROJECT_ID` | Firebase project ID | - |

### Adding AI Providers

1. Navigate to **Settings > Providers**
2. Click **Add Provider**
3. Fill in:
   - Name (e.g., "My OpenAI")
   - API Key
   - API Type (OpenAI Compatible, Google, Anthropic, etc.)
   - Base URL (optional, for custom endpoints)
   - Models (comma-separated list of model IDs)

### Adding MCP Servers

1. Navigate to **Settings > MCP Servers**
2. Click **Add Server**
3. Fill in:
   - Name (e.g., "GitHub MCP")
   - Type (HTTP, SSE, or HTTP-direct)
   - URL (MCP server endpoint)
   - OAuth2 Configuration (if required):
     - Client ID
     - Client Secret (optional)
     - Authorization URL
     - Token URL
     - Scope

4. If OAuth is required, click **Authorize** to complete the OAuth flow in a popup window

## OAuth Flow

MCPConsole implements a secure OAuth2 PKCE (Proof Key for Code Exchange) flow:

1. **Authorization Request**: User clicks "Authorize" on an MCP server
2. **Popup Window**: Authorization URL opens in a new popup window
3. **User Authentication**: User logs in and grants permissions on the provider's site
4. **Callback**: Provider redirects to the callback URL with an authorization code
5. **Token Exchange**: Code is exchanged for access and refresh tokens
6. **Token Storage**: Tokens are stored in:
   - Backend memory (for active connections)
   - localStorage (for persistence across reloads)
7. **Auto-Close**: Popup window posts message to main window and closes automatically
8. **Connection**: Server automatically connects using the access token

### Token Refresh

- Access tokens are automatically refreshed when expired
- Refresh tokens are persisted in localStorage
- Tokens sync across browser tabs via storage events

## MCP Server Types

### HTTP
Standard HTTP transport for stateless MCP servers. Each request is independent.

### SSE (Server-Sent Events)
Bidirectional streaming transport for real-time MCP servers. Falls back to HTTP if SSE fails.

### HTTP-direct
Direct HTTP transport without the MCP coordinator, for servers that implement their own stateless protocol.

## Development

### Code Style

- TypeScript strict mode enabled
- Feature-based organization with barrel exports
- Component co-location (components, hooks, services, types per feature)
- Tailwind CSS for styling with shadcn-style components

### Key Services

- **AppContext** (`src/shared/context/app-context.tsx`): Global state management for providers, servers, chat history, and OAuth tokens
- **MCPCoordinator** (`src/features/mcp-servers/services/coordinator.ts`): Server-side MCP connection coordination
- **useLocalStorage** (`src/shared/hooks/use-local-storage.ts`): Persistent state with cross-tab sync

### Available Scripts

```bash
npm run dev          # Start development server (port 9002)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
```

## Troubleshooting

### OAuth Authorization Fails

- **Check Environment**: Ensure `NEXT_PUBLIC_APP_URL` matches your actual URL
- **Popup Blocked**: Some browsers block popups; allow popups for this site
- **Redirect URI**: Ensure the redirect URI in your OAuth app matches: `${APP_URL}/api/mcp/oauth-callback`
- **CORS**: MCP server must allow your origin for OAuth flows

### MCP Server Won't Connect

- **Check URL**: Verify the MCP server URL is correct and accessible
- **OAuth Required**: If server returns 401, configure OAuth2 settings
- **Network**: Check browser console for network errors
- **Type**: Try different transport types (HTTP/SSE/HTTP-direct)

### Tokens Not Persisting

- **localStorage**: Ensure browser allows localStorage
- **Private Mode**: Tokens won't persist in incognito/private mode
- **Clear Storage**: Check if localStorage is being cleared by extensions

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT License](LICENSE)

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components based on [shadcn/ui](https://ui.shadcn.com/)
- MCP integration via [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk)
- Icons from [Lucide](https://lucide.dev/)

---

**Developed by Heygeeks.in**
