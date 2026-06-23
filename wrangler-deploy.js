// This script parse the .env file and turn the KEY=VALUE pairs into a string of
// --var KEY:VALUE --var KEY:VALUE ...
// and call wrangler deploy using it as argument to pass them into the production env

import { execSync } from 'child_process'
import fs from 'node:fs'

// Parse the .env file into standard wrangler strings
const envText = fs.readFileSync('.env', 'utf-8')
const vars = envText
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'))
  .map(line => `--var ${line.replace("=", ":")}`)
  .join(' ')

// Execute wrangler deploy with the variables explicitly appended
const deployCommand = `npx wrangler deploy ${vars}`
console.log("The command will for deployment will be:")
console.log(deployCommand)
console.log("Deploying ...")
execSync(`npx wrangler deploy ${vars}`, { stdio: 'inherit' })
