/**
 * AgentVibes - Workflow Manager
 * Team-first approach for agent creation
 * Copyright 2024 Paul Preibisch
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { logger } from '../utils/logger.js'
import { RoleManager } from './role-manager.js'
import { TeamBuilder } from './team-builder.js'
import { ThemeManager } from './theme-manager.js'
import { InteractiveCLI } from '../cli/interactive-cli.js'

export class WorkflowManager {
  constructor(options = {}) {
    this.options = {
      maxTeams: 10,
      defaultRoles: ['dev', 'testing'],
      allowCustomRoles: true,
      ...options
    }
    
    this.roleManager = new RoleManager()
    this.teamBuilder = new TeamBuilder()
    this.themeManager = new ThemeManager()
    this.cli = new InteractiveCLI()
    
    this.state = {
      teams: [],
      selectedThemes: [],
      repository: null,
      projectConfig: null
    }
  }

  /**
   * Start the team-first workflow
   */
  async start() {
    try {
      // Step 1: Welcome and team count selection
      await this.cli.showWelcome()
      const teamCount = await this.selectTeamCount()
      
      // Step 2: Role selection/configuration
      const roles = await this.configureRoles()
      
      // Step 3: Character selection for each team member
      await this.selectCharacters(teamCount, roles)
      
      // Step 4: Color scheme selection
      await this.selectColorSchemes()
      
      // Step 5: Repository configuration
      await this.configureRepository()
      
      // Step 6: Review and confirm
      const confirmed = await this.reviewConfiguration()
      
      if (confirmed) {
        // Step 7: Generate teams
        await this.generateTeams()
      }
      
      return this.state
    } catch (error) {
      logger.error('Workflow failed:', error.message)
      throw error
    }
  }

  /**
   * Select number of teams to create
   */
  async selectTeamCount() {
    const teamCount = await this.cli.selectTeamCount({
      min: 1,
      max: this.options.maxTeams,
      default: 2
    })
    
    this.state.teamCount = teamCount
    return teamCount
  }

  /**
   * Configure roles for team members
   */
  async configureRoles() {
    const roleChoice = await this.cli.selectRoleConfiguration({
      defaultRoles: this.options.defaultRoles,
      allowCustom: this.options.allowCustomRoles
    })
    
    let roles
    if (roleChoice === 'default') {
      roles = this.roleManager.getDefaultRoles()
    } else if (roleChoice === 'custom') {
      roles = await this.roleManager.createCustomRoles()
    } else {
      // Extended roles
      roles = await this.roleManager.selectExtendedRoles()
    }
    
    this.state.roles = roles
    return roles
  }

  /**
   * Select characters for each team member
   */
  async selectCharacters(teamCount, roles) {
    const teams = []
    const usedCharacters = new Set()
    
    for (let teamNum = 1; teamNum <= teamCount; teamNum++) {
      const team = {
        number: teamNum,
        members: []
      }
      
      logger.info(`\nConfiguring Team ${teamNum}`)
      
      for (const role of roles) {
        const character = await this.cli.selectCharacter({
          role,
          teamNumber: teamNum,
          excludeCharacters: Array.from(usedCharacters),
          showSearch: true,
          showThemeGroups: true
        })
        
        usedCharacters.add(character.id)
        team.members.push({
          role,
          character
        })
      }
      
      teams.push(team)
    }
    
    this.state.teams = teams
    return teams
  }

  /**
   * Select color schemes for characters
   */
  async selectColorSchemes() {
    const colorManager = this.themeManager.getColorManager()
    
    for (const team of this.state.teams) {
      for (const member of team.members) {
        const colorScheme = await this.cli.selectColorScheme({
          character: member.character,
          availableColors: colorManager.getAvailableColors(),
          showPreview: true
        })
        
        member.colorScheme = colorScheme
      }
    }
  }

  /**
   * Configure repository settings
   */
  async configureRepository() {
    // Check GitHub CLI authentication first
    const isAuthenticated = await this.checkGitHubAuth()
    
    const repoConfig = await this.cli.configureRepository({
      supportGitHub: true,
      supportLocal: true,
      supportBrowsing: isAuthenticated
    })
    
    // Handle authentication if needed
    if (repoConfig.source === 'url' && repoConfig.url) {
      repoConfig.authMethod = await this.selectAuthMethod(repoConfig.url)
    }
    
    this.state.repository = repoConfig
    return repoConfig
  }
  
  /**
   * Check GitHub CLI authentication
   */
  async checkGitHubAuth() {
    try {
      const { execSync } = await import('child_process')
      execSync('gh auth status', { stdio: 'ignore' })
      return true
    } catch (error) {
      logger.info('GitHub CLI not authenticated. Some features may be limited.')
      return false
    }
  }
  
  /**
   * Select authentication method
   */
  async selectAuthMethod(repoUrl) {
    // Auto-detect SSH URLs
    if (repoUrl.startsWith('git@')) {
      return 'ssh'
    }
    
    const choices = [
      {
        name: '🔑 Use GitHub CLI authentication',
        value: 'gh',
        description: 'Recommended if already logged in'
      },
      {
        name: '🔐 SSH key authentication',
        value: 'ssh',
        description: 'Use your SSH keys'
      },
      {
        name: '🎫 Personal access token',
        value: 'token',
        description: 'Manual token input'
      },
      {
        name: '🌐 Public access',
        value: 'public',
        description: 'For public repositories only'
      }
    ]
    
    return await this.cli.select({
      message: 'Select authentication method',
      choices,
      theme: this.cli.theme
    })
  }

  /**
   * Review and confirm configuration
   */
  async reviewConfiguration() {
    const summary = this.buildConfigurationSummary()
    
    const confirmed = await this.cli.reviewConfiguration({
      summary,
      allowEdit: true,
      showVisualPreview: true
    })
    
    return confirmed
  }

  /**
   * Build configuration summary
   */
  buildConfigurationSummary() {
    const summary = {
      teamCount: this.state.teamCount,
      teams: this.state.teams.map(team => ({
        number: team.number,
        members: team.members.map(member => ({
          role: member.role,
          character: member.character.name,
          emoji: member.character.emoji,
          theme: member.character.theme,
          colorScheme: member.colorScheme.name
        }))
      })),
      repository: this.state.repository,
      estimatedPorts: this.calculatePortAllocation()
    }
    
    return summary
  }

  /**
   * Calculate port allocation for teams
   */
  calculatePortAllocation() {
    const basePort = 3000
    const portsPerAgent = 10
    const ports = []
    
    let currentPort = basePort
    for (const team of this.state.teams) {
      for (const member of team.members) {
        ports.push({
          team: team.number,
          role: member.role,
          character: member.character.name,
          backend: currentPort,
          frontend: currentPort + 5000
        })
        currentPort += portsPerAgent
      }
    }
    
    return ports
  }

  /**
   * Generate teams based on configuration
   */
  async generateTeams() {
    const config = this.buildGenerationConfig()
    
    await this.teamBuilder.generate(config, (progress) => {
      this.cli.updateProgress(progress)
    })
    
    // Save configuration for future use
    await this.saveConfiguration()
  }

  /**
   * Build generation configuration
   */
  buildGenerationConfig() {
    const config = {
      teams: [],
      repository: this.state.repository,
      projectConfig: this.state.projectConfig
    }
    
    let portOffset = 0
    for (const team of this.state.teams) {
      for (const member of team.members) {
        config.teams.push({
          ...member.character,
          teamNumber: team.number,
          role: member.role,
          colorScheme: member.colorScheme,
          ports: {
            backend: 3000 + portOffset * 10,
            frontend: 8000 + portOffset
          }
        })
        portOffset++
      }
    }
    
    return config
  }

  /**
   * Save configuration for future use
   */
  async saveConfiguration() {
    const configPath = '.agentvibes.json'
    await this.themeManager.saveConfiguration(configPath, this.state)
  }
}

// Export singleton instance
export const workflowManager = new WorkflowManager()