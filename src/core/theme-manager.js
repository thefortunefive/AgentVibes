/**
 * AgentVibes - Theme Manager
 * Manages themes, colors, and persistence
 * Copyright 2024 Paul Preibisch
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { loadThemes } from '../themes/theme-loader.js'
import { logger } from '../utils/logger.js'
import path from 'path'

export class ThemeManager {
  constructor() {
    this.themes = []
    this.colorSchemes = this.initializeColorSchemes()
    this.configurations = new Map()
  }

  /**
   * Initialize color schemes
   */
  initializeColorSchemes() {
    return {
      // ROYGBIV colors
      red: {
        id: 'red',
        name: 'Red',
        emoji: '🔴',
        primary: '#FF0000',
        secondary: '#CC0000',
        background: '#2A0000',
        foreground: '#FFCCCC'
      },
      orange: {
        id: 'orange',
        name: 'Orange',
        emoji: '🟠',
        primary: '#FFA500',
        secondary: '#CC8400',
        background: '#2A1A00',
        foreground: '#FFE5CC'
      },
      yellow: {
        id: 'yellow',
        name: 'Yellow',
        emoji: '🟡',
        primary: '#FFFF00',
        secondary: '#CCCC00',
        background: '#2A2A00',
        foreground: '#FFFFCC'
      },
      green: {
        id: 'green',
        name: 'Green',
        emoji: '🟢',
        primary: '#00FF00',
        secondary: '#00CC00',
        background: '#002A00',
        foreground: '#CCFFCC'
      },
      blue: {
        id: 'blue',
        name: 'Blue',
        emoji: '🔵',
        primary: '#0000FF',
        secondary: '#0000CC',
        background: '#00002A',
        foreground: '#CCCCFF'
      },
      indigo: {
        id: 'indigo',
        name: 'Indigo',
        emoji: '🟣',
        primary: '#4B0082',
        secondary: '#3A0066',
        background: '#1A002A',
        foreground: '#E5CCFF'
      },
      violet: {
        id: 'violet',
        name: 'Violet',
        emoji: '🟣',
        primary: '#9400D3',
        secondary: '#7600A8',
        background: '#20002A',
        foreground: '#F0CCFF'
      },
      // Premium colors
      cyan: {
        id: 'cyan',
        name: 'Cyan',
        emoji: '🟦',
        primary: '#00FFFF',
        secondary: '#00CCCC',
        background: '#002A2A',
        foreground: '#CCFFFF'
      },
      pink: {
        id: 'pink',
        name: 'Pink',
        emoji: '🩷',
        primary: '#FFC0CB',
        secondary: '#FF91A4',
        background: '#2A1A1F',
        foreground: '#FFE5EC'
      },
      slate: {
        id: 'slate',
        name: 'Slate',
        emoji: '🔘',
        primary: '#708090',
        secondary: '#5A6A7A',
        background: '#1A1F24',
        foreground: '#E0E5EA'
      },
      coral: {
        id: 'coral',
        name: 'Coral',
        emoji: '🪸',
        primary: '#FF7F50',
        secondary: '#CC6640',
        background: '#2A1A14',
        foreground: '#FFE5DD'
      },
      mint: {
        id: 'mint',
        name: 'Mint',
        emoji: '🌿',
        primary: '#00FF7F',
        secondary: '#00CC66',
        background: '#002A1A',
        foreground: '#CCFFE5'
      }
    }
  }

  /**
   * Load all available themes
   */
  async loadThemes() {
    this.themes = await loadThemes()
    return this.themes
  }

  /**
   * Get all themes
   */
  getThemes() {
    return this.themes
  }

  /**
   * Get themes grouped by category
   */
  getThemesByCategory() {
    const grouped = {}
    
    for (const theme of this.themes) {
      const category = theme.category || 'Other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(theme)
    }
    
    return grouped
  }

  /**
   * Search themes by keyword
   */
  searchThemes(keyword) {
    const search = keyword.toLowerCase()
    
    return this.themes.filter(theme => {
      return theme.name.toLowerCase().includes(search) ||
             theme.description?.toLowerCase().includes(search) ||
             theme.agents.some(agent => 
               agent.name.toLowerCase().includes(search) ||
               agent.catchphrase?.toLowerCase().includes(search)
             )
    })
  }

  /**
   * Get color manager
   */
  getColorManager() {
    return {
      getAvailableColors: () => Object.values(this.colorSchemes),
      getColor: (id) => this.colorSchemes[id],
      getROYGBIVColors: () => ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet']
        .map(id => this.colorSchemes[id]),
      getPremiumColors: () => ['cyan', 'pink', 'slate', 'coral', 'mint']
        .map(id => this.colorSchemes[id])
    }
  }

  /**
   * Save configuration
   */
  async saveConfiguration(filePath, config) {
    const fs = (await import('fs-extra')).default
    
    const configuration = {
      version: '1.0.0',
      created: new Date().toISOString(),
      ...config
    }
    
    await fs.writeJson(filePath, configuration, { spaces: 2 })
    
    // Store in memory
    this.configurations.set(filePath, configuration)
    
    logger.info(`Configuration saved to ${filePath}`)
  }

  /**
   * Load configuration
   */
  async loadConfiguration(filePath) {
    const fs = (await import('fs-extra')).default
    
    try {
      const config = await fs.readJson(filePath)
      
      // Validate version
      if (config.version !== '1.0.0') {
        logger.warn(`Configuration version mismatch: ${config.version}`)
      }
      
      // Store in memory
      this.configurations.set(filePath, config)
      
      return config
    } catch (error) {
      logger.error(`Failed to load configuration: ${error.message}`)
      return null
    }
  }

  /**
   * Export theme configuration
   */
  async exportTheme(themeName, outputPath) {
    const theme = this.themes.find(t => t.name === themeName)
    if (!theme) {
      throw new Error(`Theme not found: ${themeName}`)
    }
    
    const fs = (await import('fs-extra')).default
    await fs.writeJson(outputPath, theme, { spaces: 2 })
    
    logger.info(`Theme exported to ${outputPath}`)
  }

  /**
   * Import theme configuration
   */
  async importTheme(themePath) {
    const fs = (await import('fs-extra')).default
    
    try {
      const theme = await fs.readJson(themePath)
      
      // Validate theme structure
      if (!theme.name || !theme.agents) {
        throw new Error('Invalid theme structure')
      }
      
      // Check for duplicates
      const existing = this.themes.findIndex(t => t.name === theme.name)
      if (existing !== -1) {
        logger.warn(`Replacing existing theme: ${theme.name}`)
        this.themes[existing] = theme
      } else {
        this.themes.push(theme)
      }
      
      logger.info(`Theme imported: ${theme.name}`)
      return theme
    } catch (error) {
      logger.error(`Failed to import theme: ${error.message}`)
      throw error
    }
  }

  /**
   * List saved configurations
   */
  async listConfigurations(directory = '.') {
    const fs = (await import('fs-extra')).default
    const glob = (await import('glob')).glob
    
    const pattern = path.join(directory, '**/.agentvibes.json')
    const files = await glob(pattern)
    
    const configs = []
    for (const file of files) {
      try {
        const config = await fs.readJson(file)
        configs.push({
          path: file,
          created: config.created,
          teamCount: config.teamCount,
          teams: config.teams?.length || 0
        })
      } catch (error) {
        logger.warn(`Failed to read config ${file}: ${error.message}`)
      }
    }
    
    return configs
  }

  /**
   * Generate terminal settings
   */
  generateTerminalSettings(teams) {
    const settings = {
      schemes: [],
      profiles: {
        list: []
      }
    }
    
    // Generate color schemes
    const usedColors = new Set()
    for (const team of teams) {
      const colorScheme = team.colorScheme
      if (colorScheme && !usedColors.has(colorScheme.id)) {
        usedColors.add(colorScheme.id)
        
        settings.schemes.push({
          name: `AgentVibes-${colorScheme.name}`,
          background: colorScheme.background,
          foreground: colorScheme.foreground,
          cursorColor: colorScheme.primary,
          selectionBackground: colorScheme.secondary,
          black: '#000000',
          red: colorScheme.id === 'red' ? colorScheme.primary : '#FF0000',
          green: colorScheme.id === 'green' ? colorScheme.primary : '#00FF00',
          yellow: colorScheme.id === 'yellow' ? colorScheme.primary : '#FFFF00',
          blue: colorScheme.id === 'blue' ? colorScheme.primary : '#0000FF',
          purple: colorScheme.id === 'violet' ? colorScheme.primary : '#9400D3',
          cyan: colorScheme.id === 'cyan' ? colorScheme.primary : '#00FFFF',
          white: '#FFFFFF',
          brightBlack: '#555555',
          brightRed: colorScheme.secondary,
          brightGreen: '#55FF55',
          brightYellow: '#FFFF55',
          brightBlue: '#5555FF',
          brightPurple: '#FF55FF',
          brightCyan: '#55FFFF',
          brightWhite: '#FFFFFF'
        })
      }
    }
    
    // Generate profiles
    for (const team of teams) {
      settings.profiles.list.push({
        guid: `{${this.generateGUID()}}`,
        name: `${team.emoji} ${team.name} - Team ${team.teamNumber}`,
        commandline: `wsl.exe -d Ubuntu -- cd ~/agentvibes/teams/team-${team.teamNumber}/${team.role} && bash`,
        colorScheme: `AgentVibes-${team.colorScheme.name}`,
        icon: team.emoji,
        startingDirectory: `\\\\wsl$\\Ubuntu\\home\\user\\agentvibes\\teams\\team-${team.teamNumber}\\${team.role}`,
        tabTitle: `${team.emoji} ${team.name}`,
        suppressApplicationTitle: true
      })
    }
    
    return settings
  }

  /**
   * Generate GUID
   */
  generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}