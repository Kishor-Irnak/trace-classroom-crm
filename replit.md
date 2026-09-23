# Student CRM for Google Classroom

## Overview

Student CRM is a micro-SaaS web application that transforms Google Classroom data into a student-centric productivity system. It provides a Kanban-style pipeline view, timeline visualization, and dashboard metrics to help students manage assignments across multiple courses. The application follows a monochrome design system inspired by Linear, Attio, and Notion, emphasizing information density, clarity, and speed-optimized interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context API for auth, theme, and classroom data; TanStack Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **Drag and Drop**: @dnd-kit for Kanban board interactions

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Build Tool**: esbuild for server bundling, Vite for client

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` using Zod for validation
- **Storage Interface**: Abstract `IStorage` interface in `server/storage.ts` allowing swappable implementations (currently MemStorage for development)
- **Migrations**: Drizzle Kit with migrations output to `./migrations`

### Authentication
- **Provider**: Firebase Authentication with Google OAuth 2.0
- **Scopes**: Google Classroom API read-only access for courses, coursework, and submissions
- **Client Integration**: Firebase SDK initialized in `client/src/lib/firebase.ts`

### Key Design Patterns
- **Shared Types**: Schema definitions in `shared/` directory accessible by both client and server via path aliases
- **Path Aliases**: `@/` for client source, `@shared/` for shared modules
- **Component Structure**: Feature components in `client/src/components/`, pages in `client/src/pages/`, UI primitives in `client/src/components/ui/`
- **Context Providers**: Layered providers for auth, theme, and classroom data in App.tsx

## External Dependencies

### Third-Party Services
- **Firebase**: Authentication and Firestore database
- **Google Classroom API**: Read-only access to courses, coursework, and student submissions

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Database toolkit for type-safe queries and migrations

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `VITE_FIREBASE_API_KEY`: Firebase API key
- `VITE_FIREBASE_PROJECT_ID`: Firebase project ID
- `VITE_FIREBASE_APP_ID`: Firebase application ID

### Key NPM Dependencies
- React ecosystem: react, react-dom, wouter, @tanstack/react-query
- UI: @radix-ui components, tailwindcss, class-variance-authority
- Backend: express, drizzle-orm, pg, connect-pg-simple
- Authentication: firebase
- Drag-and-drop: @dnd-kit/core, @dnd-kit/sortable