import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { generateTeams } from '../src/generators/team-generator.js'
import { loadThemeByName } from '../src/themes/theme-loader.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const testOutputDir = path.join(__dirname, 'test-output')
const binPath = path.join(__dirname, '..', 'bin', 'create-teams')

describe('Integration Tests', () => {
  // Clean up before and after tests
  test.beforeEach(async () => {
    await fs.remove(testOutputDir)
    await fs.ensureDir(testOutputDir)
  })
  
  test.afterEach(async () => {
    await fs.remove(testOutputDir)
  })
  
  test('should generate teams with dry-run mode', async () => {
    const theme = await loadThemeByName('Matrix')
    const config = {
      teams: theme.agents.map((agent, index) => ({
        ...agent,
        theme: theme.name,
        themeEmoji: theme.emoji,
        teamNumber: index + 1
      })),
      outputDir: testOutputDir,
      dryRun: true,
      repoUrl: 'https://github.com/octocat/Hello-World.git',
      authMethod: 'public'
    }
    
    let progressCalled = false
    await generateTeams(config, (progress) => {
      progressCalled = true
      assert(progress.type, 'Progress should have a type')
    })
    
    assert(progressCalled, 'Progress callback should be called')
    
    // In dry-run mode, no files should be created
    const files = await fs.readdir(testOutputDir)
    assert.strictEqual(files.length, 0, 'No files should be created in dry-run mode')
  })
  
  test('should generate folder structure for teams', async () => {
    const theme = await loadThemeByName('Anime')
    const config = {
      teams: theme.agents.slice(0, 2).map((agent, index) => ({
        ...agent,
        theme: theme.name,
        themeEmoji: theme.emoji,
        teamNumber: index + 1,
        dockerNetwork: 'anime-network'
      })),
      outputDir: testOutputDir,
      dryRun: false,
      skipCommands: true
    }
    
    await generateTeams(config, () => {})
    
    // Check folder structure
    assert(await fs.exists(path.join(testOutputDir, 'agents')), 'agents directory should exist')
    assert(await fs.exists(path.join(testOutputDir, 'agents/naruto')), 'naruto directory should exist')
    assert(await fs.exists(path.join(testOutputDir, 'agents/sasuke')), 'sasuke directory should exist')
    assert(await fs.exists(path.join(testOutputDir, 'docker')), 'docker directory should exist')
    assert(await fs.exists(path.join(testOutputDir, 'scripts')), 'scripts directory should exist')
    
    // Check generated files
    assert(await fs.exists(path.join(testOutputDir, 'agents/naruto/CLAUDE.md')), 'CLAUDE.md should exist')
    assert(await fs.exists(path.join(testOutputDir, 'agents/naruto/.mcp.json')), '.mcp.json should exist')
    assert(await fs.exists(path.join(testOutputDir, 'agents/naruto/launch')), 'launch script should exist')
    assert(await fs.exists(path.join(testOutputDir, 'agents/naruto/down')), 'down script should exist')
    assert(await fs.exists(path.join(testOutputDir, 'agents/naruto/build.sh')), 'build script should exist')
    
    // Check Docker files
    assert(await fs.exists(path.join(testOutputDir, 'docker/docker-compose.anime.yml')), 'docker-compose should exist')
    
    // Check management scripts
    assert(await fs.exists(path.join(testOutputDir, 'scripts/launch-all-teams.sh')), 'launch-all script should exist')
    assert(await fs.exists(path.join(testOutputDir, 'scripts/down-all-teams.sh')), 'down-all script should exist')
    assert(await fs.exists(path.join(testOutputDir, 'scripts/status-check.sh')), 'status-check script should exist')
  })
  
  test('should generate correct CLAUDE.md content', async () => {
    const theme = await loadThemeByName('Matrix')
    const config = {
      teams: [theme.agents[0]].map(agent => ({
        ...agent,
        theme: theme.name,
        themeEmoji: theme.emoji,
        teamNumber: 1,
        dockerNetwork: 'matrix-network'
      })),
      outputDir: testOutputDir,
      dryRun: false,
      skipCommands: true
    }
    
    await generateTeams(config, () => {})
    
    const claudeMd = await fs.readFile(path.join(testOutputDir, 'agents/neo/CLAUDE.md'), 'utf-8')
    
    // Check key content
    assert(claudeMd.includes('🕶️ Neo'), 'Should include agent name and emoji')
    assert(claudeMd.includes('Team 1 - Matrix'), 'Should include team number and theme')
    assert(claudeMd.includes('The One'), 'Should include agent description')
    assert(claudeMd.includes('philosophical'), 'Should include communication style')
    assert(claudeMd.includes('Whoa'), 'Should include catchphrases')
    assert(claudeMd.includes('questioning'), 'Should include personality traits')
    assert(claudeMd.includes('Backend Port**: 3011'), 'Should include backend port')
    assert(claudeMd.includes('Frontend Port**: 5175'), 'Should include frontend port')
  })
  
  test('should generate correct .mcp.json content', async () => {
    const theme = await loadThemeByName('Simpsons')
    const config = {
      teams: [theme.agents[0]].map(agent => ({
        ...agent,
        theme: theme.name,
        themeEmoji: theme.emoji,
        teamNumber: 1,
        dockerNetwork: 'springfield-network'
      })),
      outputDir: testOutputDir,
      dryRun: false,
      skipCommands: true
    }
    
    await generateTeams(config, () => {})
    
    const mcpJson = await fs.readJson(path.join(testOutputDir, 'agents/homer/.mcp.json'))
    
    // Check MCP configuration
    assert.strictEqual(mcpJson.name, 'Homer Agent')
    assert.strictEqual(mcpJson.emoji, '🍩')
    assert(mcpJson.description.includes('donut-powered'), 'Should include agent description')
    assert(Array.isArray(mcpJson.personality.traits), 'Should have personality traits')
    assert(mcpJson.personality.traits.includes('simple'), 'Should include correct traits')
    assert(Array.isArray(mcpJson.personality.catchphrases), 'Should have catchphrases')
    assert.strictEqual(mcpJson.network.backend, 'http://localhost:3021')
    assert.strictEqual(mcpJson.network.frontend, 'http://localhost:5185')
    assert.strictEqual(mcpJson.network.host, 'homer.test')
  })
  
  test('should generate executable scripts', async () => {
    const theme = await loadThemeByName('Marvel')
    const config = {
      teams: [theme.agents[0]].map(agent => ({
        ...agent,
        theme: theme.name,
        themeEmoji: theme.emoji,
        teamNumber: 1,
        dockerNetwork: 'marvel-network'
      })),
      outputDir: testOutputDir,
      dryRun: false,
      skipCommands: true
    }
    
    await generateTeams(config, () => {})
    
    // Check script permissions
    const launchScript = path.join(testOutputDir, 'agents/ironman/launch')
    const downScript = path.join(testOutputDir, 'agents/ironman/down')
    const buildScript = path.join(testOutputDir, 'agents/ironman/build.sh')
    
    const launchStats = await fs.stat(launchScript)
    const downStats = await fs.stat(downScript)
    const buildStats = await fs.stat(buildScript)
    
    // Check if executable (Unix permissions)
    assert(launchStats.mode & 0o100, 'launch script should be executable')
    assert(downStats.mode & 0o100, 'down script should be executable')
    assert(buildStats.mode & 0o100, 'build script should be executable')
    
    // Check script content
    const launchContent = await fs.readFile(launchScript, 'utf-8')
    assert(launchContent.includes('#!/bin/bash'), 'Should have bash shebang')
    assert(launchContent.includes('🦾 Iron Man'), 'Should include agent identity')
    assert(launchContent.includes('ports 3031'), 'Should include correct port')
  })
  
  test('should generate valid docker-compose files', async () => {
    const theme = await loadThemeByName('Guardians of the Galaxy')
    const config = {
      teams: theme.agents.slice(0, 3).map((agent, index) => ({
        ...agent,
        theme: theme.name,
        themeEmoji: theme.emoji,
        teamNumber: index + 1,
        dockerNetwork: 'galaxy-network'
      })),
      outputDir: testOutputDir,
      dryRun: false,
      skipCommands: true
    }
    
    await generateTeams(config, () => {})
    
    const dockerComposePath = path.join(testOutputDir, 'docker/docker-compose.guardians of the galaxy.yml')
    const dockerComposeContent = await fs.readFile(dockerComposePath, 'utf-8')
    
    // Check docker-compose structure
    assert(dockerComposeContent.includes('version:'), 'Should have version')
    assert(dockerComposeContent.includes('services:'), 'Should have services')
    assert(dockerComposeContent.includes('starlord:'), 'Should include starlord service')
    assert(dockerComposeContent.includes('gamora:'), 'Should include gamora service')
    assert(dockerComposeContent.includes('drax:'), 'Should include drax service')
    assert(dockerComposeContent.includes('galaxy-network:'), 'Should include network configuration')
    assert(dockerComposeContent.includes('container_name: guardians of the galaxy-starlord'), 'Should have container names')
    assert(dockerComposeContent.includes('3041:3041'), 'Should have port mappings')
  })
  
  test('should handle multiple themes', async () => {
    const matrixTheme = await loadThemeByName('Matrix')
    const animeTheme = await loadThemeByName('Anime')
    
    const config = {
      teams: [
        ...matrixTheme.agents.slice(0, 2).map((agent, index) => ({
          ...agent,
          theme: matrixTheme.name,
          themeEmoji: matrixTheme.emoji,
          teamNumber: index + 1,
          dockerNetwork: 'matrix-network'
        })),
        ...animeTheme.agents.slice(0, 2).map((agent, index) => ({
          ...agent,
          theme: animeTheme.name,
          themeEmoji: animeTheme.emoji,
          teamNumber: index + 3,
          dockerNetwork: 'anime-network'
        }))
      ],
      outputDir: testOutputDir,
      dryRun: false,
      skipCommands: true
    }
    
    await generateTeams(config, () => {})
    
    // Check that both themes were created
    assert(await fs.exists(path.join(testOutputDir, 'agents/neo')), 'Matrix: Neo should exist')
    assert(await fs.exists(path.join(testOutputDir, 'agents/trinity')), 'Matrix: Trinity should exist')
    assert(await fs.exists(path.join(testOutputDir, 'agents/naruto')), 'Anime: Naruto should exist')
    assert(await fs.exists(path.join(testOutputDir, 'agents/sasuke')), 'Anime: Sasuke should exist')
    
    // Check docker-compose files for both themes
    assert(await fs.exists(path.join(testOutputDir, 'docker/docker-compose.matrix.yml')), 'Matrix docker-compose should exist')
    assert(await fs.exists(path.join(testOutputDir, 'docker/docker-compose.anime.yml')), 'Anime docker-compose should exist')
  })
  
  test('should create git hooks for emoji commits', async () => {
    const theme = await loadThemeByName('Star Wars')
    const config = {
      teams: [theme.agents[0]].map(agent => ({
        ...agent,
        theme: theme.name,
        themeEmoji: theme.emoji,
        teamNumber: 1,
        dockerNetwork: 'starwars-network'
      })),
      outputDir: testOutputDir,
      dryRun: false,
      skipCommands: true
    }
    
    await generateTeams(config, () => {})
    
    const prepareCommitMsg = path.join(testOutputDir, 'agents/luke/.git/hooks/prepare-commit-msg')
    const commitMsg = path.join(testOutputDir, 'agents/luke/.git/hooks/commit-msg')
    
    assert(await fs.exists(prepareCommitMsg), 'prepare-commit-msg hook should exist')
    assert(await fs.exists(commitMsg), 'commit-msg hook should exist')
    
    const prepareContent = await fs.readFile(prepareCommitMsg, 'utf-8')
    assert(prepareContent.includes('⚔️ Luke Skywalker:'), 'Should include agent emoji and name')
    
    // Check hook permissions
    const prepareStats = await fs.stat(prepareCommitMsg)
    assert(prepareStats.mode & 0o100, 'prepare-commit-msg should be executable')
  })
  
  test('should validate all default themes', async () => {
    const themeNames = ['Matrix', 'Simpsons', 'Marvel', 'Guardians of the Galaxy', 'Star Wars', 'Anime']
    
    for (const themeName of themeNames) {
      const theme = await loadThemeByName(themeName)
      assert(theme.name, `${themeName} should have a name`)
      assert(theme.emoji, `${themeName} should have an emoji`)
      assert(theme.description, `${themeName} should have a description`)
      assert(Array.isArray(theme.agents), `${themeName} should have agents array`)
      assert(theme.agents.length > 0, `${themeName} should have at least one agent`)
      
      // Validate each agent
      for (const agent of theme.agents) {
        assert(agent.id, `Agent in ${themeName} should have an id`)
        assert(agent.name, `Agent in ${themeName} should have a name`)
        assert(agent.emoji, `Agent in ${themeName} should have an emoji`)
        assert(agent.personality?.traits?.length > 0, `Agent ${agent.name} should have traits`)
        assert(agent.personality?.catchphrases?.length > 0, `Agent ${agent.name} should have catchphrases`)
        assert(agent.ports?.backend, `Agent ${agent.name} should have backend port`)
        assert(agent.ports?.frontend, `Agent ${agent.name} should have frontend port`)
      }
    }
  })
})