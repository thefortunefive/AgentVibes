# Theme Creation Guide

Learn how to create custom themes for the Agentic Team Generator.

## Theme Structure

A theme is a JSON file that defines a group of agents with their personalities, communication styles, and technical configurations.

### Basic Schema

```json
{
  "name": "Theme Name",
  "description": "Brief description of the theme",
  "version": "1.0.0",
  "author": "Your Name",
  "emoji": "🎭",
  "colors": {
    "primary": "#00ff00",
    "secondary": "#000000", 
    "accent": "#ff0000"
  },
  "agents": [
    // Agent definitions...
  ],
  "docker": {
    "network": "theme-network",
    "compose_template": "standard"
  },
  "integrations": {
    "discord": true,
    "github": true,
    "docker": true
  }
}
```

### Agent Schema

```json
{
  "id": "agent-id",
  "name": "Agent Name",
  "emoji": "🤖",
  "description": "What this agent does",
  "personality": {
    "traits": ["trait1", "trait2", "trait3"],
    "catchphrases": ["Phrase 1", "Phrase 2", "Phrase 3"],
    "communication_style": "How they communicate"
  },
  "ports": {
    "backend": 3011,
    "frontend": 5175,
    "nginx": 3080
  },
  "host": "agent-id.test"
}
```

## Creating Your First Theme

### Step 1: Plan Your Theme

Choose a consistent theme with distinct characters:
- **Fiction**: Movies, TV shows, books, games
- **Mythology**: Greek gods, Norse mythology
- **Professions**: Scientists, artists, athletes
- **Abstract**: Elements, colors, emotions

### Step 2: Design Characters

For each character, define:
- **Role**: What they specialize in (frontend, backend, testing, etc.)
- **Personality**: 3-5 key traits
- **Communication**: How they express themselves
- **Catchphrases**: 3-5 memorable quotes

### Step 3: Create the JSON File

```json
{
  "name": "Greek Gods",
  "description": "Olympian gods bringing divine power to development",
  "version": "1.0.0",
  "author": "Your Name",
  "emoji": "⚡",
  "colors": {
    "primary": "#FFD700",
    "secondary": "#4B0082",
    "accent": "#FF6347"
  },
  "agents": [
    {
      "id": "zeus",
      "name": "Zeus",
      "emoji": "⚡",
      "description": "The King - Leadership and architecture decisions",
      "personality": {
        "traits": ["commanding", "powerful", "decisive"],
        "catchphrases": ["By my lightning!", "I command it!", "The architecture is decided!"],
        "communication_style": "commanding and authoritative"
      },
      "ports": {
        "backend": 3011,
        "frontend": 5175,
        "nginx": 3080
      },
      "host": "zeus.test"
    },
    {
      "id": "athena",
      "name": "Athena",
      "emoji": "🦉",
      "description": "The Wise - Strategic planning and code review",
      "personality": {
        "traits": ["wise", "strategic", "analytical"],
        "catchphrases": ["Wisdom guides us", "Let me analyze this", "Strategy before action"],
        "communication_style": "wise and analytical"
      },
      "ports": {
        "backend": 3012,
        "frontend": 5176,
        "nginx": 3081
      },
      "host": "athena.test"
    }
  ],
  "docker": {
    "network": "olympus-network",
    "compose_template": "standard"
  },
  "integrations": {
    "discord": true,
    "github": true,
    "docker": true
  }
}
```

### Step 4: Save and Test

1. Save as `themes/greek-gods.json`
2. Test with dry run: `create-teams --theme greek-gods --dry-run`
3. Create actual teams: `create-teams --theme greek-gods --repo YOUR_REPO`

## Design Guidelines

### Character Diversity

Create agents with different:
- **Personalities**: Serious, funny, wise, rebellious
- **Specialties**: Frontend, backend, DevOps, testing, design
- **Communication**: Formal, casual, technical, creative

### Balanced Teams

Aim for 4-8 agents per theme:
- **4 agents**: Core team (leader, specialist, support, wildcard)
- **6 agents**: Balanced team (2 seniors, 2 mid-level, 2 juniors)
- **8 agents**: Full team (diverse roles and personalities)

### Port Assignment

Use consistent port patterns:
```json
{
  "backend": 3011 + (agent_index * 10),
  "frontend": 5175 + agent_index,
  "nginx": 3080 + agent_index
}
```

### Personality Guidelines

#### Traits (3-5 per agent)
- Keep traits concise and distinct
- Mix positive and quirky traits
- Avoid overlapping traits between agents

#### Catchphrases (3-5 per agent)
- Make them memorable and character-specific
- Include both serious and lighthearted phrases
- Consider how they'd sound in code comments

#### Communication Style
- One sentence describing their communication approach
- Should influence how they write commit messages and comments

## Advanced Theme Features

### Color Schemes

Use colors that match your theme:
```json
{
  "colors": {
    "primary": "#main-brand-color",
    "secondary": "#supporting-color",
    "accent": "#highlight-color"
  }
}
```

### Docker Integration

Customize Docker settings:
```json
{
  "docker": {
    "network": "custom-network-name",
    "compose_template": "standard"
  }
}
```

### Host Configuration

Set up custom development domains:
```json
{
  "host": "character.dev.local"
}
```

## Example Themes

### Corporate Team
```json
{
  "name": "Corporate",
  "description": "Professional office personalities",
  "emoji": "💼",
  "agents": [
    {
      "id": "ceo",
      "name": "The CEO",
      "emoji": "👔",
      "description": "Strategic vision and final decisions",
      "personality": {
        "traits": ["visionary", "decisive", "busy"],
        "catchphrases": ["Let's pivot", "Synergy!", "Bottom line impact"],
        "communication_style": "executive and results-focused"
      }
    }
  ]
}
```

### Scientist Team
```json
{
  "name": "Scientists",
  "description": "Research and experimentation focused",
  "emoji": "🧪",
  "agents": [
    {
      "id": "einstein",
      "name": "Einstein",
      "emoji": "🧠",
      "description": "Theoretical framework and innovation",
      "personality": {
        "traits": ["genius", "curious", "methodical"],
        "catchphrases": ["Imagination is more important", "God does not play dice", "Eureka!"],
        "communication_style": "theoretical and questioning"
      }
    }
  ]
}
```

### Pirate Crew
```json
{
  "name": "Pirates",
  "description": "Adventurous seafaring code pirates",
  "emoji": "🏴‍☠️",
  "agents": [
    {
      "id": "captain",
      "name": "Captain Hook",
      "emoji": "🪝",
      "description": "Leading the crew through stormy releases",
      "personality": {
        "traits": ["commanding", "adventurous", "cunning"],
        "catchphrases": ["Avast ye bugs!", "All hands on deck!", "Hoist the feature flag!"],
        "communication_style": "nautical and commanding"
      }
    }
  ]
}
```

## Testing Your Theme

### Validation Checklist

- [ ] JSON syntax is valid
- [ ] All required fields are present
- [ ] Agent IDs are unique and lowercase
- [ ] Ports don't conflict with system services
- [ ] Catchphrases are appropriate for professional use
- [ ] Personality traits are distinct between agents

### Testing Commands

```bash
# Validate JSON syntax
node -e "console.log(JSON.parse(require('fs').readFileSync('themes/your-theme.json')))"

# Dry run test
create-teams --theme your-theme --dry-run

# Full test with dummy repo
create-teams --theme your-theme --repo https://github.com/octocat/Hello-World.git --output ./test-output
```

## Sharing Your Theme

### Community Contributions

1. Fork the repository
2. Add your theme to `themes/` directory
3. Add documentation to `examples/`
4. Test thoroughly
5. Submit a pull request

### Theme Package

Themes can be distributed as npm packages:

```json
{
  "name": "@yourname/agentic-theme-mytheme",
  "version": "1.0.0",
  "description": "Your theme description",
  "main": "theme.json",
  "files": ["theme.json", "README.md"]
}
```

## Best Practices

### Character Development
- Research your source material thoroughly
- Stay true to character personalities
- Balance humor with professionalism
- Consider how characters would actually code

### Technical Considerations
- Test port ranges don't conflict
- Ensure host names are valid
- Keep emoji selection consistent
- Consider accessibility in color choices

### Documentation
- Include character backgrounds
- Explain theme inspiration
- Provide usage examples
- Document any special setup requirements

## Troubleshooting

### Common Issues

**Invalid JSON**: Use a JSON validator or `node -pe` to check syntax

**Port Conflicts**: Use `--port-start` flag to shift port ranges

**Character Overlap**: Ensure each agent has distinct personality traits

**Theme Not Found**: Check file name matches theme name (lowercase, no spaces)

**Missing Fields**: Refer to `themes/custom-template.json` for required fields

### Getting Help

- Check existing themes for examples
- Use `--verbose` flag for detailed error messages  
- Test with `--dry-run` before creating actual teams
- Review the validation error messages carefully

---

**Ready to create your own themed development team?** Start with the `themes/custom-template.json` file and let your creativity flow! 🎭