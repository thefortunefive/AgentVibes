import { test, describe } from 'node:test'
import assert from 'node:assert'
import { loadThemes, loadThemeByName } from '../src/themes/theme-loader.js'
import { validateTheme } from '../src/themes/theme-validator.js'

describe('Theme System', () => {
  test('should load all available themes', async () => {
    const themes = await loadThemes()
    
    assert(Array.isArray(themes), 'loadThemes should return an array')
    assert(themes.length > 0, 'should load at least one theme')
    
    // Check that we have the expected default themes
    const themeNames = themes.map(t => t.name)
    assert(themeNames.includes('Matrix'), 'should include Matrix theme')
    assert(themeNames.includes('Simpsons'), 'should include Simpsons theme')
    assert(themeNames.includes('Marvel'), 'should include Marvel theme')
  })
  
  test('should load a specific theme by name', async () => {
    const theme = await loadThemeByName('Matrix')
    
    assert.strictEqual(theme.name, 'Matrix')
    assert.strictEqual(theme.emoji, '🕶️')
    assert(Array.isArray(theme.agents), 'theme should have agents array')
    assert(theme.agents.length > 0, 'Matrix theme should have agents')
  })
  
  test('should throw error for non-existent theme', async () => {
    await assert.rejects(
      async () => await loadThemeByName('NonExistentTheme'),
      /Theme "NonExistentTheme" not found/
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
  })
  
  test('should reject invalid theme', () => {
    const invalidTheme = {
      name: 'Invalid Theme',
      // Missing required fields
    }
    
    assert.throws(
      () => validateTheme(invalidTheme),
      /Theme validation failed/
    )
  })
})