# Sysco App

A modern [Next.js](https://nextjs.org) application built with TypeScript, Firebase, and Tailwind CSS. This project provides a robust foundation for building scalable web applications with real-time capabilities.

## Tech Stack

- **Framework:** Next.js 16.2.9 with React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 with PostCSS
- **Database:** Firebase with Firestore
- **UI Components:** shadcn/ui, Radix UI, Lucide Icons
- **State Management:** TanStack React Query
- **Theme Support:** next-themes
- **Code Quality:** Biome for linting and formatting

## Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Energyshifter8/sysco_app.git
cd sysco_app

# Install dependencies
pnpm install
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

The page will auto-update as you make changes to `src/app/page.tsx`.

### Build

Create an optimized production build:

```bash
pnpm build
pnpm start
```

## Development Tools

- **Linting & Formatting:** 
  ```bash
  pnpm run lint       # Check code style
  pnpm run lint:fix   # Auto-fix linting issues
  pnpm run format     # Format code
  ```

- **Type Checking & Build:**
  ```bash
  pnpm run check      # Run full check (lint + type check + build)
  ```

## Project Structure

```
src/
├── app/          # Next.js app directory
├── components/   # Reusable React components
├── lib/          # Utility functions and helpers
└── ...
```

## Features

- ✨ Modern UI with shadcn/ui components
- 🎨 Dark mode support via next-themes
- 🔥 Firebase integration for backend services
- 📱 Responsive design with Tailwind CSS
- 🎯 Type-safe development with TypeScript
- ⚡ Real-time data with React Query

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./.github/CONTRIBUTING.md) for guidelines on how to get started.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Firebase Documentation](https://firebase.google.com/docs)

## Deployment

The easiest way to deploy this application is on [Vercel](https://vercel.com):

```bash
# Deploy with Vercel CLI
vercel
```

Or use the [Vercel Platform](https://vercel.com/new) with one-click deployment.

See [Next.js deployment documentation](https://nextjs.org/docs/app/building-application/deploying) for more details.

## License

This project is open source and available under the MIT License.

---

Made with ❤️ by the development team
