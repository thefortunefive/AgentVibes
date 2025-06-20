import { test, describe } from 'node:test'
import assert from 'node:assert'
import { loadThemes, loadThemeByName, loadCustomTheme } from '../src/themes/theme-loader.js'
import { validateTheme } from '../src/themes/theme-validator.js'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Theme System', () => {
  test('should load all available themes', async () => {
    const themes = await loadThemes()
    
    assert(Array.isArray(themes), 'loadThemes should return an array')
    assert(themes.length >= 6, 'should load at least 6 default themes')
    assert(themes.length <= 10, 'should not have more than 10 themes')
    
    // Check that we have the expected default themes
    const themeNames = themes.map(t => t.name)
    assert(themeNames.includes('Matrix'), 'should include Matrix theme')
    assert(themeNames.includes('Simpsons'), 'should include Simpsons theme')
    assert(themeNames.includes('Marvel'), 'should include Marvel theme')
    assert(themeNames.includes('Guardians of the Galaxy'), 'should include Guardians theme')
    assert(themeNames.includes('Star Wars'), 'should include Star Wars theme')
    assert(themeNames.includes('Anime'), 'should include Anime theme')
    
    // Verify themes are sorted alphabetically
    const sortedNames = [...themeNames].sort((a, b) => a.localeCompare(b))
    assert.deepStrictEqual(themeNames, sortedNames, 'themes should be sorted alphabetically')
    
    // Check each theme has required properties
    themes.forEach(theme => {
      assert(theme.name && typeof theme.name === 'string', `Theme should have a name: ${JSON.stringify(theme)}`)
      assert(theme.emoji && typeof theme.emoji === 'string', `Theme ${theme.name} should have an emoji`)
      assert(Array.isArray(theme.agents) && theme.agents.length > 0, `Theme ${theme.name} should have agents`)
      assert(theme.description && typeof theme.description === 'string', `Theme ${theme.name} should have a description`)
    })
  })
  
  test('should load a specific theme by name', async () => {
    const theme = await loadThemeByName('Matrix')
    
    assert.strictEqual(theme.name, 'Matrix')
    assert.strictEqual(theme.emoji, '🕶️')
    assert(Array.isArray(theme.agents), 'theme should have agents array')
    assert.strictEqual(theme.agents.length, 6, 'Matrix theme should have exactly 6 agents')
    
    // Verify specific agents exist
    const agentNames = theme.agents.map(a => a.name)
    assert(agentNames.includes('Neo'), 'Matrix should include Neo')
    assert(agentNames.includes('Trinity'), 'Matrix should include Trinity')
    assert(agentNames.includes('Morpheus'), 'Matrix should include Morpheus')
    assert(agentNames.includes('Agent Smith'), 'Matrix should include Agent Smith')
    
    // Test case insensitive loading
    const themeLowerCase = await loadThemeByName('matrix')
    assert.deepStrictEqual(themeLowerCase, theme, 'should load theme case-insensitively')
    
    // Test agent properties
    const neo = theme.agents.find(a => a.name === 'Neo')
    assert(neo, 'Neo should exist')
    assert.strictEqual(neo.emoji, '🕶️', 'Neo should have sunglasses emoji')
    assert(neo.personality.traits.includes('questioning'), 'Neo should have questioning trait')
    assert(neo.personality.catchphrases.length > 0, 'Neo should have catchphrases')
    assert(neo.ports.backend > 3000, 'Neo should have valid backend port')
    assert(neo.ports.frontend > 5000, 'Neo should have valid frontend port')
  })
  
  test('should throw error for non-existent theme', async () => {
    await assert.rejects(
      async () => await loadThemeByName('NonExistentTheme'),
      /Theme "NonExistentTheme" not found/
    )
    
    // Also test empty string
    await assert.rejects(
      async () => await loadThemeByName(''),
      /Theme "" not found/
    )
    
    // Test null/undefined
    await assert.rejects(
      async () => await loadThemeByName(null),
      /Theme "null" not found/
    )
  })
  
  test('should validate valid theme', () => {
    const validTheme = {
      name: 'Test Theme',
      description: 'A test theme',
      emoji: '🧪',
      agents: [
        {
          id: 'test-agent',
          name: 'Test Agent',
          emoji: '🤖',
          description: 'A test agent',
          personality: {
            traits: ['testing', 'reliable'],
            catchphrases: ['Testing!', 'All green!'],
            communication_style: 'technical and precise'
          },
          ports: {
            backend: 3011,
            frontend: 5175,
            nginx: 3080
          },
          host: 'test-agent.test'
        }
      ]
    }
    
    const result = validateTheme(validTheme)
    assert.strictEqual(result.name, 'Test Theme')
    assert.strictEqual(result.agents.length, 1)
    
    // Verify validation doesn't modify original
    assert.notStrictEqual(result, validTheme, 'validateTheme should return a new object')
  })
  
  test('should reject invalid theme - missing required fields', () => {
    // Missing description
    assert.throws(
      () => validateTheme({
        name: 'Invalid Theme',
        emoji: '❌'
      }),
      /Theme validation failed/
    )
    
    // Missing emoji
    assert.throws(
      () => validateTheme({
        name: 'Invalid Theme',
        description: 'Test'
      }),
      /Theme validation failed/
    )
    
    // Missing agents
    assert.throws(
      () => validateTheme({
        name: 'Invalid Theme',
        description: 'Test',
        emoji: '❌'
      }),
      /Theme validation failed/
    )
    
    // Empty agents array
    assert.throws(
      () => validateTheme({
        name: 'Invalid Theme',
        description: 'Test',
        emoji: '❌',
        agents: []
      }),
      /Theme validation failed/
    )
  })
  
  test('should reject invalid agent in theme', () => {
    // Agent missing personality
    assert.throws(
      () => validateTheme({
        name: 'Test Theme',
        description: 'Test',
        emoji: '🧪',
        agents: [{
          id: 'test',
          name: 'Test',
          emoji: '🤖',
          description: 'Test agent'
          // Missing personality, ports, host
        }]
      }),
      /Theme validation failed/
    )
    
    // Agent with invalid ports
    assert.throws(
      () => validateTheme({
        name: 'Test Theme',
        description: 'Test',
        emoji: '🧪',
        agents: [{
          id: 'test',
          name: 'Test',
          emoji: '🤖',
          description: 'Test agent',
          personality: {
            traits: ['test'],
            catchphrases: ['test'],
            communication_style: 'test'
          },
          ports: {
            backend: 'not-a-number', // Invalid port
            frontend: 5000,
            nginx: 3080
          },
          host: 'test.local'
        }]
      }),
      /Theme validation failed/
    )
  })
  
  test('should load custom theme from file', async () => {
    const customThemePath = path.join(__dirname, 'fixtures', 'custom-theme.json')
    
    // Create test fixture
    await fs.ensureDir(path.join(__dirname, 'fixtures'))
    await fs.writeJson(customThemePath, {
      name: 'Custom Theme',
      description: 'A custom theme for testing',
      emoji: '🎯',
      agents: [{
        id: 'custom-agent',
        name: 'Custom Agent',
        emoji: '🎯',
        description: 'Custom test agent',
        personality: {
          traits: ['custom', 'unique'],
          catchphrases: ['Custom phrase!'],
          communication_style: 'customized'
        },
        ports: {
          backend: 4000,
          frontend: 6000,
          nginx: 4080
        },
        host: 'custom.test'
      }]
    })
    
    try {
      const theme = await loadCustomTheme(customThemePath)
      assert.strictEqual(theme.name, 'Custom Theme')
      assert.strictEqual(theme.agents.length, 1)
      assert.strictEqual(theme.agents[0].name, 'Custom Agent')
    } finally {
      // Cleanup
      await fs.remove(path.join(__dirname, 'fixtures'))
    }
  })
  
  test('should fail to load invalid custom theme file', async () => {
    const invalidPath = path.join(__dirname, 'non-existent-theme.json')
    
    await assert.rejects(
      async () => await loadCustomTheme(invalidPath),
      /Failed to load custom theme/
    )
  })
})