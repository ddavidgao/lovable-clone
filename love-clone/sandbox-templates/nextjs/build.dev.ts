import { config } from 'dotenv'
import { resolve, join } from 'path'
import { existsSync } from 'fs'
// Try to find .env file - check current dir, then go up to project root
let envPath = resolve(process.cwd(), '.env')
if (!existsSync(envPath)) {
  envPath = resolve(process.cwd(), '../..', '.env')
}
if (existsSync(envPath)) {
  config({ path: envPath })
}
import { Template, defaultBuildLogger } from 'e2b'
import { template } from './template'

async function main() {
  await Template.build(template, {
    alias: 'love-clone-test-4-dev',
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);