import fs from 'fs-extra'
import path from 'path'

export async function ensureDirectoryExists(dirPath) {
  await fs.ensureDir(dirPath)
}

export async function copyTemplate(sourcePath, destPath, replacements = {}) {
  let content = await fs.readFile(sourcePath, 'utf-8')
  
  // Replace template variables
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    content = content.replace(regex, value)
  }
  
  await fs.writeFile(destPath, content)
}

export async function makeExecutable(filePath) {
  await fs.chmod(filePath, 0o755)
}

export async function findFiles(directory, pattern) {
  const files = []
  
  async function search(dir) {
    const items = await fs.readdir(dir)
    
    for (const item of items) {
      const itemPath = path.join(dir, item)
      const stat = await fs.stat(itemPath)
      
      if (stat.isDirectory()) {
        await search(itemPath)
      } else if (item.match(pattern)) {
        files.push(itemPath)
      }
    }
  }
  
  await search(directory)
  return files
}