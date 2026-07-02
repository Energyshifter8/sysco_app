# Contributing to Sysco App

Thank you for your interest in contributing to Sysco App! We welcome contributions from everyone and are grateful for every pull request.

## Code of Conduct

Please be respectful and inclusive in all interactions with other contributors and maintainers.

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Git

### Setup Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sysco_app.git
   cd sysco_app
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Create a new branch for your changes:
   ```bash
   git checkout -b feat/your-feature-name
   ```

### Development

- Run the development server:
  ```bash
  pnpm dev
  ```
  The app will be available at [http://localhost:3000](http://localhost:3000)

- Run linting and type checking:
  ```bash
  pnpm run check
  ```

- Format code:
  ```bash
  pnpm run format
  ```

## Making Changes

### Code Style

- Follow the existing code style in the project
- Use TypeScript for all new code
- Run `pnpm run lint:fix` to automatically fix linting issues
- Use meaningful variable and function names

### Commit Messages

Use clear, descriptive commit messages:
- Use the imperative mood ("Add feature" not "Added feature")
- Keep the first line under 50 characters
- Add details in the body if needed

Example:
```
Add authentication flow documentation

- Document login/logout process
- Include Firebase setup instructions
- Add examples for token refresh
```

### Testing

- Ensure your changes don't break existing functionality
- Test your changes locally before submitting a PR
- Build the project successfully: `pnpm run build`

## Submitting a Pull Request

1. Push your branch to your fork
2. Create a pull request against the `main` branch
3. Provide a clear title and description of your changes
4. Reference any related issues using `#issue-number`
5. Ensure all CI checks pass
6. Wait for review and be open to feedback

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Include relevant details about what was changed and why
- Link to any related issues or discussions
- Ensure your branch is up to date with `main` before submitting

## Questions?

Feel free to open an issue to ask questions or discuss potential improvements.

Happy coding! 🚀
