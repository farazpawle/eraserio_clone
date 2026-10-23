
# Eraser.io Clone

## Overview

This project is a fully functional clone of [Eraser.io](https://eraser.io) built with **Next.js**, **React**, **TypeScript**, and **Tailwind CSS**. The application is a document + whiteboard tool where teams keep files, invite members and share files by link.

## Features

- **Teams and sharing**: Create teams, invite members with a link, and share files with view / comment / edit links.
- **Login**: Email + password and Google, powered by Supabase Auth.
- **Next.js**: The app is built on Next.js, utilizing server-side rendering for performance optimization.
- **TypeScript**: Strongly typed components ensure robust and error-free code.
- **Tailwind CSS**: Utility-first CSS framework for fast and responsive UI development.

## Technologies Used

- **Next.js**: React framework for server-rendered applications.
- **TypeScript**: Superset of JavaScript for type safety.
- **Tailwind CSS**: Utility-first CSS framework.
- **Supabase** (self-hosted): Postgres database with row-level security, and login.

## Project Structure

```
eraserio_clone-main/
├── app/                      # Application files
├── components/               # React components
├── lib/                      # Utility libraries (Supabase clients, data access)
├── supabase/                 # Database migrations and RLS tests
├── public/                   # Static assets
├── .vscode/                  # VSCode workspace settings
├── .gitignore                # Files to ignore in git
├── next.config.mjs           # Next.js configuration
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── README.md                 # Project documentation
└── .env                      # Environment variables (not included in version control)
```

## Prerequisites

Before running the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/eraserio-clone.git
   cd eraserio-clone
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Add Environment Variables**:
   Copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key and (server-only) service-role key.

4. **Run the application**:
   ```bash
   npm run dev
   ```

   The app will be running on `http://localhost:3000`.

5. **Build for Production**:
   To build the app for production, run:
   ```bash
   npm run build
   ```

6. **Deploy**:
   Deployment can be done using any Next.js compatible hosting platform (e.g., Vercel, Netlify, etc.). Follow the platform-specific instructions for deployment.

## Learn More

To learn more about the technologies used in this project, check out the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API.
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Learn about Tailwind CSS.
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) - Learn about TypeScript.

## License

This project is licensed under the MIT License.
