# UCC IP Management System - Project Structure Analysis

## Project Overview
This is a React + TypeScript application built with Vite, using Supabase for backend services and Tailwind CSS for styling. It's an Intellectual Property Management System for the University of Caloocan City.

**Tech Stack:**
- **Frontend:** React 18.3, React Router 7.9, TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS (extends default theme, no custom config)
- **Icons:** Lucide React
- **Backend:** Supabase (PostgreSQL + Auth)
- **Testing:** Vitest

---

## 1. PUBLIC PAGES

Public pages are accessible **without authentication** and render at the root level (`/`).

### Public Page List:

| Page | Route | File | Purpose |
|------|-------|------|---------|
| **Landing Page** | `/` | `src/pages/LandingPage.tsx` | Homepage with product overview |
| **Login Page** | `/login` | `src/pages/LoginPage.tsx` | User login form |
| **Register Page** | `/register` | `src/pages/RegisterPage.tsx` | User registration form with department selection |
| **Auth Callback** | `/auth/callback` | `src/pages/AuthCallbackPage.tsx` | OAuth/email verification redirect handler |
| **Certificate Verify** | `/verify/:trackingId` | `src/pages/CertificateVerifyPage.tsx` | Public certificate verification viewer |
| **Disclosure Verify** | `/verify-disclosure/:trackingId` | `src/pages/DisclosureVerifyPage.tsx` | Public disclosure document verification viewer |

### Landing Page Details (LandingPage.tsx)

**Hardcoded Content:**
- Navigation bar with "UCC IP Office" branding
- Hero section with value proposition
- Feature cards (3 columns):
  1. "Easy Submissions" - FileText icon, green accent
  2. "Secure Workflow" - Shield icon, green accent  
  3. "Track Progress" - TrendingUp icon, purple accent
- "How It Works" section with 4 numbered steps:
  1. Register
  2. Submit IP
  3. Review Process
  4. Get Certificate
- IP Categories section with hardcoded categories:
  - Patents
  - Copyright
  - Trademarks
  - Industrial Design
  - Utility Models
- Footer with "University of Caloocan City Intellectual Property Office" and tagline "Protecting Innovation, Promoting Excellence"

**Styling:**
- Gradient background: `from-blue-50 to-indigo-50`
- Color scheme: Blue primary (`#blue-600`), white cards, green accents (`#green-600`), purple accents (`#purple-600`)
- Responsive grid layouts (`md:grid-cols-3`, `md:grid-cols-4`)

---

## 2. ADMIN PAGES

Admin pages are **protected routes** accessible only to authenticated users with `admin` role. All are nested under `/dashboard/*`.

### Admin Page List:

| Page | Route | File | Purpose |
|------|-------|------|---------|
| **User Management** | `/dashboard/users` | `src/pages/UserManagement.tsx` | Create, edit, delete users; assign roles and departments |
| **Admin Dashboard** | `/dashboard` or `/dashboard/analytics` | `src/pages/AdminDashboard.tsx` | Analytics, stats, activity logs |
| **All Records** | `/dashboard/records` | `src/pages/AllRecordsPage.tsx` | View all IP records system-wide |
| **Legacy Records** | `/dashboard/legacy-records` | `src/pages/LegacyRecordsPage.tsx` | Manage legacy/historical IP records |
| **Add Legacy Record** | `/dashboard/legacy-records/new` | `src/pages/AddLegacyRecordPage.tsx` | Create new legacy record |
| **Legacy Record Detail** | `/dashboard/legacy-records/:id` | `src/pages/LegacyRecordDetailPage.tsx` | View/edit individual legacy record |
| **Department Management** | `/dashboard/departments` | `src/pages/DepartmentManagementPage.tsx` | Manage university departments |
| **Assignment Management** | `/dashboard/assignments` | `src/pages/AssignmentManagementPage.tsx` | Assign supervisors/evaluators to submissions |

### Admin Dashboard Details (AdminDashboard.tsx)

**Data Displayed:**
- User statistics (total users, applicants, supervisors, evaluators count)
- Submission statistics (total, pending, approved, rejected)
- Category statistics (IP categories with counts)
- Recent activity logs (10 most recent actions)

**UI Components:**
- Stats cards showing key metrics
- Charts/visualizations for categories and status
- Activity feed showing user actions

---

## 3. ROLE-BASED DASHBOARDS

Different authenticated users see different dashboards based on their role:

| Role | Route | Component | File |
|------|-------|-----------|------|
| **Applicant** | `/dashboard` | ApplicantDashboard | `src/pages/ApplicantDashboard.tsx` |
| **Supervisor** | `/dashboard` or `/dashboard/review` | SupervisorDashboard | `src/pages/SupervisorDashboard.tsx` |
| **Evaluator** | `/dashboard` or `/dashboard/evaluations` | EvaluatorDashboard | `src/pages/EvaluatorDashboard.tsx` |
| **Admin** | `/dashboard` or `/dashboard/analytics` | AdminDashboard | `src/pages/AdminDashboard.tsx` |

### Applicant Dashboard Features:
- View personal submissions
- Create new submissions (`/dashboard/submit` → `NewSubmissionPage.tsx`)
- View submission details (`/dashboard/submissions/:id` → `SubmissionDetailPage.tsx`)
- Manage draft submissions
- Track approval status

### Supervisor Dashboard Features:
- Review assigned submissions
- Approve/reject/request revisions
- View submission history
- Process tracking wizard for each submission

### Evaluator Dashboard Features:
- View assigned evaluations
- Submit evaluation results

---

## 4. SHARED LAYOUT COMPONENTS

### DashboardLayout (src/components/DashboardLayout.tsx)

**Layout Structure:**
```
┌─────────────────────────────────────────────────┐
│  Top Bar (fixed, 16px height)                   │
│  Logo | Sidebar Toggle | Notifications | User   │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│  Sidebar     │  Main Content (p-6)              │
│  (fixed,     │  (max-w-7xl mx-auto)             │
│   w-64)      │                                  │
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

**Features:**
- **Fixed top navigation bar** (white, border-bottom)
  - Logo and "UCC IP Office" branding
  - Hamburger menu toggle (mobile only)
  - Notification center
  - User profile display (avatar + name + role)
  - Sign out button

- **Fixed left sidebar** (desktop) / Collapsible (mobile)
  - Width: 16rem (w-64)
  - Background: white with border
  - Role-based navigation items filtered from hardcoded `navItems` array
  - Active link highlighting: `bg-blue-50 text-blue-600`
  - Sign out button at bottom

- **Main content area**
  - Background: light gray (`bg-gray-50`)
  - Padding: p-6
  - Max width: 7xl with centered alignment
  - Children rendered here

**Navigation Items** (filtered by user role):
```javascript
const navItems = [
  { Dashboard, icon: LayoutDashboard, roles: ['applicant', 'supervisor', 'evaluator', 'admin'] },
  { My Submissions, path: /dashboard/submissions, roles: ['applicant'] },
  { New Submission, path: /dashboard/submit, roles: ['applicant'] },
  { Review Queue, path: /dashboard/review, roles: ['supervisor'] },
  { Evaluations, path: /dashboard/evaluations, roles: ['evaluator'] },
  { Users, path: /dashboard/users, roles: ['admin'] },
  { All Records, path: /dashboard/records, roles: ['admin'] },
  { Legacy Records, path: /dashboard/legacy-records, roles: ['admin'] },
  { Assignments, path: /dashboard/assignments, roles: ['admin'] },
  { Departments, path: /dashboard/departments, roles: ['admin'] },
  { Analytics, path: /dashboard/analytics, roles: ['admin'] },
  { Settings, path: /dashboard/settings, roles: ['applicant', 'supervisor', 'evaluator', 'admin'] },
]
```

### ProtectedRoute (src/components/ProtectedRoute.tsx)

**Functionality:**
- Wrapper component for authenticated routes
- Checks three conditions:
  1. User authentication status
  2. Email verification status
  3. User profile existence
  4. (Optional) Role-based access control via `allowedRoles` prop

**Redirects:**
- Unauthenticated → `/login`
- Email not verified → Shows in-page message with back button
- No profile → `/login`
- Unauthorized role → `/unauthorized` page

### NotificationCenter (src/components/NotificationCenter.tsx)

- Located in top navigation bar
- Displays user notifications
- Shows unread notification count

---

## 5. THEME-RELATED STYLES

### Tailwind Configuration

**File:** `tailwind.config.js`
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},  // No custom theme extensions
  },
  plugins: [],   // No custom plugins
};
```

**Conclusion:** Using **default Tailwind color palette** with no customizations.

### Global Styles

**File:** `src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Simple Tailwind integration, no custom CSS classes or overrides.

### Color Scheme Used Throughout

| Color | Usage | Hex/Tailwind |
|-------|-------|--------------|
| Blue-600 | Primary brand color, buttons, active states | `#2563EB` |
| Blue-50 | Light backgrounds, active nav items | `#EFF6FF` |
| Gray-900 | Text headings | Default black |
| Gray-700 | Secondary text | Default gray |
| Gray-600 | Tertiary text, descriptions | Medium gray |
| Gray-400 | Icons, borders | Light gray |
| Gray-50 | Main page backgrounds | Very light gray |
| Green-600 | Success states, feature icons | `#16A34A` |
| Green-100 | Light success backgrounds | `#DCFCE7` |
| Red-600 | Danger states, rejection | `#DC2626` |
| Red-50 | Error message backgrounds | `#FEF2F2` |
| Purple-600 | Secondary feature icons | `#9333EA` |
| Purple-100 | Light purple backgrounds | `#F3E8FF` |
| Indigo-50 | Gradient backgrounds | `#EEF2FF` |

### Typography

- **Font:** System default (no custom fonts imported)
- **Font Weights:**
  - `font-bold` (700) - Page titles, primary headings
  - `font-semibold` (600) - Section titles, card headings
  - `font-medium` (500) - Button text, labels
  - Regular (400) - Body text

- **Sizes:**
  - `text-5xl` - Hero section titles
  - `text-3xl` - Section headings
  - `text-xl` - Card titles, primary text
  - `text-lg` - Secondary headings
  - `text-sm` - Helper text, captions
  - `text-xs` - Metadata, timestamps

### Component Patterns

**Card Components:**
- Background: `bg-white`
- Border: `rounded-xl` or `rounded-lg`
- Shadow: `shadow-lg` or `shadow-md`
- Padding: `p-8` or `p-6`

**Buttons:**
- Primary: `bg-blue-600 text-white hover:bg-blue-700`
- Secondary: `text-gray-700 hover:bg-gray-50`
- Danger: `hover:bg-red-50 hover:text-red-600`
- Disabled: Implied via `loading` state opacity

**Input Fields:**
- Border: `border border-gray-300`
- Focus: `focus:ring-2 focus:ring-blue-500 focus:border-transparent`
- Padding: `px-4 py-3` or `py-2`
- Icons: Lucide icons positioned with `absolute` in relative parent

**Navigation:**
- Active: `bg-blue-50 text-blue-600 font-medium`
- Hover: `hover:bg-gray-50`
- Padding: `px-4 py-3`

**Grids:**
- `grid md:grid-cols-2 lg:grid-cols-3 gap-6`
- Responsive breakpoints: `md:` and `lg:` prefixes

---

## 6. ROUTING STRUCTURE

**Root App.tsx structure:**

```
/                                    → LandingPage (public)
/login                               → LoginPage (public)
/register                            → RegisterPage (public)
/auth/callback                       → AuthCallbackPage (public)
/verify/:trackingId                  → CertificateVerifyPage (public)
/verify-disclosure/:trackingId       → DisclosureVerifyPage (public)

/dashboard/*                         → Protected Route
  ├─ /                             → DashboardRouter (role-based)
  ├─ /submit                       → NewSubmissionPage (applicant)
  ├─ /submissions                  → ApplicantDashboard (applicant)
  ├─ /submissions/:id              → SubmissionDetailPage (applicant)
  ├─ /review                       → SupervisorDashboard (supervisor)
  ├─ /evaluations                  → EvaluatorDashboard (evaluator)
  ├─ /users                        → UserManagement (admin)
  ├─ /records                      → AllRecordsPage (admin)
  ├─ /legacy-records               → LegacyRecordsPage (admin)
  ├─ /legacy-records/new           → AddLegacyRecordPage (admin)
  ├─ /legacy-records/:id           → LegacyRecordDetailPage (admin)
  ├─ /assignments                  → AssignmentManagementPage (admin)
  ├─ /departments                  → DepartmentManagementPage (admin)
  ├─ /analytics                    → AdminDashboard (admin)
  ├─ /settings                     → SettingsPage (all authenticated)

/unauthorized                        → Error page (403)
/*                                  → Navigate to / (catch-all)
```

---

## 7. AUTHENTICATION FLOW

**AuthContext (src/contexts/AuthContext.tsx):**

- Provides:
  - `user` - Supabase auth user
  - `profile` - Database user profile (role, department, etc.)
  - `loading` - Auth initialization state
  - `signIn(email, password)` - Login method
  - `signUp(email, password, fullName, affiliation)` - Registration method
  - `signOut()` - Logout method
  - `refreshProfile()` - Reload user profile

- Syncs auth state across tabs/windows
- Handles session persistence

**Login Flow:**
1. User enters email/password on `/login`
2. `signIn()` authenticates via Supabase
3. Fetch user profile from `users` table
4. Redirect to `/dashboard` (role-based dashboard appears)

**Registration Flow:**
1. User fills form on `/register` with email, password, name, department
2. `signUp()` creates auth user via edge function
3. Email verification required (step shows "/register?step=email-sent")
4. User confirms email
5. Redirects to `/login` or auto-login to dashboard

---

## 8. KEY OBSERVATIONS

### Hardcoded Elements on Landing Page:
1. **Text Content:**
   - Hero headline: "University Intellectual Property Management System"
   - Subtitle: "Streamline your intellectual property submissions, evaluations, and approvals..."
   - Feature descriptions (3 cards)
   - "How It Works" step text
   - IP categories list (5 items)
   - Footer text

2. **Branding:**
   - Logo text: "UCC IP Office" (appears in nav and sidebar)
   - Footer: "University of Caloocan City Intellectual Property Office"
   - Tagline: "Protecting Innovation, Promoting Excellence"

3. **Navigation:**
   - Login button (top right)
   - Register button (top right + hero CTA)
   - "Get Started" button

### Theme Observations:
- **No custom Tailwind config** - Uses default palette entirely
- **No custom CSS files** - Only Tailwind @directives imported
- **Consistent color usage** - Blue for primary, gray for UI structure
- **Icon library** - Lucide React for all icons (GraduationCap, FileText, Shield, etc.)
- **Responsive design** - Uses Tailwind's `md:` and `lg:` breakpoints
- **No dark mode** - Single light theme throughout

### Layout Patterns:
- **Landing Page:** Full-width gradient background with centered sections
- **Public Auth Pages:** Centered card layout with gradient background
- **Authenticated Pages:** DashboardLayout wrapper with fixed sidebar + top nav
- **Public Verification Pages:** Centered, minimal layout with lock icon for security

---

## 9. COMPONENT INVENTORY

### Page Components (20 total)
1. LandingPage.tsx
2. LoginPage.tsx
3. RegisterPage.tsx
4. AuthCallbackPage.tsx
5. ApplicantDashboard.tsx
6. NewSubmissionPage.tsx
7. SupervisorDashboard.tsx
8. EvaluatorDashboard.tsx
9. AdminDashboard.tsx
10. UserManagement.tsx
11. SubmissionDetailPage.tsx
12. AllRecordsPage.tsx
13. LegacyRecordsPage.tsx
14. AddLegacyRecordPage.tsx
15. LegacyRecordDetailPage.tsx
16. AssignmentManagementPage.tsx
17. DepartmentManagementPage.tsx
18. SettingsPage.tsx
19. CertificateVerifyPage.tsx
20. DisclosureVerifyPage.tsx

### Reusable Components (19 total)
1. DashboardLayout.tsx - Main authenticated app wrapper
2. ProtectedRoute.tsx - Auth guard wrapper
3. NotificationCenter.tsx - User notifications
4. AddLegacyRecordModal.tsx
5. AdminDepartmentManagement.tsx
6. CertificateManager.tsx
7. CompletionButton.tsx
8. DocumentGenerator.tsx
9. DocumentUploadSection.tsx
10. EditSubmissionModal.tsx
11. FullDisclosureManager.tsx
12. LegacyRecordBadge.tsx
13. LegacyRecordDetailModal.tsx
14. MaterialsRequestAction.tsx
15. MaterialsSubmissionForm.tsx
16. MaterialsView.tsx
17. ProcessTrackingWizard.tsx
18. RevisionBanner.tsx
19. TitleDuplicateChecker.tsx

---

## SUMMARY TABLE

| Aspect | Details |
|--------|---------|
| **Framework** | React 18 + TypeScript + Vite |
| **Public Routes** | 6 (Landing, Login, Register, Auth Callback, 2 Verify pages) |
| **Protected Routes** | 14 (Dashboard with sub-routes) |
| **Admin Sections** | 8 pages (Users, Records, Legacy Records, Departments, Assignments, Analytics) |
| **Styling** | Tailwind CSS (default theme, no customization) |
| **Icons** | Lucide React |
| **Primary Color** | Blue-600 (#2563EB) |
| **Layout Pattern** | Top nav + left sidebar for authenticated pages |
| **Auth Method** | Supabase Auth + custom user profiles |
| **Database** | Supabase PostgreSQL |

