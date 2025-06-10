import { runCommand, checkCommandExists } from './exec-utils.js'

export async function checkDocker() {
  return await checkCommandExists('docker')
}

export async function checkDockerCompose() {
  const hasCompose = await checkCommandExists('docker-compose')
  const hasComposeV2 = await checkCommandExists('docker')
  
  if (hasComposeV2) {
    const result = await runCommand('docker compose version')
    return result.success
  }
  
  return hasCompose
}

export async function getDockerComposeCommand() {
  const hasComposeV2 = await checkCommandExists('docker')
  
  if (hasComposeV2) {
    const result = await runCommand('docker compose version')
    if (result.success) {
      return 'docker compose'
    }
  }
  
  return 'docker-compose'
}

export async function createDockerNetwork(networkName) {
  const result = await runCommand(`docker network create ${networkName}`)
  return result.success || result.stderr.includes('already exists')
}

export async function removeDockerNetwork(networkName) {
  const result = await runCommand(`docker network rm ${networkName}`)
  return result.success
}

export async function checkPortAvailable(port) {
  const result = await runCommand(`lsof -i :${port}`)
  return !result.success // Port is available if lsof fails to find anything
}

export async function findAvailablePort(startPort, count = 1) {
  const availablePorts = []
  let currentPort = startPort
  
  while (availablePorts.length < count) {
    if (await checkPortAvailable(currentPort)) {
      availablePorts.push(currentPort)
    }
    currentPort++
    
    // Safety check to avoid infinite loop
    if (currentPort > startPort + 1000) {
      throw new Error(`Could not find ${count} available ports starting from ${startPort}`)
    }
  }
  
  return availablePorts
}