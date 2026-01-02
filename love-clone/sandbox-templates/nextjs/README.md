# E2B Next.js Sandbox Template

This directory contains the E2B sandbox template configuration for running Next.js applications.

## Setup

1. **Set your E2B API key** (if not already set via CLI):
   ```bash
   export E2B_API_KEY=your_e2b_api_key_here
   ```
   
   Or create a `.env` file in the project root:
   ```
   E2B_API_KEY=your_e2b_api_key_here
   ```

2. **Build the template**:
   ```bash
   # Development build
   npx tsx sandbox-templates/nextjs/build.dev.ts
   
   # Production build
   npx tsx sandbox-templates/nextjs/build.prod.ts
   ```

## Running the Example

After building the template, run the example:

```bash
npx tsx sandbox-templates/nextjs/example.ts
```

## Template Details

- **Template Alias**: `love-clone-test-4-dev` (dev) or `love-clone-test-4` (prod)
- **Base Image**: `node:21-slim`
- **Start Command**: `compile_page.sh` (starts Next.js dev server)
- **Ready Command**: `sleep 20` (waits for server to be ready)

## What the Template Includes

- Node.js 21
- Next.js (latest)
- shadcn/ui components (all components)
- Pre-configured Next.js app in `/home/user`
- Next.js dev server running on port 3000

## Using the Sandbox in Your Code

```typescript
import { Sandbox } from 'e2b'

// Create a sandbox from your template
const sandbox = await Sandbox.create({
  template: 'love-clone-test-4-dev',
})

// The Next.js server is already running!
// Access it via the sandbox's hostname

// Upload files
await sandbox.filesystem.write('/home/user/app/page.tsx', '...')

// Execute commands
const result = await sandbox.process.start({
  cmd: 'npm run build',
})
await result.wait()

// Clean up
await sandbox.close()
```

## Files

- `template.ts` - Template definition
- `build.dev.ts` - Development build script
- `build.prod.ts` - Production build script
- `compile_page.sh` - Startup script that starts Next.js
- `example.ts` - Example usage

