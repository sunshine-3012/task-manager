# TaskFlow - Modern Full-Stack Task Manager

A responsive, high-performance task management web application built with **Vanilla JavaScript, HTML5, CSS3**, a **Node.js + Express** REST API, and **Supabase** for PostgreSQL database management, authentication, and Row Level Security (RLS).

---

## 🌟 Features

- **Supabase Authentication**: User registration, login, logout, password reset, and persistent sessions.
- **Strict Row Level Security (RLS)**: PostgreSQL policies guarantee users can only read, insert, update, and delete their own tasks and categories.
- **Productivity Dashboard**:
  - Live statistics: Total Tasks, Pending, In-Progress, Completed, Overdue, and Due Today.
  - Interactive radial completion percentage ring.
  - 7-day weekly productivity chart comparing created vs. completed tasks.
- **Task Organization & Management**:
  - Create, view, update, and delete tasks.
  - Quick completion checkbox with strikethrough styling and animations.
  - Categorization and tagging with customizable color tags.
  - Priority levels: *Low*, *Medium*, *High*, and *Urgent*.
  - Due date tracking with automatic overdue alerts and pulse indicators.
- **Search, Filter & Sort**:
  - Instant client/server search across title, description, and categories.
  - Filter pills: *All*, *Pending*, *In Progress*, *Completed*, *Overdue*.
  - Sorting options: *Newest*, *Oldest*, *Due Date*, *Priority*, *Title*, and *Recently Updated*.
- **Modern UI & Aesthetics**:
  - Dark Mode by default with seamless Light Mode toggle (persisted in `localStorage`).
  - Toast notifications, confirmation modals, loading spinners, and empty-state placeholders.
  - Responsive layout with desktop sidebar and mobile slide-out drawer menu.

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: HTML5, CSS3 (Custom Design System with CSS Variables), Vanilla JavaScript (No React/Vue/Angular).
- **Backend**: Node.js & Express.js REST API.
- **Database & Auth**: Supabase (PostgreSQL with RLS, triggers, indexes, and GoTrue Auth).
- **Security**: JWT Bearer token verification via Express middleware, per-request scoped Supabase clients, input sanitization, and strict environment variable protection.

---

## 📁 Project Structure

```text
taskmanager/
├── server/
│   ├── server.js              # Express app entry point & static asset serving
│   ├── supabase.js            # Supabase client initializer & scoped client factory
│   ├── routes/
│   │   ├── tasks.js           # REST API: /api/tasks (CRUD, stats, filters)
│   │   └── users.js           # REST API: /api/users (profile & categories)
│   ├── middleware/
│   │   └── auth.js            # JWT Bearer token authentication middleware
│   └── utils/
│       └── validation.js      # Input validation & sanitization
│
├── public/
│   ├── index.html             # Landing page with session-redirect
│   ├── login.html             # Login & Forgot Password page
│   ├── register.html          # User registration page
│   ├── dashboard.html         # Main dashboard, task board & modals
│   ├── css/
│   │   └── style.css          # Design system, CSS variables & themes
│   └── js/
│       ├── config.js          # Dynamic Supabase initialization & theme manager
│       ├── api.js             # Authenticated REST client wrapper
│       ├── auth.js            # Supabase auth methods (login, register, reset)
│       ├── dashboard.js       # Dashboard stats & weekly chart visualizer
│       └── tasks.js           # Task list rendering, filters, CRUD & toasts
│
├── supabase/
│   └── schema.sql             # SQL schema, RLS policies, triggers & indexes
│
├── .env                       # Local secrets (ignored in git)
├── .env.example               # Template environment configuration
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Step-by-Step Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Click **New Project**, choose an organization, provide a project name (e.g., `taskflow`), choose a database password, and select your preferred region.
3. Wait 1-2 minutes for your project to initialize.

### 2. Run the Database Schema

1. In your Supabase dashboard, click **SQL Editor** from the left navigation.
2. Click **New Query**.
3. Open [`supabase/schema.sql`](file:///c:/Users/ENET21/taskmanager/supabase/schema.sql) in this repository, copy its entire contents, and paste them into the SQL editor.
4. Click **Run**.
5. This script creates:
   - `public.profiles` table with automatic triggers on user signup.
   - `public.categories` table with default tags (*Work*, *Personal*, *Urgent*, *Learning*).
   - `public.tasks` table with check constraints and performance indexes.
   - Row Level Security (RLS) policies ensuring users only see their own data.

### 3. Get Your Supabase Credentials

1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon) -> **API**.
2. Find:
   - **Project URL**: e.g., `https://xyzprojectid.supabase.co`
   - **Project API Keys**:
     - `anon` `public`: The public anon key.
     - `service_role` `secret`: The private service role key.

### 4. Configure Authentication in Supabase

1. In the Supabase dashboard, navigate to **Authentication** -> **Providers** -> **Email**.
2. Ensure **Enable Email provider** is turned **ON**.
3. *(Optional for testing)*: Under **Authentication** -> **URL Configuration**, set **Site URL** to `http://localhost:3000`. You can also disable **Confirm email** under **Authentication -> Providers -> Email** if you want new registrations to log in immediately without waiting for an email confirmation link.

### 5. Configure Local Environment Variables

1. Open `.env` in the root of your project (or copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
2. Fill in your credentials:
   ```env
   PORT=3000
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

> **Security Note:**
> - `SUPABASE_URL` and `SUPABASE_ANON_KEY` are safe for frontend communication because database access is secured by PostgreSQL Row Level Security (RLS).
> - `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies and **must never be exposed to the browser or committed to version control**.

### 6. Install Dependencies & Start the Server

1. Open your terminal in the project directory:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   *(Or for production: `npm start`)*

3. Open your browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

---

## 📡 REST API Reference

All `/api/tasks` and `/api/users` routes require a valid Supabase JWT sent in the HTTP header:
`Authorization: Bearer <jwt_access_token>`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Returns public `{ supabaseUrl, supabaseAnonKey }` safely |
| `GET` | `/api/health` | Server health and configuration status |
| `GET` | `/api/tasks` | Get user tasks (supports `search`, `status`, `priority`, `category`, `timeframe`, `sortBy`, `sortOrder`) |
| `GET` | `/api/tasks/stats` | Dashboard statistics & weekly productivity data |
| `GET` | `/api/tasks/:id` | Get single task by ID |
| `POST` | `/api/tasks` | Create a new task (body: `title`, `description`, `status`, `priority`, `category`, `due_date`) |
| `PUT` | `/api/tasks/:id` | Update an existing task |
| `PATCH` | `/api/tasks/:id/complete` | Toggle task completion status |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/users/profile` | Retrieve logged-in user profile |
| `PUT` | `/api/users/profile` | Update profile (`full_name`, `theme_preference`) |
| `GET` | `/api/users/categories` | Retrieve user categories |
| `POST` | `/api/users/categories` | Create custom category (`name`, `color`) |
| `DELETE` | `/api/users/categories/:id`| Remove custom category |

---

## 🔒 Security Best Practices Implemented

1. **Defense-in-Depth Authentication**: The backend verifies incoming JWT tokens with Supabase Auth before processing any request.
2. **PostgreSQL Row Level Security (RLS)**: Scoped Supabase client passes the caller's JWT directly to PostgreSQL, where `auth.uid() = user_id` enforces access control at the database level.
3. **No Blind Trust**: `user_id` is derived strictly from the verified session token, never from user-supplied JSON bodies.
4. **Input Sanitization**: Strings and inputs are validated and sanitized to prevent XSS.
5. **Secret Protection**: `.env` is included in `.gitignore`. Service role key is kept isolated on the server.
