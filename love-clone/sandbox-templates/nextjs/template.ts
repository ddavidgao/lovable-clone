import { Template } from 'e2b'

export const template = Template()
  .fromImage('node:20-slim')
  .setUser('root')
  .setWorkdir('/')
  .runCmd('apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*')
  .copy('compile_page.sh', '/usr/local/bin/compile_page.sh')
  .runCmd('chmod +x /usr/local/bin/compile_page.sh')
  .setWorkdir('/home/user/nextjs-app')
  .runCmd('npx --yes create-next-app@latest . --yes')
  // Skip shadcn for now - install it dynamically in sandbox when needed
  // This makes the template build much faster
  .runCmd('mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app')
  .setUser('user')
  .setWorkdir('/home/user')
  .setStartCmd('compile_page.sh', 'sleep 20')