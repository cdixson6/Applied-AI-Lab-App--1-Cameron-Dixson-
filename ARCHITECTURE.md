# System Architecture: SalesPulse Regional Analytics

SalesPulse Analytics is an executive financial intelligence dashboard designed to help business leaders analyze quarterly sales performance, identify regional revenue variances, and uncover underlying operational drivers. By ingesting sales transaction records via CSV or pre-loaded datasets, the platform automatically aggregates total revenues and unit volumes across quarters (Q1 through Q4), computes quarter-over-quarter percentage and absolute dollar shifts, highlights top-performing regions, and generates an audit-ready, three-sentence narrative variance summary powered by Gemini 3.8 Flash that strictly references verified mathematical figures.

## Application File Directory

| File | Purpose |
| :--- | :--- |
| `ARCHITECTURE.md` | Explains the platform's business purpose, architectural design, and provides a comprehensive directory of every file in the solution. |
| `.env.example` | Defines the required runtime environment variables, such as server port and Gemini API credentials, without exposing sensitive values. |
| `.gitignore` | Identifies directories and temporary build artifacts that should not be tracked by source version control. |
| `bun.lock` | Preserves deterministic dependency package versions when working with alternative JavaScript package runners. |
| `index.html` | Provides the web entry page, metadata headers, and the root DOM element where the client dashboard is rendered. |
| `metadata.json` | Stores AI Studio application registration details, project descriptions, and required server-side API capabilities. |
| `package.json` | Defines project metadata, script commands (`dev`, `build`, `start`, `lint`), and runtime software dependencies. |
| `server.ts` | Hosts the Node.js Express server that serves static frontend assets and executes secure, server-side Gemini AI variance analysis requests. |
| `src/App.tsx` | Serves as the central user interface conductor, calculating financial metrics and orchestrating KPI cards, charts, tables, and AI summaries. |
| `src/components/AiSummaryCard.tsx` | Presents the structured three-sentence AI variance briefing alongside audited numbers, comparison criteria, and regeneration controls. |
| `src/components/BestPerformerSpotlight.tsx` | Showcases the top revenue-generating region, its market share percentage, and quarterly trajectory to provide executive context. |
| `src/components/CsvUploader.tsx` | Enables users to drag and drop custom sales order CSV files, inspect record counts, and toggle demo transaction data. |
| `src/components/RevenueChart.tsx` | Visualizes quarterly regional revenue streams in an interactive bar chart that emphasizes active or high-variance regions. |
| `src/components/RevenueTable.tsx` | Formats cross-tabulated revenue matrices, regional rankings, and granular product and channel breakdown tables. |
| `src/index.css` | Implements global styling, design foundations, and custom scrollbar aesthetics using Tailwind CSS. |
| `src/main.tsx` | Mounts the top-level React application to the browser document. |
| `src/types.ts` | Establishes TypeScript interfaces and domain data models for sales orders, calculated matrices, and variance summaries. |
| `src/utils/analytics.ts` | Houses the analytical calculations that compute quarterly regional revenues, variance deltas, and product/channel drivers. |
| `src/utils/csvParser.ts` | Parses raw CSV transaction text into sanitized, type-safe sales order data objects with header validation. |
| `src/utils/sampleData.ts` | Supplies a default multi-quarter global sales dataset so business users can immediately interact with live analytics upon launching. |
| `tsconfig.json` | Configures TypeScript compiler settings, target syntax levels, and module resolution rules. |
| `vite.config.ts` | Defines the Vite development and build pipeline, bundling React components and integrating Tailwind CSS. |
