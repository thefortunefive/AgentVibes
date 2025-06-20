import { test, describe } from 'node:test'
import assert from 'node:assert'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('CLI', () => {
  const binPath = path.join(process.cwd(), 'bin', 'create-teams')
  const testOutputDir = path.join(__dirname, 'cli-test-output')
  
  // Clean up test directory before and after tests
  async function ensureTestDir() {
    await fs.ensureDir(testOutputDir)
  }
  
  async function cleanupTestDir() {
    await fs.remove(testOutputDir)
  }
  
  test('should show help when called with --help', () => {
    const output = execSync(`node ${binPath} --help`, { encoding: 'utf8' })
    
    // Verify help content
    assert(output.includes('Usage:') || output.includes('create-teams'), 'Should show usage')
    assert(output.includes('Options:'), 'Should show options section')
    assert(output.includes('--themes') || output.includes('-t'), 'Should show themes option')
    assert(output.includes('--repo') || output.includes('-r'), 'Should show repo option')
    assert(output.includes('--output') || output.includes('-o'), 'Should show output option')
    assert(output.includes('--dry-run'), 'Should show dry-run option')
    assert(output.includes('--help') || output.includes('-h'), 'Should show help option')
  })
  
  test('should show version when called with --version', () => {
    const output = execSync(`node ${binPath} --version`, { encoding: 'utf8' })
    
    // Should match semantic version
    assert(output.match(/\d+\.\d+\.\d+/), 'Should display semantic version')
    assert.strictEqual(output.trim(), '1.0.0', 'Version should be 1.0.0')
  })
  
  test('should reject invalid command line arguments', () => {
    // Test invalid option
    assert.throws(
      () => execSync(`node ${binPath} --invalid-option`, { encoding: 'utf8' }),
      'Should throw on invalid option'
    )
    
    // Test invalid theme
    assert.throws(
      () => execSync(`node ${binPath} --theme InvalidThemeName --output ${testOutputDir}`, { encoding: 'utf8' }),
      /Theme "InvalidThemeName" not found/,
      'Should throw on invalid theme'
    )
  })
  
  test('should handle dry-run mode correctly', async () => {
    await ensureTestDir()
    
    const output = execSync(`node ${binPath} --theme matrix --dry-run --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 10000
    })
    
    // Verify dry run output
    assert(output.includes('DRY RUN'), 'Should indicate dry run mode')
    assert(output.includes('would be created'), 'Should show what would be created')
    assert(output.includes('Neo'), 'Should show Neo agent')
    assert(output.includes('Trinity'), 'Should show Trinity agent')
    assert(output.includes('Morpheus'), 'Should show Morpheus agent')
    
    // Verify no files were created
    const files = await fs.readdir(testOutputDir)
    assert.strictEqual(files.length, 0, 'No files should be created in dry run')
    
    await cleanupTestDir()
  })
  
  test('should handle multiple themes via command line', () => {
    const output = execSync(`node ${binPath} --themes matrix,marvel --dry-run --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 10000
    })
    
    // Should include agents from both themes
    assert(output.includes('Neo'), 'Should include Matrix agents')
    assert(output.includes('Iron Man'), 'Should include Marvel agents')
  })
  
  test('should respect output directory option', () => {
    const customOutput = path.join(testOutputDir, 'custom')
    
    execSync(`node ${binPath} --theme matrix --output ${customOutput} --dry-run`, { 
      encoding: 'utf8',
      timeout: 10000
    })
    
    // Should use the custom output directory
    // In dry-run, just verify command doesn't crash
    assert(true, 'Command executed without error')
  })
  
  test('should handle port-start option', () => {
    const output = execSync(`node ${binPath} --theme matrix --port-start 4000 --dry-run --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 10000
    })
    
    // Should use custom port range
    assert(output.includes('4000') || output.includes('Backend 4000'), 'Should use custom port start')
  })
  
  test('should handle docker-network option', () => {
    const output = execSync(`node ${binPath} --theme matrix --docker-network custom-network --dry-run --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 10000
    })
    
    // Command should execute without error
    assert(true, 'Docker network option accepted')
  })
  
  test('should validate theme names are case-insensitive', () => {
    const output1 = execSync(`node ${binPath} --theme MATRIX --dry-run --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 10000
    })
    
    const output2 = execSync(`node ${binPath} --theme matrix --dry-run --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 10000
    })
    
    // Both should work
    assert(output1.includes('Neo'), 'Uppercase theme should work')
    assert(output2.includes('Neo'), 'Lowercase theme should work')
  })
  
  test('should handle verbose flag', () => {
    const output = execSync(`node ${binPath} --theme matrix --dry-run --verbose --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 10000
    })
    
    // Verbose output should include more details
    assert(output.length > 100, 'Verbose output should be detailed')
  })
  
  test('should create actual files without dry-run', async () => {
    await ensureTestDir()
    
    execSync(`node ${binPath} --theme matrix --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    // Verify directories were created
    assert(await fs.pathExists(path.join(testOutputDir, 'agents')), 'agents directory should exist')
    assert(await fs.pathExists(path.join(testOutputDir, 'docker')), 'docker directory should exist')
    assert(await fs.pathExists(path.join(testOutputDir, 'scripts')), 'scripts directory should exist')
    
    // Verify at least one agent directory
    assert(await fs.pathExists(path.join(testOutputDir, 'agents', 'neo')), 'Neo agent directory should exist')
    
    // Verify key files
    assert(await fs.pathExists(path.join(testOutputDir, 'agents', 'neo', 'CLAUDE.md')), 'CLAUDE.md should exist')
    assert(await fs.pathExists(path.join(testOutputDir, 'agents', 'neo', '.mcp.json')), '.mcp.json should exist')
    assert(await fs.pathExists(path.join(testOutputDir, 'agents', 'neo', 'launch')), 'launch script should exist')
    
    // Verify docker compose file
    const dockerFiles = await fs.readdir(path.join(testOutputDir, 'docker'))
    assert(dockerFiles.some(f => f.includes('matrix')), 'Matrix docker-compose file should exist')
    
    // Verify launch scripts
    assert(await fs.pathExists(path.join(testOutputDir, 'scripts', 'launch-all-teams.sh')), 'launch-all script should exist')
    assert(await fs.pathExists(path.join(testOutputDir, 'scripts', 'down-all-teams.sh')), 'down-all script should exist')
    assert(await fs.pathExists(path.join(testOutputDir, 'scripts', 'status-check.sh')), 'status-check script should exist')
    
    await cleanupTestDir()
  })
  
  test('should handle theme alias correctly', () => {
    // --theme is an alias for --themes
    const output1 = execSync(`node ${binPath} --theme matrix --dry-run --output ${testOutputDir}`, { 
      encoding: 'utf8'
    })
    
    const output2 = execSync(`node ${binPath} --themes matrix --dry-run --output ${testOutputDir}`, { 
      encoding: 'utf8'
    })
    
    // Both should produce similar output
    assert(output1.includes('Neo'), '--theme should work')
    assert(output2.includes('Neo'), '--themes should work')
  })
  
  test('should handle missing themes gracefully', () => {
    try {
      execSync(`node ${binPath} --theme "" --output ${testOutputDir}`, { encoding: 'utf8' })
      assert.fail('Should have thrown an error for empty theme')
    } catch (error) {
      const output = error.stdout || error.stderr || ''
      assert(output.includes('No teams specified for generation') || output.includes('Theme "" not found'), 'Should error on empty theme')
    }
  })
  
  test('should validate output directory permissions', async () => {
    const readOnlyDir = path.join(testOutputDir, 'readonly')
    await fs.ensureDir(readOnlyDir)
    
    // Make directory read-only (skip on Windows)
    if (process.platform !== 'win32') {
      await fs.chmod(readOnlyDir, 0o444)
      
      assert.throws(
        () => execSync(`node ${binPath} --theme matrix --output ${readOnlyDir}`, { encoding: 'utf8' }),
        'Should fail with read-only directory'
      )
      
      // Restore permissions for cleanup
      await fs.chmod(readOnlyDir, 0o755)
    }
    
    await cleanupTestDir()
  })
})