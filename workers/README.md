# PostHog Anonymous Logger Worker

A TypeScript Cloudflare Worker that provides anonymous event logging to PostHog with IP-based rate limiting for abuse prevention.

## Features

- **TypeScript**: Full type safety and better developer experience
- **Anonymous Event Logging**: Strips personally identifiable information and forwards events to PostHog
- **IP-Based Rate Limiting**: Uses Durable Objects to prevent abuse (100 requests per minute per IP)
- **CORS Support**: Handles cross-origin requests for web applications
- **Error Handling**: Comprehensive error handling and response formatting
- **Comprehensive Testing**: Unit tests using Vitest and Cloudflare Workers testing framework

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure PostHog API Key**:
   Update the `POSTHOG_PROJECT_API_KEY` variable in `wrangler.toml` with your PostHog project API key.

3. **Set up Rate Limiting** (Optional):
   If you want to use the native Rate Limiting API instead of Durable Objects, update the `namespace_id` in the `wrangler.toml` file with your Cloudflare namespace ID.

4. **Deploy**:
   ```bash
   npm run deploy
   ```

## Usage

Send POST requests to the worker endpoint with the following structure:

```typescript
interface IncomingEvent {
  event?: string;
  properties?: Record<string, any>;
  anonymous_id?: string;
  timestamp?: string;
}
```

Example request:
```javascript
{
  "event": "button_click",
  "properties": {
    "button_name": "signup",
    "page": "landing"
  },
  "anonymous_id": "optional-anonymous-id"
}
```

The worker will:
- Check rate limits based on client IP
- Strip any identifying information (`$set`, `$set_once`, `distinct_id`)
- Add anonymous identifiers (`$ip`, `anonymous_id`)
- Forward the event to PostHog

## Rate Limiting

- **Limit**: 100 requests per minute per IP address
- **Method**: Sliding window using Durable Objects
- **Response**: 429 status with retry-after header when exceeded
- **Cleanup**: Automatically removes old rate limit windows

## Testing

The project includes comprehensive tests using Vitest and Cloudflare Workers testing framework:

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Type check
npm run type-check
```

### Test Coverage

- **CORS handling**: Preflight requests and headers
- **HTTP method validation**: Only POST requests allowed
- **Rate limiting**: IP-based limits with Durable Objects
- **Event processing**: JSON parsing and PostHog forwarding
- **Data sanitization**: Removal of identifying information
- **Error handling**: Invalid JSON and network errors
- **Edge cases**: Concurrent requests, window boundaries, cleanup

## Security Considerations

- IP-based rate limiting may affect users behind shared proxies
- No authentication required for anonymous logging
- Events are sanitized to remove identifying information
- CORS is enabled for all origins (consider restricting in production)
- All personally identifiable properties are stripped

## Configuration

### Environment Variables in `wrangler.toml`:
- `POSTHOG_HOST`: PostHog instance URL (default: https://app.posthog.com)
- `POSTHOG_PROJECT_API_KEY`: Your PostHog project API key

### TypeScript Configuration:
- **Target**: ES2022
- **Module**: ES2022 with bundler resolution
- **Strict mode**: Enabled for type safety
- **Workers Types**: @cloudflare/workers-types included

## Development

```bash
# Start local development server
npm run dev

# Build (dry run deploy)
npm run build

# Type check
npm run type-check

# Run tests
npm run test

# View logs
npm run tail

# Deploy to production
npm run deploy
```

## File Structure

```
workers/
├── src/
│   └── index.ts           # Main worker code
├── test/
│   ├── index.test.ts      # Main worker tests
│   ├── rate-limiter.test.ts # Rate limiter specific tests
│   └── setup.ts           # Test setup and mocks
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Test configuration
├── wrangler.toml          # Cloudflare Workers configuration
└── README.md              # This file
```