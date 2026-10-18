# LoopBite

**Campus leftovers, before they're gone.**

**Live:** https://loopbite-two.vercel.app

## Use case

Campus dining halls and cafés often have food left over at the end of a service. Today it's usually thrown away, or it goes to whoever happens to hear about it first, by word of mouth. By the time most students find out, it's gone.

LoopBite connects the two sides:
- **Dining halls and cafés** post leftover food in under a minute, with how much there is, how it's stored, allergens and a pickup window.
- **Students** see every listing at once, ranked by how soon it expires and how well it fits them, and claim it. A claim holds the food for that student and gives them a pickup code.
- **Admins** keep it safe: they review reports, manage accounts, post campus events and alerts, and maintain the food-safety library the assistant answers from.

## Features

### For students
- **Live food feed** with a countdown on every listing (green, amber, red as time runs out). New food appears automatically.
- **Personal ranking:** a match score based on time left, the categories you like, what you've picked up before, and the amount of food, with a "why this ranks here" breakdown. Or sort by soonest to expire.
- **Allergen and diet filters:** food containing an allergen you avoid, or missing a diet you follow, is hidden from your feed.
- **Claim and pickup pass:** claiming holds the food for you and gives you a pickup code and QR code. Two students can never claim the same food.
- **Pick up or drop:** mark food as picked up, or drop a claim so it goes straight back to other students. Up to 2 active claims at a time.
- **AI details on every listing:** what the food is, whether it fits your allergens and diet, how to store and reheat it, with sources.
- **Report a problem** with a listing.

### For dining halls and cafés
- **Post food** with category, amount, weight, storage (room temp, cold, hot), allergens, diet tags, location and pickup window.
- **Describe it in your own words:** type something like "3 trays of chicken alfredo in the warmer" and the form fills itself in, flagging safety concerns.
- **Built-in safety rules:** hot food must be picked up within 2 hours, and the pickup window must end before the food expires.
- **Confirm pickups** by typing or scanning the student's code.
- **Mark no-shows** after the pickup window ends; the food goes back to the feed if it's still good.
- **Report a student** who claimed food (for example, a no-show).

### For admins
- **Trust and safety dashboard:** open reports, reports per day, the most common issues, and cafés and students ranked by risk.
- **Report queue:** resolve, send a warning (delivered to the person), dismiss, or block the account.
- **Account pages** for every student and café, with stats, activity, reports and warnings.
- **Accounts:** add accounts with a temporary password, give or remove admin access, block or unblock.
- **Events, alerts and promotions** shown to everyone, students only or cafés only.
- **Safety library:** add, edit, turn off or delete food-safety documents, and see questions the assistant couldn't answer.

### Assistant ("Ask LoopBite")
- A chat assistant on every page for questions about LoopBite, a specific listing, or food in general. It remembers the conversation.
- Food-safety answers come only from the safety library (USDA, FDA, CDC and LoopBite's own rules), with sources you can open. If the library doesn't cover a safety question, it says so instead of guessing.

### Accounts and security
- Sign up as a student or café, with **email confirmation** before you can sign in.
- Role-based access: each account only sees its own pages, checked on the server.
- Rate limits on sign-in, sign-up, the assistant and reports.
- Temporary passwords must be changed on first sign-in. Anyone can change their password from **Your account**.

## How the app flows

### 1. A café posts food
1. Sign in as a café and open **Post food**.
2. Describe the food in your own words and click **Fill in the form**, or fill it in yourself.
3. Check the details (especially allergens), set the pickup window, and post.
4. The listing appears instantly in every student's feed.

### 2. A student claims it
1. Sign in as a student. The feed shows food sorted by your match score.
2. Open **AI details** on a listing to check allergens, storage and reheating.
3. Click **Claim pickup**. The food is held for you, and you get a pickup pass with a code and QR code.
4. Can't make it? Click **Drop it** and the food goes back to everyone.

### 3. The pickup
1. The student shows their code at the counter.
2. The café confirms it on **Your listings** (or the student taps **I picked it up**).
3. If nobody comes, the café marks a **no-show** after the window ends and the food is relisted.

### 4. Keeping it safe
1. A student or café can **report a problem** from a listing or pickup pass.
2. The report appears immediately on the admin's **Trust and safety** dashboard.
3. The admin resolves it, sends a warning, or blocks the account. A blocked café's food disappears from the feed; a blocked student can't claim.

### 5. Asking questions
1. Anyone can click **Ask LoopBite** and ask, for example, "How long can I keep leftovers in the fridge?"
2. The answer cites the safety guidance it's based on.
3. Admins see unanswered questions in the **Safety library** and add documents to cover them.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Student | student@loopbite.app | loopbite |
| Student | ravi@loopbite.app | loopbite |
| Café (Baker Hall Dining) | donor@loopbite.app | loopbite |
| Café (Bean & Leaf Café) | cafe@loopbite.app | loopbite |
| Admin | admin@loopbite.app | admin-demo |

## Installation

### What you need
- **Node.js 20 or newer**
- **PostgreSQL 16 or newer** (local, or a hosted database like Neon)
- **Git**

### Step 1: Get the code
```bash
git clone https://github.com/lokvenkatesh/take-home.git
cd take-home/loopbite
```

### Step 2: Install packages
```bash
npm install
```

### Step 3: Create a database
For a local Postgres:
```bash
createdb loopbite
```

### Step 4: Add your settings
```bash
cp .env.example .env.local
```

Open `.env.local` and fill it in:

```
# Required
DATABASE_URL=postgresql://localhost:5432/loopbite
AUTH_SECRET=<run: openssl rand -base64 32>

# Optional: the assistant, AI details and AI form fill
ANTHROPIC_API_KEY=

# Optional: sending confirmation emails (Gmail with an app password works)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
MAIL_FROM=LoopBite <you@gmail.com>
APP_URL=http://localhost:3000
```

- Without `ANTHROPIC_API_KEY`, AI features fall back to built-in rules and the closest library passage.
- Without the SMTP settings, confirmation links are printed in the terminal instead of emailed.

### Step 5: Create the tables
```bash
npx drizzle-kit push
```

### Step 6: Load demo data and the safety library
```bash
npm run db:seed
```

This creates the demo accounts, sample listings, reports, events and the 14-document safety library. Running it again only resets the demo accounts; other accounts are kept.

### Step 7: Start the app
```bash
npm run dev
```

Open http://localhost:3000 and sign in with a demo account.

### Optional: create your own admin
```bash
npm run admin:create -- you@example.com "Your Name"
```

It prints a temporary password; you'll be asked to change it on first sign-in.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app locally |
| `npm run build` | Production build |
| `npm test` | Run the automated tests |
| `npm run test:race` | Two students claim the same food at once; exactly one should win |
| `npm run rag:eval` | Check the assistant finds the right safety document |
| `npm run rag:seed` | Load or refresh the safety library |
| `npm run db:seed` | Reset the demo accounts and sample data |
| `npm run admin:create -- email "Name"` | Create an admin account |

## Tech stack

Next.js 16 (TypeScript), PostgreSQL with Drizzle ORM, Tailwind CSS, Anthropic Claude API, Nodemailer, deployed on Vercel with Neon.
