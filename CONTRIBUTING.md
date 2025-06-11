# Contributing to AgentVibes 🎭

Thank you for your interest in contributing to AgentVibes! We welcome contributions from the community.

## 🚦 CI/CD Requirements

All pull requests must pass our automated checks before merging:

| Check | Description | Required |
|-------|-------------|----------|
| ✅ **Tests** | All unit, integration, and E2E tests must pass | Yes |
| ✅ **Coverage** | Code coverage should not decrease | Yes |
| ✅ **Build** | Project must build successfully | Yes |
| ✅ **Security** | No high-severity vulnerabilities | Yes |
| ✅ **PR Title** | Must follow conventional commits format | Yes |

## 🔄 Pull Request Process

1. **Fork & Clone** the repository
2. **Create a branch** from `master`
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, documented code
   - Add tests for new features
   - Update documentation as needed

4. **Run tests locally**
   ```bash
   npm test
   npm run test:all
   ```

5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing new feature"
   git commit -m "fix: resolve issue with theme loading"
   git commit -m "docs: update README with new examples"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Conventional Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

## 🧪 Testing

Before submitting your PR, ensure all tests pass:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm install -g c8
c8 npm test
```

## 🎨 Code Style

- Use ES6+ features
- Follow existing code patterns
- Add JSDoc comments for functions
- Keep functions small and focused

## 🐛 Reporting Issues

When reporting issues, please include:
- AgentVibes version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior

## 💡 Feature Requests

We love new ideas! When suggesting features:
- Explain the use case
- Describe expected behavior
- Consider backward compatibility
- Suggest implementation approach

## 🎭 Creating New Themes

To add a new theme:

1. Create a theme file in `themes/`
2. Follow the existing theme structure
3. Add at least 4 characters
4. Include personality traits and catchphrases
5. Test the theme thoroughly

Example:
```json
{
  "name": "Your Theme Name",
  "description": "Theme description",
  "emoji": "🎭",
  "agents": [
    {
      "id": "character-id",
      "name": "Character Name",
      "emoji": "😎",
      "personality": {
        "traits": ["trait1", "trait2"],
        "catchphrases": ["phrase1", "phrase2"],
        "communication_style": "how they communicate"
      }
    }
  ]
}
```

## 🤝 Code of Conduct

Be respectful, inclusive, and professional. We're all here to make AgentVibes better!

## 📄 License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

---

**Questions?** Feel free to open an issue or reach out to [@paulpreibisch](https://twitter.com/paulpreibisch)

Happy coding! 🚀