import 'dotenv/config'
import { Sandbox } from 'e2b'

/**
 * Example: Running your Next.js E2B Sandbox
 * 
 * This example demonstrates how to:
 * 1. Create a sandbox from your custom Next.js template
 * 2. Access the running Next.js dev server
 * 3. Upload files to the sandbox
 * 4. Execute commands
 * 5. Clean up the sandbox
 */

async function main() {
  console.log('🚀 Creating sandbox from template: love-clone-test-4-dev')
  
  // Create a sandbox from your custom template
  // The template alias is 'love-clone-test-4-dev' (from build.dev.ts)
  const sandbox = await Sandbox.create({
    template: 'love-clone-test-4-dev', // Use your template alias
    // The sandbox will automatically start the Next.js dev server
    // because of the start command defined in template.ts
  })

  console.log(`✅ Sandbox created! ID: ${sandbox.id}`)
  console.log(`🌐 Sandbox URL: ${sandbox.getHostname()}`)

  try {
    // Wait a moment for the server to be ready
    console.log('⏳ Waiting for Next.js server to start...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Example 1: List files in the sandbox
    console.log('\n📁 Listing files in /home/user:')
    const files = await sandbox.filesystem.list('/home/user')
    console.log(files.map(f => `  - ${f.name} (${f.isDir ? 'dir' : 'file'})`).join('\n'))

    // Example 2: Read a file
    console.log('\n📄 Reading package.json:')
    const packageJson = await sandbox.filesystem.read('/home/user/package.json')
    const pkg = JSON.parse(packageJson)
    console.log(`  Name: ${pkg.name}`)
    console.log(`  Version: ${pkg.version}`)

    // Example 3: Upload a custom file
    console.log('\n📤 Uploading custom file...')
    await sandbox.filesystem.write(
      '/home/user/custom-page.tsx',
      `export default function CustomPage() {
  return <div>Hello from E2B Sandbox!</div>
}`
    )
    console.log('✅ File uploaded successfully')

    // Example 4: Execute a command
    console.log('\n⚡ Executing command: ls -la /home/user')
    const result = await sandbox.process.start({
      cmd: 'ls -la /home/user | head -10',
    })
    await result.wait()
    console.log('Output:', result.output.stdout)

    // Example 5: Check if Next.js server is running
    console.log('\n🔍 Checking if Next.js server is running...')
    const psResult = await sandbox.process.start({
      cmd: 'ps aux | grep -i next | grep -v grep',
    })
    await psResult.wait()
    if (psResult.output.stdout) {
      console.log('✅ Next.js server is running!')
      console.log('   You can access it at: http://localhost:3000')
    } else {
      console.log('⚠️  Next.js server might still be starting...')
    }

    // Example 6: Get sandbox metadata
    console.log('\n📊 Sandbox Info:')
    console.log(`  ID: ${sandbox.id}`)
    console.log(`  Template: ${sandbox.template}`)
    console.log(`  Started: ${sandbox.created}`)

    console.log('\n✨ Example completed successfully!')
    console.log('💡 The sandbox will stay alive for 5 minutes by default')
    console.log('💡 Use sandbox.close() to close it manually')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    // Optional: Keep sandbox alive for a bit longer to explore
    // Uncomment the line below to close immediately
    // await sandbox.close()
    console.log('\n💡 Sandbox is still running. Close it with: await sandbox.close()')
  }
}

main().catch(console.error)

