# Personal Budget Tracker

A clean, modern, responsive personal budget and cashflow tracking web app designed to replace complex Excel workbooks with a simple, normalized data structure.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite (local) via **Prisma ORM**
- **Charts**: Recharts
- **Validation**: Zod
- **Icons**: Lucide React

## Project Philosophy
This application treats finance predictably:
- **Accounts**: Where money sits.
- **Transactions**: The raw events. Categorized strictly into `INCOME`, `EXPENSE`, or `TRANSFER`.
- **Transfers**: Internal movement. Do not pollute expense or income tracking.
- **Budgets**: Planned spending targets assigned to `EXPENSE` categories per month.

## Features
- **Dashboard & Date Filters**: View net worth, income, expenses, and charts filtered by This Month, Last Month, YTD, or All Time.
- **Recurring Transactions**: Set up automations to generate bills, subscriptions, or paychecks on a schedule.
- **Settings & Export**: Change global currency (e.g. `RM`, `USD`) and download all transactions as a CSV.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   Ensure your `.env` has the correct SQLite URL:
   ```env
   DATABASE_URL="file:./dev.db"
   ```
   
   Run the Prisma migrations:
   ```bash
   npx prisma db push
   ```

3. **Seeding Sample Data**
   Populate the database with sample categories, accounts, and transactions:
   ```bash
   npm run prisma seed
   ```
   *Note: This runs `tsx prisma/seed.ts` to initialize defaults based on a realistic monthly budget scenario.*

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Architecture Overview
- `src/components/ui/`: Contains custom reusable Tailwind components (Buttons, Cards, Modals, Inputs) to maintain consistent design without external UI libraries.
- `src/components/layout/`: Holds the responsive App Shell sidebar.
- `src/actions/`: Next.js Server Actions handling business logic and Prisma database access securely on the server.
- `src/app/`: The Next.js App Router structure. Data is fetched securely in server components (e.g., `page.tsx`) and passed into interactive Client components (e.g., `*Client.tsx`).
- `src/lib/`: Core utilities, Zod schemas for strict form validation, and Prisma client instantiation.

## Known Limitations & Future Enhancements
- **Authentication**: Currently built as a single-user local application. The architecture is ready to integrate NextAuth/Auth.js.
- **Bank Imports**: Transactions are currently entered manually or via Recurring automations. A future CSV upload mapping feature will be needed to import bank statements.
