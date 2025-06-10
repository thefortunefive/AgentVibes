import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'fs-extra'
import path from 'path'
import { generateCharacterConfig, generateTeamIdentity, interpolatePersonality } from '../src/themes/character-manager.js'

describe('Generators', () => {
  test('should generate character configuration', () => {
    const agent = {
      id: 'neo',
      name: 'Neo',
      emoji: '🕶️',
      description: 'The One',
      personality: {
        traits: ['questioning', 'determined'],
        catchphrases: ['Whoa', 'There is no spoon'],
        communication_style: 'philosophical'
      },
      ports: {
        backend: 3011,
        frontend: 5175,
        nginx: 3080
      },
      host: 'neo.test'
    }
    
    const theme = {
      name: 'Matrix',
      emoji: '🕶️',
      docker: { network: 'matrix-network' }
    }
    
    const config = generateCharacterConfig(agent, theme, 1)
    
    assert.strictEqual(config.id, 'neo')
    assert.strictEqual(config.name, 'Neo')
    assert.strictEqual(config.teamNumber, 1)
    assert.strictEqual(config.theme, 'Matrix')
    assert.strictEqual(config.docker.network, 'matrix-network')
    assert(config.paths.root.includes('agents/neo'))
  })
  
  test('should generate team identity', () => {
    const agent = {
      name: 'Neo',
      emoji: '🕶️',
      personality: {
        catchphrases: ['Whoa', 'There is no spoon']
      }
    }
    
    const theme = { name: 'Matrix' }
    const teamNumber = 1
    
    const identity = generateTeamIdentity(agent, theme, teamNumber)
    
    assert(identity.greeting.includes('🕶️ Neo'))
    assert(identity.greeting.includes('Whoa'))
    assert.strictEqual(identity.commitPrefix, '🕶️ Neo:')
    assert.strictEqual(identity.issuePrefix, '🕶️ Team-1:')
    assert.strictEqual(identity.prPrefix, '🕶️ Team-1:')
  })
  
  test('should interpolate personality variables', () => {
    const template = 'Hello {{agentName}}, you are {{agentEmoji}} from {{theme}}'
    
    const character = {
      name: 'Neo',
      emoji: '🕶️',
      theme: 'Matrix',
      teamNumber: 1,
      description: 'The One',
      personality: {
        traits: ['questioning', 'determined'],
        catchphrases: ['Whoa', 'There is no spoon'],
        communication_style: 'philosophical'
      },
      ports: {
        backend: 3011,
        frontend: 5175,
        nginx: 3080
      },
      host: 'neo.test',
      docker: {
        containerName: 'matrix-neo',
        network: 'matrix-network'
      }
    }
    
    const result = interpolatePersonality(template, character)
    
    assert.strictEqual(result, 'Hello Neo, you are 🕶️ from Matrix')
  })
  
  test('should interpolate all personality variables', () => {
    const template = `Agent: {{agentName}} {{agentEmoji}}
Team: {{teamNumber}}
Traits: {{personality.traits}}
Catchphrases: {{personality.catchphrases}}
Style: {{personality.communication_style}}
Backend: {{ports.backend}}
Host: {{hostName}}`
    
    const character = {
      name: 'Neo',
      emoji: '🕶️',
      teamNumber: 1,
      personality: {
        traits: ['questioning', 'determined'],
        catchphrases: ['Whoa', 'There is no spoon'],
        communication_style: 'philosophical'
      },
      ports: {
        backend: 3011,
        frontend: 5175,
        nginx: 3080
      },
      host: 'neo.test',
      docker: {
        containerName: 'matrix-neo',
        network: 'matrix-network'
      }
    }
    
    const result = interpolatePersonality(template, character)
    
    assert(result.includes('Agent: Neo 🕶️'))
    assert(result.includes('Team: 1'))
    assert(result.includes('Traits: questioning, determined'))
    assert(result.includes('Catchphrases: "Whoa", "There is no spoon"'))
    assert(result.includes('Style: philosophical'))
    assert(result.includes('Backend: 3011'))
    assert(result.includes('Host: neo.test'))
  })
})