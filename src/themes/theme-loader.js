import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { validateTheme } from './theme-validator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function loadThemes() {
  const themesDir = path.join(__dirname, '../../themes')
  const themeFiles = await fs.readdir(themesDir)
  
  const themes = []
  
  for (const file of themeFiles) {
    if (file.endsWith('.json') && file !== 'custom-template.json') {
      try {
        const themePath = path.join(themesDir, file)
        const themeData = await fs.readJson(themePath)
        
        // Validate theme
        const validatedTheme = validateTheme(themeData)
        
        themes.push(validatedTheme)
      } catch (error) {
        console.warn(`Warning: Failed to load theme ${file}:`, error.message)
      }
    }
  }
  
  return themes.sort((a, b) => a.name.localeCompare(b.name))
}

export async function loadThemeByName(themeName) {
  const themes = await loadThemes()
  const theme = themes.find(t => t.name.toLowerCase() === themeName.toLowerCase())
  
  if (!theme) {
    throw new Error(`Theme "${themeName}" not found`)
  }
  
  return theme
}

export async function loadCustomTheme(themePath) {
  try {
    const themeData = await fs.readJson(themePath)
    return validateTheme(themeData)
  } catch (error) {
    throw new Error(`Failed to load custom theme: ${error.message}`)
  }
}