/**
 * AgentVibes - Team Builder
 * Builds and generates team configurations
 * Copyright 2024 Paul Preibisch
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { generateTeams } from '../generators/team-generator.js'
import { logger } from '../utils/logger.js'

export class TeamBuilder {
  constructor() {
    this.teams = []
    this.config = {}
  }

  /**
   * Build team configuration from workflow state
   */
  buildFromWorkflow(workflowState) {
    const teams = []
    
    for (const team of workflowState.teams) {
      for (const member of team.members) {
        teams.push({
          ...member.character,
          teamNumber: team.number,
          role: member.role.id,
          roleName: member.role.name,
          roleIcon: member.role.icon,
          colorScheme: member.colorScheme,
          theme: member.character.theme,
          themeEmoji: member.character.themeEmoji || member.character.emoji
        })
      }
    }
    
    this.teams = teams
    this.config = {
      repository: workflowState.repository,
      projectConfig: workflowState.projectConfig,
      outputDir: workflowState.outputDir || process.cwd()
    }
    
    return this
  }

  /**
   * Set output directory
   */
  setOutputDir(dir) {
    this.config.outputDir = dir
    return this
  }

  /**
   * Set repository configuration
   */
  setRepository(repoConfig) {
    this.config.repository = repoConfig
    return this
  }

  /**
   * Add a team member
   */
  addTeamMember(member) {
    this.teams.push(member)
    return this
  }

  /**
   * Generate teams
   */
  async generate(config = {}, progressCallback) {
    const finalConfig = {
      ...this.config,
      ...config,
      teams: config.teams || this.teams
    }
    
    if (!finalConfig.teams || finalConfig.teams.length === 0) {
      throw new Error('No teams configured for generation')
    }
    
    // Enhance team configurations with proper structure
    finalConfig.teams = this.enhanceTeamConfigs(finalConfig.teams)
    
    logger.info(`Generating ${finalConfig.teams.length} team members`)
    
    return await generateTeams(finalConfig, progressCallback)
  }

  /**
   * Enhance team configurations
   */
  enhanceTeamConfigs(teams) {
    return teams.map((team, index) => {
      const basePort = 3000 + (index * 10)
      
      return {
        ...team,
        id: `${team.theme.toLowerCase().replace(/\s+/g, '-')}-team${team.teamNumber}-${team.role?.id || team.role || 'dev'}`,
        name: team.name || team.character,
        host: 'localhost',
        ports: team.ports || {
          backend: basePort,
          frontend: basePort + 5000,
          nginx: basePort + 80
        },
        dockerNetwork: team.dockerNetwork || `${team.theme.toLowerCase().replace(/\s+/g, '-')}-network`
      }
    })
  }

  /**
   * Validate team configuration
   */
  validateTeams() {
    const errors = []
    
    if (this.teams.length === 0) {
      errors.push('No teams configured')
    }
    
    const usedPorts = new Set()
    const usedNames = new Set()
    
    for (const team of this.teams) {
      // Validate required fields
      if (!team.name && !team.character) {
        errors.push('Team member missing name')
      }
      
      if (!team.teamNumber) {
        errors.push('Team member missing team number')
      }
      
      if (!team.role) {
        errors.push('Team member missing role')
      }
      
      // Check for duplicate names
      const name = team.name || team.character
      if (usedNames.has(name)) {
        errors.push(`Duplicate team member name: ${name}`)
      }
      usedNames.add(name)
      
      // Check for port conflicts
      if (team.ports) {
        const ports = [team.ports.backend, team.ports.frontend, team.ports.nginx]
        for (const port of ports) {
          if (usedPorts.has(port)) {
            errors.push(`Port conflict: ${port}`)
          }
          usedPorts.add(port)
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Team validation failed:\n${errors.join('\n')}`)
    }
    
    return true
  }

  /**
   * Get team summary
   */
  getTeamSummary() {
    const summary = {
      totalMembers: this.teams.length,
      teamCount: new Set(this.teams.map(t => t.teamNumber)).size,
      roles: {},
      themes: {},
      portRange: this.getPortRange()
    }
    
    // Count roles
    for (const team of this.teams) {
      const role = team.role || 'unknown'
      summary.roles[role] = (summary.roles[role] || 0) + 1
    }
    
    // Count themes
    for (const team of this.teams) {
      const theme = team.theme || 'unknown'
      summary.themes[theme] = (summary.themes[theme] || 0) + 1
    }
    
    return summary
  }

  /**
   * Get port range used by teams
   */
  getPortRange() {
    if (this.teams.length === 0) return { min: null, max: null }
    
    const allPorts = []
    for (const team of this.teams) {
      if (team.ports) {
        allPorts.push(team.ports.backend, team.ports.frontend, team.ports.nginx)
      }
    }
    
    if (allPorts.length === 0) return { min: null, max: null }
    
    return {
      min: Math.min(...allPorts),
      max: Math.max(...allPorts)
    }
  }

  /**
   * Export team configuration
   */
  exportConfig() {
    return {
      teams: this.teams,
      config: this.config,
      summary: this.getTeamSummary()
    }
  }

  /**
   * Import team configuration
   */
  importConfig(config) {
    if (config.teams) {
      this.teams = config.teams
    }
    
    if (config.config) {
      this.config = config.config
    }
    
    return this
  }
}