/**
 * AgentVibes - Role Manager
 * Manages team roles and custom role creation
 * Copyright 2024 Paul Preibisch
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { logger } from '../utils/logger.js'

export class RoleManager {
  constructor() {
    this.defaultRoles = [
      { id: 'dev', name: 'Developer', icon: '💻', description: 'Primary development role' },
      { id: 'testing', name: 'Tester', icon: '🧪', description: 'Quality assurance and testing' }
    ]
    
    this.extendedRoles = [
      { id: 'dev', name: 'Developer', icon: '💻', description: 'Primary development role' },
      { id: 'testing', name: 'Tester', icon: '🧪', description: 'Quality assurance and testing' },
      { id: 'devops', name: 'DevOps', icon: '🔧', description: 'Infrastructure and deployment' },
      { id: 'designer', name: 'Designer', icon: '🎨', description: 'UI/UX design and frontend' },
      { id: 'architect', name: 'Architect', icon: '🏗️', description: 'System design and planning' },
      { id: 'security', name: 'Security', icon: '🔒', description: 'Security analysis and hardening' },
      { id: 'data', name: 'Data Engineer', icon: '📊', description: 'Data processing and analytics' },
      { id: 'ml', name: 'ML Engineer', icon: '🤖', description: 'Machine learning and AI' }
    ]
    
    this.customRoles = []
  }

  /**
   * Get default roles
   */
  getDefaultRoles() {
    return [...this.defaultRoles]
  }

  /**
   * Get extended roles
   */
  getExtendedRoles() {
    return [...this.extendedRoles]
  }

  /**
   * Get all available roles
   */
  getAllRoles() {
    return [...this.extendedRoles, ...this.customRoles]
  }

  /**
   * Create custom roles interactively
   */
  async createCustomRoles() {
    const { InteractiveCLI } = await import('../cli/interactive-cli.js')
    const cli = new InteractiveCLI()
    
    const roles = []
    let addMore = true
    
    while (addMore) {
      const role = await cli.createCustomRole({
        existingRoles: [...this.getAllRoles(), ...roles]
      })
      
      if (role) {
        roles.push(role)
        this.customRoles.push(role)
      }
      
      addMore = await cli.confirm({
        message: 'Add another custom role?',
        default: false
      })
    }
    
    return roles.length > 0 ? roles : this.getDefaultRoles()
  }

  /**
   * Select from extended roles
   */
  async selectExtendedRoles() {
    const { InteractiveCLI } = await import('../cli/interactive-cli.js')
    const cli = new InteractiveCLI()
    
    const selected = await cli.selectMultiple({
      message: 'Select team roles',
      choices: this.extendedRoles.map(role => ({
        name: `${role.icon} ${role.name} - ${role.description}`,
        value: role
      })),
      min: 1,
      max: 5
    })
    
    return selected
  }

  /**
   * Validate role configuration
   */
  validateRoles(roles) {
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new Error('At least one role is required')
    }
    
    const roleIds = new Set()
    for (const role of roles) {
      if (!role.id || !role.name) {
        throw new Error('Invalid role format')
      }
      
      if (roleIds.has(role.id)) {
        throw new Error(`Duplicate role ID: ${role.id}`)
      }
      
      roleIds.add(role.id)
    }
    
    return true
  }

  /**
   * Generate role-specific directories
   */
  getRoleDirectories(teamNumber, role) {
    return {
      root: `teams/team-${teamNumber}/${role.id}`,
      src: `teams/team-${teamNumber}/${role.id}/src`,
      config: `teams/team-${teamNumber}/${role.id}/.config`,
      docker: `teams/team-${teamNumber}/${role.id}/docker`
    }
  }

  /**
   * Get role-specific port offset
   */
  getRolePortOffset(roleIndex) {
    return roleIndex * 10
  }

  /**
   * Generate role-specific configuration
   */
  getRoleConfig(role, teamNumber, characterConfig) {
    return {
      role: role.id,
      roleName: role.name,
      roleIcon: role.icon,
      teamNumber,
      directories: this.getRoleDirectories(teamNumber, role),
      capabilities: this.getRoleCapabilities(role),
      ...characterConfig
    }
  }

  /**
   * Get role-specific capabilities
   */
  getRoleCapabilities(role) {
    const capabilities = {
      dev: ['write-code', 'create-features', 'fix-bugs', 'refactor'],
      testing: ['write-tests', 'run-tests', 'report-bugs', 'validate-features'],
      devops: ['deploy', 'configure-ci', 'manage-infrastructure', 'monitor'],
      designer: ['create-designs', 'implement-ui', 'optimize-ux', 'create-assets'],
      architect: ['design-systems', 'create-diagrams', 'review-architecture', 'plan-features'],
      security: ['audit-code', 'pen-test', 'fix-vulnerabilities', 'create-policies'],
      data: ['process-data', 'create-pipelines', 'analyze-metrics', 'optimize-queries'],
      ml: ['train-models', 'create-datasets', 'deploy-models', 'analyze-results']
    }
    
    return capabilities[role.id] || ['general-development']
  }

  /**
   * Save custom roles to configuration
   */
  async saveCustomRoles(configPath) {
    const fs = (await import('fs-extra')).default
    const config = {
      customRoles: this.customRoles
    }
    
    await fs.writeJson(configPath, config, { spaces: 2 })
  }

  /**
   * Load custom roles from configuration
   */
  async loadCustomRoles(configPath) {
    const fs = (await import('fs-extra')).default
    
    try {
      if (await fs.exists(configPath)) {
        const config = await fs.readJson(configPath)
        if (config.customRoles) {
          this.customRoles = config.customRoles
        }
      }
    } catch (error) {
      logger.warn('Failed to load custom roles:', error.message)
    }
  }
}