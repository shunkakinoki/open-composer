# Microfrontends Setup

This project uses Vercel's microfrontends feature to enable multiple Next.js applications to be deployed as a single application with shared routing.

## Architecture

- **Landing App** (`@open-composer/landing`) - Default application that serves the main landing page and handles routing
- **Docs App** (`@open-composer/docs`) - Documentation microfrontend served under `/docs/*` paths

## Setup Instructions

### 1. Vercel Dashboard Setup

Before deploying, you need to create a microfrontends group in your Vercel dashboard:

1. Navigate to your Vercel team settings
2. Go to the "Microfrontends" tab
3. Click "Create Group"
4. Add both `@open-composer/landing` and `@open-composer/docs` projects to the group
5. Set `@open-composer/landing` as the default application

### 2. Configuration Files

The microfrontends configuration is defined in `apps/landing/microfrontends.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "@open-composer/landing": {
      "packageName": "open-composer-landing",
      "development": {
        "fallback": "https://placeholder.com"
      }
    },
    "@open-composer/docs": {
      "packageName": "open-composer-docs",
      "routing": [
        {
          "group": "docs",
          "paths": ["/docs", "/docs/:path*"]
        }
      ]
    }
  }
}
```

The `packageName` field maps the scoped package names to the Vercel project names.

### 3. Next.js Configuration

Both applications use the `@vercel/microfrontends` package with the `withMicrofrontends` wrapper:

```typescript
import type { NextConfig } from "next";
import { withMicrofrontends } from "@vercel/microfrontends/next/config";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withMicrofrontends(nextConfig);
```

## Development

### Local Development with Proxy

For seamless local development, use the microfrontends proxy:

```bash
# Start the proxy for all apps
npm run dev:microfrontends

# In another terminal, start individual apps
cd apps/landing && npm run dev
cd apps/docs && npm run dev
```

The proxy will automatically route requests:
- `/` → Landing app
- `/docs/*` → Docs app
- Other requests → Production fallback

### Individual App Development

You can also develop apps individually:

```bash
# Develop landing app only
cd apps/landing && npm run dev

# Develop docs app only
cd apps/docs && npm run dev
```

## Deployment

1. Deploy both applications to Vercel
2. The microfrontends configuration in the landing app will automatically handle routing
3. Visit your landing app's domain to see the combined application
4. Documentation will be available under `/docs/*` paths

## Asset Management

The `withMicrofrontends` wrapper automatically:
- Adds asset prefixes to avoid conflicts between applications
- Handles static assets (images, CSS, JS) correctly
- Ensures proper routing for all resources

## Troubleshooting

### Common Issues

1. **Assets not loading**: Ensure both apps are using the `withMicrofrontends` wrapper
2. **Routing not working**: Check that the `microfrontends.json` configuration is correct
3. **Development proxy issues**: Make sure the proxy is running and apps are on the correct ports

### Debug Information

You can check the microfrontends configuration by:
1. Looking at the Network tab in browser dev tools
2. Checking the asset prefix in the HTML source
3. Verifying the routing configuration in the Vercel dashboard

## Next Steps

- Add more microfrontends by following the same pattern
- Configure shared dependencies if needed
- Set up proper production fallback URLs
- Add more complex routing rules as your application grows
