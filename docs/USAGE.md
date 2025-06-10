# Usage Guide

Comprehensive guide for using the Agentic Team Generator effectively.

## Installation

```bash
# Install globally via npm
npm install -g agentic-team-generator

# Or run without installing
npx agentic-team-generator
```

## Basic Usage

### Interactive Mode (Recommended)
```bash
create-teams
```
This launches the interactive CLI with beautiful prompts and theme selection.

### Command Line Mode
```bash
# Simple theme setup
create-teams --theme matrix --repo https://github.com/user/repo.git

# Multiple themes
create-teams --themes matrix,simpsons --repo https://github.com/user/repo.git

# With project board
create-teams --theme guardians --repo https://github.com/user/repo.git --project-board
```

## Command Line Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--themes` | `-t` | Comma-separated theme names | `--themes matrix,simpsons` |
| `--repo` | `-r` | GitHub repository URL | `--repo https://github.com/user/repo.git` |
| `--output` | `-o` | Output directory | `--output ./my-teams` |
| `--port-start` | `-p` | Starting port number | `--port-start 4000` |
| `--docker-network` | | Docker network name | `--docker-network custom-net` |
| `--project-board` | | Enable GitHub Projects | `--project-board` |
| `--project-id` | | Use existing project | `--project-id PVT_123` |
| `--skip-commands` | | Skip command installation | `--skip-commands` |
| `--config` | `-c` | Load from config file | `--config teams.json` |
| `--dry-run` | | Preview without creating | `--dry-run` |
| `--verbose` | `-v` | Detailed output | `--verbose` |

## Working with Teams

### Launching Teams
```bash
# Start all teams
./scripts/launch-all-teams.sh

# Start individual agent
cd agents/neo
./launch

# Check status
./scripts/status-check.sh
```

### Stopping Teams
```bash
# Stop all teams
./scripts/down-all-teams.sh

# Stop individual agent
cd agents/neo
./down
```

### Building Teams
```bash
# Build all teams
for agent in agents/*/; do
  cd "$agent" && ./build.sh && cd ../..
done

# Build individual agent
cd agents/neo
./build.sh
```

## Project Board Workflow

### Creating Issues
```bash
cd agents/neo
/create-issue "Implement user authentication"
```

### Starting Work
```bash
/start-issue 42  # Issue number
```

### Linking PRs
```bash
/link-pr 42 123  # Issue number, PR number
```

### Checking Status
```bash
/check-board
/update-project-board
```

## Customization Examples

### Custom Port Ranges
```bash
create-teams --theme matrix --port-start 5000 --repo https://github.com/user/repo.git
```

### Custom Network
```bash
create-teams --theme guardians --docker-network my-network --repo https://github.com/user/repo.git
```

### Multiple Themes with Project Board
```bash
create-teams \
  --themes matrix,simpsons,guardians \
  --repo https://github.com/user/big-project.git \
  --project-board \
  --output ./mega-teams \
  --verbose
```

## Configuration Files

### Creating Config Files
```json
{
  "themes": ["matrix", "simpsons"],
  "repo": "https://github.com/user/project.git",
  "outputDir": "./teams",
  "portStart": 4000,
  "projectBoard": true,
  "dockerNetwork": "custom-network"
}
```

### Using Config Files
```bash
create-teams --config my-config.json
```

## Troubleshooting

### Port Conflicts
```bash
# Check what's using ports
lsof -i :3011

# Kill processes on all team ports
./scripts/down-all-teams.sh
```

### Git Authentication
```bash
# Check GitHub CLI auth
gh auth status

# Re-authenticate if needed
gh auth login
```

### Docker Issues
```bash
# Check Docker is running
docker info

# Recreate network
docker network rm matrix-network
docker network create matrix-network
```

### Build Failures
```bash
# Clean and rebuild
cd agents/neo
rm -rf node_modules .next dist
npm install
./build.sh
```

## Tips and Best Practices

### Theme Selection
- **Matrix**: Great for security, authentication, and philosophical coding discussions
- **Simpsons**: Perfect for debugging, testing, and adding humor to development
- **Marvel**: Ideal for large projects requiring diverse skill sets
- **Guardians**: Excellent for creative projects and team coordination
- **Star Wars**: Perfect for epic projects with clear good vs evil dynamics
- **Anime**: Great for passionate, high-energy development sprints

### Port Management
- Use `--port-start` to avoid conflicts with existing services
- Default ports start at 3011 (backend), 5175 (frontend), 3080 (nginx)
- Each agent gets ports incremented by 1 for backend/frontend, by 1 for nginx

### Character Immersion
- Let agents maintain their personalities in code comments
- Use character-appropriate variable names when reasonable
- Embrace the theme in documentation and communication

### Project Board Best Practices
- Create issues with descriptive titles using agent emojis
- Move items through the workflow systematically
- Use comments to maintain character voice in discussions
- Regular status updates help team coordination

## Advanced Usage

### Custom Theme Development
1. Create JSON file in `themes/` directory
2. Follow schema in `themes/custom-template.json`
3. Test with `--dry-run` first
4. Use with `--theme your-theme-name`

### Extending Existing Themes
```bash
# Generate with base theme
create-teams --theme matrix --config base.json

# Manually edit generated CLAUDE.md files
# Add custom personalities, catchphrases, or behaviors
```

### Multi-Project Setup
```bash
# Project A - Authentication service
create-teams --theme matrix --repo https://github.com/user/auth-service.git --output ./auth-teams

# Project B - Frontend application  
create-teams --theme simpsons --repo https://github.com/user/frontend-app.git --output ./frontend-teams

# Project C - API backend
create-teams --theme guardians --repo https://github.com/user/api-backend.git --output ./api-teams
```

### CI/CD Integration
```yaml
# .github/workflows/team-setup.yml
name: Setup Development Teams
on:
  workflow_dispatch:
    inputs:
      theme:
        description: 'Theme to use'
        required: true
        default: 'matrix'
        
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g agentic-team-generator
      - run: create-teams --theme ${{ github.event.inputs.theme }} --repo ${{ github.repository }} --project-board
```