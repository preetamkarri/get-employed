# GetEmployed — AI-Powered Job Search & Application Console

**GetEmployed** is an intelligent, automated job search and outreach platform designed to streamline your career search. Powered by **Google Gemini AI**, **Firecrawl**, **Apify**, and **Apollo.io**, the platform reads your resume, identifies target job roles and locations, scans live job postings from the last 24 hours, scores match alignment, finds hiring contacts, and drafts custom cold outreach messages.

---

## 🌟 Key Features

- **🤖 AI CV Parameter Extraction**: Upload your resume (PDF), and Gemini automatically extracts your optimal job target roles and country.
- **⚡ 24-Hour Smart Job Search**: Automatically searches for jobs posted in the prime **last 24-48 hours** window (when application response rates are up to 8x higher).
- **🛡️ Active Job & Expiry Validator**: Built-in verification filters out category directory pages, expired postings, and closed listings.
- **📊 AI Keyword & Match Scoring**: Instant 0–100% alignment rating for each job against your resume, highlighting matching skills, missing keywords, and specific CV bullet recommendations.
- **🎯 Hiring Contact Lookup**: Integrated with **Apollo.io** to discover hiring managers, recruiters, and talent leads for target companies.
- **✉️ Personal Style Outreach Generator**: Trains on your writing samples to draft customized Cover Letters, Cold Emails, and LinkedIn InMail pitches.
- **📋 Interactive Kanban Tracker**: Drag-and-drop job application board to track positions across stages (`To Apply`, `Applied`, `Interviewing`, `Offered`, `Rejected`).

---

## 🛠️ Integrations & Tech Stack

| Tool / API | Role in GetEmployed |
|---|---|
| **Next.js 16 (App Router)** | Modern React framework with serverless API routes & Turbopack |
| **Google Gemini (3.6 Flash)** | Resume text parsing, target parameter extraction, match scoring, and outreach drafting |
| **Firecrawl API** | Web search fallback & web-to-markdown career page parsing |
| **Apify (Google Jobs Scraper)** | Automated bulk job board searching |
| **Apollo.io API** | Contact email discovery for hiring managers & recruiters |
| **Lucide React** | Sleek UI icon set |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/get-employed.git
cd get-employed
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory (you can copy `.env.example`):

```bash
cp .env.example .env.local
```

Populate `.env.local` with your API keys:

```dotenv
# Gemini API Key (Required for resume parsing, matching, and outreach suggestions)
# Get a key from Google AI Studio: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# Apify API Token (Optional, for automated job board scraping)
# Get a token from Apify: https://apify.com/
APIFY_API_TOKEN=your_apify_token_here

# Firecrawl API Key (Optional, for web-to-markdown career page parsing & search fallback)
# Get a key from Firecrawl: https://www.firecrawl.dev/
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# Apollo API Key (Optional, for finding hiring contact emails)
# Get a key from Apollo.io: https://www.apollo.io/
APOLLO_API_KEY=your_apollo_api_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📖 How to Use

```
 ┌────────────────┐     ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
 │ 1. Upload CV   │ ──> │ 2. Smart Search│ ──> │ 3. Match Score │ ──> │ 4. Contact &   │
 │   in Profile   │     │   (Last 24h)   │     │    & Track     │     │    Outreach    │
 └────────────────┘     └────────────────┘     └────────────────┘     └────────────────┘
```

### Step 1: Upload Resume (Profile Tab)
- Go to the **My Profile** tab.
- Drag & drop your CV (PDF format).
- Gemini extracts your full resume text locally into the app database.
- *(Optional)* Paste previous writing samples so AI mimics your tone.

### Step 2: Launch AI Smart Search (Scraper Hub Tab)
- Navigate to **Scraper Hub**.
- Click **⚡ Extract Parameters from CV** to preview the target roles and country AI extracted from your resume.
- Click **🚀 Launch AI Smart Job Search (Last 24h)**.
- GetEmployed fetches active listings posted in the last 24 hours, filters out expired postings, and auto-calculates match scores.

### Step 3: Review Alignment & Track Jobs (Job Tracker Tab)
- Click any job card on the **Kanban Board** to open the AI Assistant.
- Review your **Suitability Report**, overlapping skills, and missing keywords.
- Drag cards across columns (`To Apply` ➔ `Applied` ➔ `Interviewing` ➔ `Offered`).

### Step 4: Contact Lookup & Cold Outreach
- In the Job Drawer, click **Hiring Contacts** to run an **Apollo.io** search for recruiters or managers at that company.
- Click **Outreach Scripts** to generate a personalized Cover Letter, Cold Email, and LinkedIn message.

---

## 📁 Repository Structure

```
get-employed/
├── public/                # Static assets
├── src/
│   ├── app/
│   │   ├── api/           # Next.js Serverless API routes
│   │   │   ├── ai-match/       # AI resume match analysis
│   │   │   ├── ai-outreach/    # Outreach script generation
│   │   │   ├── apollo/         # Contact search API
│   │   │   ├── jobs/           # Job CRUD operations
│   │   │   ├── profile/        # Resume upload & preferences API
│   │   │   ├── scrape/         # URL page scraper
│   │   │   └── smart-search/   # AI 24h job discovery endpoint
│   │   ├── globals.css    # Modern Dark/Glassmorphism CSS Design System
│   │   ├── layout.tsx     # Main application layout
│   │   └── page.tsx       # Main dashboard & tab controller
│   └── lib/
│       ├── db.ts          # Local JSON database interface
│       ├── gemini.ts      # Gemini AI integration & prompts
│       ├── pdfParser.ts   # Gemini-powered PDF text parser
│       └── scraper.ts     # Apify & Firecrawl job scraping functions
├── .env.example           # Template for environment variables
├── jobs_db.json           # Local database storage file
├── package.json           # Dependencies and scripts
└── README.md              # Project documentation
```

---

## 🛡️ License

This project is open-source and available under the [MIT License](LICENSE).

