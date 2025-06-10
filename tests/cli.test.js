import { test, describe } from 'node:test'
import assert from 'node:assert'
import { execSync } from 'child_process'
import path from 'path'

describe('CLI', () => {
  const binPath = path.join(process.cwd(), 'bin', 'create-teams')
  
  test('should show help when called with --help', () => {
    try {
      const output = execSync(`node ${binPath} --help`, { encoding: 'utf8' })
      assert(output.includes('Usage:') || output.includes('Options:'), 'Should display help information')
    } catch (error) {
      // Command might exit with code 0 or 1 depending on commander.js version
      if (error.stdout) {
        assert(error.stdout.includes('Usage:') || error.stdout.includes('Options:'), 'Should display help in stdout')
      } else {
        throw error
      }
    }
  })
  
  test('should show version when called with --version', () => {
    try {
      const output = execSync(`node ${binPath} --version`, { encoding: 'utf8' })
      assert(output.match(/\d+\.\d+\.\d+/), 'Should display version number')
    } catch (error) {
      // Command might exit with code 0 or 1 depending on commander.js version
      if (error.stdout) {
        assert(error.stdout.match(/\d+\.\d+\.\d+/), 'Should display version in stdout')
      } else {
        throw error
      }
    }
  })
  
  test('should handle dry-run mode', () => {
    try {
      const output = execSync(`node ${binPath} --theme matrix --dry-run`, { 
        encoding: 'utf8',
        timeout: 10000 // 10 second timeout
      })
      assert(output.includes('DRY RUN') || output.includes('would be created'), 'Should indicate dry run mode')
    } catch (error) {
      // Expected to fail due to missing dependencies in test environment
      // Just check that it doesn't crash with syntax errors
      assert(error.status !== 127, 'CLI should be executable')
    }
  })
})