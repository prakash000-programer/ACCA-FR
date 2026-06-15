# ACCA FR Notes & Learning Mobile App — Project Roadmap & Tasks

## Project Metadata
- **Project:** ACCA FR Notes & Learning Mobile App
- **Client:** ACCA Financial Reporting Notes Seller
- **Developer:** me
- **Target MVP:** July 8, 2026
- **Platform:** React Native + Expo (Android first), Next.js Admin Panel
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)

---

## Current Status
- UI screens are complete (built in Lovable)
- **Tech Stack:** TanStack Start + TanStack Router + React + TypeScript + Tailwind CSS + Shadcn UI + Supabase
- All routes exist as UI-only pages with no backend logic yet

### Existing Routes (UI complete, no backend):
- [ ] `/` (index - welcome/splash)
- [ ] `/auth` (login + register)
- [ ] `/verify` (device verification)
- [ ] `/home` (dashboard)
- [ ] `/notes` (notes library)
- [ ] `/notes/$id` (PDF viewer)
- [ ] `/quiz` (quiz screen)
- [ ] `/quiz/results` (quiz results)
- [ ] `/chat` (AI chatbot)
- [ ] `/discussion/$topic` (discussion threads)
- [ ] `/leaderboard` (leaderboard)
- [ ] `/progress` (progress tracker)
- [ ] `/notifications` (notifications)
- [ ] `/profile` (profile)
- [ ] `/referral` (referral system)
- [ ] `/revision` (quick revision summaries)
- [ ] `/subscription` (subscription/paywall)
- [ ] `/tasks` (personal to-do list)

---

## PHASE 1 — SUPABASE SETUP (Week 1)

### [x] Task 1.1 — Create Supabase Project
- Create new Supabase project
- Save URL and anon key in `.env` file
- Install `@supabase/supabase-js`
- Create `src/lib/supabase.ts` client file

### [x] Task 1.2 — Database Schema
Run this SQL script in your Supabase SQL editor to create all required tables:

```sql
-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  phone_number TEXT,
  college TEXT,
  course TEXT,
  year_of_study TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- device_registrations
CREATE TABLE public.device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_model TEXT,
  os_version TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan TEXT,
  start_date DATE,
  end_date DATE,
  manually_granted BOOLEAN DEFAULT FALSE,
  granted_by TEXT,
  price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- content
CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  chapter TEXT,
  topic TEXT,
  pdf_path TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- quizzes
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  topic TEXT,
  chapter TEXT,
  total_marks INT,
  time_limit INT, -- in seconds
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- quiz_questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_option TEXT CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  explanation TEXT
);

-- quiz_attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INT,
  total INT,
  answers JSONB,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  body TEXT,
  sent_by TEXT,
  target TEXT DEFAULT 'all', -- all/subscribed
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- study_tasks
CREATE TABLE public.study_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  chapter_tag TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  due_date DATE,
  notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### [x] Task 1.3 — Enable Row Level Security (RLS) on all tables
Write RLS policies so that:
- `users`: User can read/update own row only.
- `device_registrations`: User sees own device only.
- `subscriptions`: User sees own subscription only.
- `content`: All authenticated users can read published content.
- `quizzes`: All authenticated users can read published quizzes.
- `quiz_questions`: All authenticated users can read.
- `quiz_attempts`: User sees own attempts only.
- `comments`: All authenticated users can read; write own.
- `notifications`: All authenticated users can read.
- `study_tasks`: User sees own tasks only.

### [x] Task 1.4 — Supabase Storage Setup
- Create a private bucket: `acca-pdfs`
- Only admin service role can upload.
- Authenticated users can read via signed URLs (15-minute expiry).

---

## PHASE 2 — AUTHENTICATION (Week 1)

### [x] Task 2.1 — Connect `/auth` route to Supabase Auth
- Email + password sign up with Supabase Auth.
- Email + password sign in.
- OTP email verification on register.
- On success: insert a new row into the `public.users` table.
- Redirect to `/verify` after first login.

### [x] Task 2.2 — Device Fingerprinting on `/verify` route
- Install `expo-device` (or use `navigator.userAgent` for web testing).
- On `/verify`: Generate device fingerprint (`deviceId` + `model` + `osVersion`).
- Check `device_registrations` table for this user.
- If no record: Insert new device registration, redirect to `/home`.
- If record exists and matches: Redirect to `/home`.
- If record exists and does NOT match: Show blocked screen with a "Contact admin" message.

### [x] Task 2.3 — Subscription Check Middleware
- After device is verified, check `subscriptions` table for the user.
- If active subscription found: Allow navigation to `/home`.
- If no active subscription: Redirect to `/subscription` paywall.

### [x] Task 2.4 — Auth Session Persistence
- Store Supabase session in `localStorage`.
- Auto-refresh token on app load.
- Create a `useAuth()` hook returning: `user`, `session`, `loading`, `signOut`.
- Protect all routes except `/` and `/auth` with an auth guard.

---

## PHASE 3 — CORE CONTENT (Week 2)

### [x] Task 3.1 — Notes Library `/notes` route
- Fetch all published content from `content` table.
- Group by chapter using `reduce`.
- Render chapter accordion list.
- Each topic card shows title, chapter tag, and a "View" button.

### [x] Task 3.2 — PDF Viewer `/notes/$id` route
- On route load: Fetch content row by `id`.
- Call Supabase `createSignedUrl()` for `pdf_path` (900s / 15 min expiry).
- Render PDF using iframe/viewer with the signed URL.
- Add a "Protected" watermark overlay `div`.
- Disable right-click on the PDF container.
- Ensure no download link is exposed.

### [x] Task 3.3 — Revision Summaries `/revision` route
- Fetch published content grouped by chapter.
- For each topic, show an AI-generated summary card.
- "Mark as Revised" button updates local state or table.
- Filter tabs: `By Chapter` | `By Topic` | `Full Exam`.

---

## PHASE 4 — QUIZ ENGINE (Week 2)

### [ ] Task 4.1 — Quiz List and Start `/quiz` route
- Fetch published quizzes from `quizzes` table.
- Show quiz cards: title, topic, question count, time limit.
- "Start Quiz" button navigates to quiz with a `quizId` parameter.

### [ ] Task 4.2 — Quiz Attempt `/quiz` route (Active State)
- Fetch `quiz_questions` for selected `quizId`.
- Timer countdown using `useEffect` + `setInterval`.
- Track selected answers in `useState`.
- On option select: Highlight selected card.
- "Next" progresses through questions.
- On the last question: Show "Submit Quiz".

### [ ] Task 4.3 — Auto-grading and Results `/quiz/results` route
- On submit: Compare answers against `correct_option`.
- Calculate score and total.
- Insert a new row into `quiz_attempts` table.
- Navigate to `/quiz/results` with the score data.
- Show score ring, breakdown, and correct/wrong status per question.

### [ ] Task 4.4 — Leaderboard `/leaderboard` route
- Query `quiz_attempts` joined with `users`.
- Group by user, sum scores.
- Order by total score descending.
- Render top 3 podium + full ranked list.
- Highlight current user's row.

---

## PHASE 5 — ENGAGEMENT FEATURES (Week 3)

### [ ] Task 5.1 — AI Chatbot `/chat` route
- Create `src/lib/claude.ts` API wrapper.
- Call Anthropic `/v1/messages` endpoint.
- System prompt: ACCA FR subject expert, only answer ACCA FR questions, cite IAS/IFRS standards.
- Store conversation history in `useState` array.
- Render user and AI bubbles.
- Suggested question chips call API with preset prompt.

### [ ] Task 5.2 — Discussion Threads `/discussion/$topic` route
- Fetch comments for `content_id` from URL parameter.
- Render threaded comments (parent + replies).
- Add comment form: textarea + Submit button.
- Insert into `comments` table with `user_id`.
- Reply button sets `parent_id`.
- Real-time updates using Supabase `.on()` subscriptions.

### [ ] Task 5.3 — Progress Tracker `/progress` route
- Fetch all `quiz_attempts` for the current user.
- Calculate: total quizzes done, average score, best/worst topics.
- Render progress ring for overall completion.
- List weak topics (avg score < 60%) in red cards.
- List strong topics (avg score > 80%) in green cards.
- Study streak: Count consecutive days with a `quiz_attempt`.

### [ ] Task 5.4 — Personal Tasks `/tasks` route
- Fetch `study_tasks` for the current user from Supabase.
- Render task cards with checkbox, priority dot, due date.
- "Add Task" modal: `title`, `chapter_tag`, `priority`, `due_date`, `notes`.
- Insert into `study_tasks` on submit.
- Checkbox toggle: Update `is_completed` + `completed_at`.
- Delete: Remove row from `study_tasks`.
- Filter tabs: `All` | `Today` | `Upcoming` | `Completed`.
- Mobile gestures: Swipe left to delete, swipe right to complete.

### [ ] Task 5.5 — Notifications `/notifications` route
- Fetch all notifications ordered by `sent_at` DESC.
- Render notification cards with icon based on type.
- Mark as read state in `localStorage` or table.
- Unread: Highlight with blue left border.

### [ ] Task 5.6 — Referral System `/referral` route
- Generate unique referral code per user (stored in `users.referral_code`).
- Display referral link: `app.domain.com/ref/[code]`.
- "Copy to Clipboard" button.
- Count referrals made by this user.
- Share via Web Share API.

---

## PHASE 6 — SUBSCRIPTION & PAYMENT (Week 3)

### [ ] Task 6.1 — Subscription Paywall `/subscription` route
- Fetch current pricing from subscriptions config.
- Display plan details and price.
- "Pay via UPI" button integrates Razorpay checkout.
- On payment success: Insert subscription row for user, and update `users.subscription_status` to `'active'`.
- Redirect to `/verify` after payment.

### [ ] Task 6.2 — Razorpay Integration
- Install Razorpay SDK.
- Create payment order on backend (Supabase Edge Function).
- Open Razorpay checkout modal.
- On success callback: Verify payment signature.
- Update subscription in database.

---

## PHASE 7 — ADMIN PANEL (Week 4)
*Build as a separate Next.js 14 project*

### [ ] Task 7.1 — Admin Auth
- Supabase Auth with admin email whitelist.
- Protect all `/admin` routes.
- Admin login page at `/admin/login`.

### [ ] Task 7.2 — Content Management `/admin/notes`
- Upload PDF to Supabase Storage bucket `acca-pdfs`.
- Insert row into `content` table.
- Chapter + topic dropdowns.
- Publish/unpublish toggle.
- Delete content.

### [ ] Task 7.3 — Quiz Management `/admin/quizzes`
- Create quiz with title, topic, chapter, time limit.
- Add questions with 4 options, correct answer, and explanation.
- Publish/unpublish toggle.
- Edit and delete quizzes.

### [ ] Task 7.4 — User Management `/admin/users`
- List all users from `users` table.
- View subscription status per user.
- Grant subscription: Insert/update `subscriptions` table, setting `manually_granted = true`.
- Revoke subscription: Update `subscription_status`.
- Reset device: Delete row from `device_registrations`.
- Block user: Update `users` table with `blocked` flag.

### [ ] Task 7.5 — Subscription Management `/admin/subscriptions`
- List all subscriptions with status.
- Manual grant/revoke toggles.
- Update pricing: Update configuration table.
- Show statistics: active count, expired count, manual count.

### [ ] Task 7.6 — Notifications `/admin/notifications`
- Form: `title`, `body`, `target` (all/subscribed).
- Send via Expo Push Notifications API.
- Store sent notification in `notifications` table.
- View sent notifications log.

### [ ] Task 7.7 — Analytics `/admin/analytics`
- Total students count.
- Active subscriptions count.
- Quiz attempts per day chart (using Recharts).
- New users per day chart.
- Top 10 students by score.
- Revenue total from subscriptions.

---

## PHASE 8 — ANDROID BUILD (Week 4)

### [ ] Task 8.1 — Project Conversion Strategy
- **Choice for MVP:** Option A (Capacitor wrapper around Web App).
- This is the fastest route to bundle the TanStack Start + Vite app as a hybrid android application.

### [ ] Task 8.2 — Capacitor Setup
- Run commands:
  ```bash
  npm install @capacitor/core @capacitor/android @capacitor/device
  npx cap init "ACCA FR Mastery" "com.accafr.app" --web-dir=dist/client
  npx cap add android
  ```
- Build web app: `npm run build`
- Sync assets to android project: `npx cap sync`
- Open in Android Studio: `npx cap open android`

### [ ] Task 8.3 — Screenshot Protection (Android)
- Install `capacitor-plugin-secure-screen` or add the secure flag in `MainActivity.java`:
  ```java
  import android.view.WindowManager;
  // Inside onCreate:
  getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
  ```
- Test: Attempt to screenshot the PDF viewer screen and verify a black/blocked screen appears.

### [ ] Task 8.4 — Generate APK
- Build signed APK in Android Studio.
- Setup GitHub Actions for automated APK builds (optional but recommended).
- Test on physical Android devices.

---

## Environment Variables Needed
Create a `.env` file at the root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_claude_api_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret # Server/Edge functions only
```

---

## Dependencies to Install
```bash
# Supabase & Auth
npm install @supabase/supabase-js

# Mobile wrapping
npm install @capacitor/core @capacitor/android @capacitor/device

# PDF Viewing & Canvas
npm install react-pdf
```

---

## Definition of Done for MVP (July 8, 2026)
- [ ] User can register, verify device, and login.
- [ ] Subscription check blocks unsubscribed users.
- [ ] Notes library shows PDFs with screenshot protection active.
- [ ] Quiz engine works with auto-grading.
- [ ] AI chatbot answers ACCA FR questions citing standards.
- [ ] Admin panel allows notes uploading, quiz creation, and user management.
- [ ] Android APK installable and successfully tested on physical device.
- [ ] 10 initial students onboarded successfully.
