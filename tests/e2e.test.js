import { test, describe } from 'node:test'
import assert from 'node:assert'
import { execSync } from 'child_process'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const binPath = path.join(__dirname, '..', 'bin', 'create-teams')
const testOutputDir = path.join(__dirname, 'e2e-output')

describe('End-to-End CLI Tests', () => {
  test.beforeEach(async () => {
    await fs.remove(testOutputDir)
    await fs.ensureDir(testOutputDir)
  })
  
  test.afterEach(async () => {
    await fs.remove(testOutputDir)
  })
  
  test('should show help information', () => {
    const output = execSync(`node ${binPath} --help`, { encoding: 'utf8' })
    
    assert(output.includes('create-teams'), 'Should show command name')
    assert(output.includes('--themes'), 'Should show themes option')
    assert(output.includes('--repo'), 'Should show repo option')
    assert(output.includes('--output'), 'Should show output option')
    assert(output.includes('--project-board'), 'Should show project-board option')
    assert(output.includes('--dry-run'), 'Should show dry-run option')
  })
  
  test('should show version', () => {
    const output = execSync(`node ${binPath} --version`, { encoding: 'utf8' })
    assert(output.match(/\d+\.\d+\.\d+/), 'Should show version number')
  })
  
  test('should run dry-run with single theme', () => {
    const output = execSync(`node ${binPath} --theme matrix --dry-run`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    assert(output.includes('DRY RUN'), 'Should indicate dry run mode')
    assert(output.includes('🕶️ Neo'), 'Should show Neo agent')
    assert(output.includes('⚡ Trinity'), 'Should show Trinity agent')
    assert(output.includes('💊 Morpheus'), 'Should show Morpheus agent')
    assert(output.includes('agents/neo/'), 'Should show directory structure')
    assert(output.includes('CLAUDE.md'), 'Should mention CLAUDE.md')
    assert(output.includes('.mcp.json'), 'Should mention .mcp.json')
  })
  
  test('should run dry-run with multiple themes', () => {
    const output = execSync(`node ${binPath} --themes matrix,anime --dry-run`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    assert(output.includes('DRY RUN'), 'Should indicate dry run mode')
    assert(output.includes('🕶️ Neo'), 'Should show Matrix agents')
    assert(output.includes('🍥 Naruto'), 'Should show Anime agents')
  })
  
  test('should generate teams with minimal options', () => {
    execSync(`node ${binPath} --theme anime --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    // Verify basic structure was created
    assert(fs.existsSync(path.join(testOutputDir, 'agents')), 'agents directory should exist')
    assert(fs.existsSync(path.join(testOutputDir, 'agents/naruto')), 'naruto directory should exist')
    assert(fs.existsSync(path.join(testOutputDir, 'agents/naruto/CLAUDE.md')), 'CLAUDE.md should exist')
    assert(fs.existsSync(path.join(testOutputDir, 'agents/naruto/.mcp.json')), '.mcp.json should exist')
    assert(fs.existsSync(path.join(testOutputDir, 'scripts')), 'scripts directory should exist')
    assert(fs.existsSync(path.join(testOutputDir, 'docker')), 'docker directory should exist')
  })
  
  test('should handle custom port ranges', () => {
    execSync(`node ${binPath} --theme anime --port-start 5000 --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    const mcpJson = fs.readJsonSync(path.join(testOutputDir, 'agents/naruto/.mcp.json'))
    assert.strictEqual(mcpJson.network.backend, 'http://localhost:5000', 'Should use custom port start')
    
    const claudeMd = fs.readFileSync(path.join(testOutputDir, 'agents/naruto/CLAUDE.md'), 'utf8')
    assert(claudeMd.includes('Backend Port**: 5000'), 'CLAUDE.md should reflect custom port')
  })
  
  test('should handle custom docker network', () => {
    execSync(`node ${binPath} --theme matrix --docker-network custom-net --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    const dockerCompose = fs.readFileSync(
      path.join(testOutputDir, 'docker/docker-compose.matrix.yml'), 
      'utf8'
    )
    assert(dockerCompose.includes('custom-net'), 'Should use custom docker network')
  })
  
  test('should create proper file permissions', () => {
    execSync(`node ${binPath} --theme anime --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    // Check script permissions (Unix only)
    if (process.platform !== 'win32') {
      const scripts = [
        'agents/naruto/launch',
        'agents/naruto/down',
        'agents/naruto/build.sh',
        'scripts/launch-all-teams.sh',
        'scripts/down-all-teams.sh',
        'scripts/status-check.sh'
      ]
      
      for (const script of scripts) {
        const scriptPath = path.join(testOutputDir, script)
        const stats = fs.statSync(scriptPath)
        assert(stats.mode & 0o100, `${script} should be executable`)
      }
    }
  })
  
  test('should generate valid JSON files', () => {
    execSync(`node ${binPath} --theme simpsons --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    // Test that all .mcp.json files are valid JSON
    const agents = fs.readdirSync(path.join(testOutputDir, 'agents'))
    
    for (const agent of agents) {
      const mcpPath = path.join(testOutputDir, 'agents', agent, '.mcp.json')
      assert.doesNotThrow(() => {
        const mcpContent = fs.readJsonSync(mcpPath)
        assert(mcpContent.name, '.mcp.json should have name field')
        assert(mcpContent.emoji, '.mcp.json should have emoji field')
        assert(mcpContent.personality, '.mcp.json should have personality field')
      }, `${agent}/.mcp.json should be valid JSON`)
    }
  })
  
  test('should handle verbose mode', () => {
    const output = execSync(`node ${binPath} --theme matrix --dry-run --verbose`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    assert(output.includes('Generating'), 'Verbose mode should show more details')
  })
  
  test('should error gracefully with invalid theme', () => {
    assert.throws(() => {
      execSync(`node ${binPath} --theme nonexistent --dry-run`, { 
        encoding: 'utf8',
        timeout: 30000
      })
    }, 'Should throw error for non-existent theme')
  })
  
  test('should validate generated Docker files', () => {
    execSync(`node ${binPath} --theme "Guardians of the Galaxy" --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    const dockerComposePath = path.join(testOutputDir, 'docker/docker-compose.guardians of the galaxy.yml')
    const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8')
    
    // Basic docker-compose validation
    assert(dockerComposeContent.includes('version:'), 'Should have version field')
    assert(dockerComposeContent.includes('services:'), 'Should have services section')
    assert(dockerComposeContent.includes('networks:'), 'Should have networks section')
    assert(dockerComposeContent.includes('volumes:'), 'Should have volumes section')
    
    // Check service definitions
    const services = ['starlord', 'gamora', 'drax', 'rocket', 'groot']
    for (const service of services) {
      assert(dockerComposeContent.includes(`${service}:`), `Should define ${service} service`)
    }
  })
  
  test('should generate complete team documentation', () => {
    execSync(`node ${binPath} --theme marvel --output ${testOutputDir}`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    
    // Check each agent has complete documentation
    const agents = ['ironman', 'spiderman', 'thor', 'hulk']
    
    for (const agent of agents) {
      const claudePath = path.join(testOutputDir, 'agents', agent, 'CLAUDE.md')
      const claudeContent = fs.readFileSync(claudePath, 'utf8')
      
      // Verify key sections exist
      assert(claudeContent.includes('Agent Identity'), 'Should have Agent Identity section')
      assert(claudeContent.includes('Personality Traits'), 'Should have Personality Traits section')
      assert(claudeContent.includes('Catchphrases'), 'Should have Catchphrases section')
      assert(claudeContent.includes('Development Environment'), 'Should have Development Environment section')
      assert(claudeContent.includes('Git Commit Protocol'), 'Should have Git Commit Protocol section')
      assert(claudeContent.includes('Quick Start Commands'), 'Should have Quick Start Commands section')
    }
  })
})