/**
 * dashboardRouteConfig.tsx
 *
 * SINGLE SOURCE OF TRUTH for all /dashboard routes.
 *
 * Rules:
 *  - Every dashboard route MUST be listed here.
 *  - `path` is the relative React Router path used inside the /dashboard/* outlet.
 *    "/" = the /dashboard index; all others are relative (no leading slash).
 *  - `allowedRoles` drives BOTH route guards (ProtectedRoute) AND sidebar
 *    rendering (DashboardLayout).  Changing one automatically changes the other.
 *  - `nav` present  →  item appears in sidebar for users whose role is in allowedRoles.
 *  - Routes without `nav` are still registered and protected but invisible in nav.
 *
 * Do NOT add nav items in DashboardLayout directly. Add them here instead.
 */
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  ClipboardList,
  Clock,
  FileText,
  Globe,
  LayoutDashboard,
  PieChart,
  Settings,
  Star,
  UserCheck,
  Users,
} from 'lucide-react';

// ── Page components ──────────────────────────────────────────────────────────
import { AdminBrandingSettingsPage } from '@pages/AdminBrandingSettingsPage';
import { AdminDashboard } from '@pages/AdminDashboard';
import { AddLegacyRecordPage } from '@pages/AddLegacyRecordPage';
import { AllRecordsPage } from '@pages/AllRecordsPage';
import { ApplicantDashboard } from '@pages/ApplicantDashboard';
import { AssignmentManagementPage } from '@pages/AssignmentManagementPage';
import { CMSPageEditor } from '@pages/CMSPageEditor';
import { DeletedArchivePage } from '@pages/DeletedArchivePage';
import { DepartmentManagementPage } from '@pages/DepartmentManagementPage';
import { AdminSLAManagement } from '@pages/AdminSLAManagement';
import { EvaluatorDashboard } from '@pages/EvaluatorDashboard';
import { LegacyRecordDetailPage } from '@pages/LegacyRecordDetailPage';
import { LegacyRecordsPage } from '@pages/LegacyRecordsPage';
import { NewSubmissionPage } from '@pages/NewSubmissionPage';
import { PageSectionsManagement } from '@pages/PageSectionsManagement';
import { PublicPagesManagement } from '@pages/PublicPagesManagement';
import { SettingsPage } from '@pages/SettingsPage';
import { SubmissionDetailPage } from '@pages/SubmissionDetailPage';
import { SupervisorDashboard } from '@pages/SupervisorDashboard';
import { UserManagement } from '@pages/UserManagement';

// Re-export DashboardHome so consumers can import from one place
import { DashboardHome } from '../dashboard/DashboardHome';
export { DashboardHome };

// ── Types ─────────────────────────────────────────────────────────────────────

/** Re-exported from database.types for convenience. */
export type UserRole = 'applicant' | 'supervisor' | 'evaluator' | 'admin';

export interface NavConfig {
  /** Sidebar display label. */
  label: string;
  /** Lucide icon component shown next to the label. */
  icon?: LucideIcon;
  /**
   * Logical grouping used to render section separators.
   * 'main'  – shown for all applicable roles.
   * 'admin' – shown in the admin section with optional divider.
   */
  group?: 'main' | 'admin';
  /** Lower numbers appear first.  Use multiples of 10 to allow insertion. */
  order?: number;
}

/** Shape of a single dashboard route entry. */
export interface DashboardRouteConfig {
  /**
   * React Router path **relative** to the /dashboard/* outlet.
   *
   * - `"/"` matches exactly /dashboard (the index).
   * - `"submissions"` matches /dashboard/submissions.
   * - `"submissions/:id"` matches /dashboard/submissions/:id.
   *
   * Do NOT include a leading slash except for the index route `"/"`.
   */
  path: string;

  /**
   * The page component to render.
   * Must accept no required props.
   */
  component: ComponentType<object>;

  /**
   * Which roles may visit this route.
   * ProtectedRoute will redirect others to /dashboard.
   */
  allowedRoles: UserRole[];

  /**
   * When present the route produces a sidebar nav item.
   * The nav link href is derived as:
   *   path === "/" ? "/dashboard" : `/dashboard/${path}`
   */
  nav?: NavConfig;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = ['applicant', 'supervisor', 'evaluator', 'admin'];
const ADMIN_ONLY: UserRole[] = ['admin'];
const APPLICANT_ONLY: UserRole[] = ['applicant'];
const SUPERVISOR_ONLY: UserRole[] = ['supervisor'];
const EVALUATOR_ONLY: UserRole[] = ['evaluator'];

/**
 * Compute the absolute href used in <Link to={...}> from a route's `path` field.
 * This is the canonical nav href for each route.
 */
export function navHref(path: string): string {
  return path === '/' ? '/dashboard' : `/dashboard/${path}`;
}

// ── Route definitions ─────────────────────────────────────────────────────────

/**
 * All /dashboard routes.
 *
 * ORDER MATTERS for sidebar rendering when `order` is equal.
 * Keep related routes grouped for readability.
 */
export const dashboardRouteConfigs: DashboardRouteConfig[] = [
  // ── Shared / Universal ───────────────────────────────────────────────────
  {
    path: '/',
    component: DashboardHome,
    allowedRoles: ALL_ROLES,
    nav: {
      label: 'Dashboard',
      icon: LayoutDashboard,
      group: 'main',
      order: 10,
    },
  },

  // ── Applicant routes ─────────────────────────────────────────────────────
  {
    path: 'submissions',
    component: ApplicantDashboard,
    allowedRoles: APPLICANT_ONLY,
    nav: {
      label: 'My Submissions',
      icon: FileText,
      group: 'main',
      order: 20,
    },
  },
  {
    path: 'submit',
    component: NewSubmissionPage,
    allowedRoles: APPLICANT_ONLY,
    nav: {
      label: 'New Submission',
      icon: ClipboardList,
      group: 'main',
      order: 30,
    },
  },

  // Submission detail: accessible by all roles (RLS enforces ownership at DB level)
  {
    path: 'submissions/:id',
    component: SubmissionDetailPage,
    allowedRoles: ALL_ROLES,
    // no nav — reached via links within pages
  },

  // ── Supervisor routes ────────────────────────────────────────────────────
  {
    path: 'review',
    component: SupervisorDashboard,
    allowedRoles: SUPERVISOR_ONLY,
    nav: {
      label: 'Review Queue',
      icon: ClipboardList,
      group: 'main',
      order: 40,
    },
  },

  // ── Evaluator routes ─────────────────────────────────────────────────────
  {
    path: 'evaluations',
    component: EvaluatorDashboard,
    allowedRoles: EVALUATOR_ONLY,
    nav: {
      label: 'Evaluations',
      icon: Star,
      group: 'main',
      order: 50,
    },
  },

  // ── Admin routes ─────────────────────────────────────────────────────────
  {
    path: 'users',
    component: UserManagement,
    allowedRoles: ADMIN_ONLY,
    nav: {
      label: 'Users',
      icon: Users,
      group: 'admin',
      order: 60,
    },
  },
  {
    path: 'public-pages',
    component: PublicPagesManagement,
    allowedRoles: ADMIN_ONLY,
    nav: {
      label: 'Public Pages',
      icon: Globe,
      group: 'admin',
      order: 70,
    },
  },
  {
    // CMS page content editor — no sidebar link, reached from public-pages list
    path: 'public-pages/:slug/edit',
    component: CMSPageEditor,
    allowedRoles: ADMIN_ONLY,
  },
  {
    // CMS page sections manager — no sidebar link, reached from public-pages list
    path: 'public-pages/:pageId',
    component: PageSectionsManagement,
    allowedRoles: ADMIN_ONLY,
  },
  {
    path: 'records',
    component: AllRecordsPage,
    allowedRoles: ADMIN_ONLY,
    nav: {
      label: 'All Records',
      icon: FileText,
      group: 'admin',
      order: 80,
    },
  },
  {
    path: 'legacy-records',
    component: LegacyRecordsPage,
    allowedRoles: ADMIN_ONLY,
    nav: {
      label: 'Legacy Records',
      icon: Archive,
      group: 'admin',
      order: 90,
    },
  },
  {
    // Add new legacy record — no sidebar link, reached from legacy-records list
    path: 'legacy-records/new',
    component: AddLegacyRecordPage,
    allowedRoles: ADMIN_ONLY,
  },
  {
    // Legacy record detail — no sidebar link, reached from legacy-records list
    path: 'legacy-records/:id',
    component: LegacyRecordDetailPage,
    allowedRoles: ADMIN_ONLY,
  },
  {
    path: 'deleted-records',
    component: DeletedArchivePage,
    allowedRoles: ADMIN_ONLY,
    nav: {
      label: 'Deleted Archive',
      icon: Archive,
      group: 'admin',
      order: 100,
    },
  },
  {
    path: 'assignments',
    component: AssignmentManagementPage,
    allowedRoles: ADMIN_ONLY,
    nav: {
      label: 'Assignments',
      icon: UserCheck,
      group: 'admin',
      order: 110,
    },
  },
  {
    path: 'departments',
    component: DepartmentManagementPage,
    allowedRoles: ADMIN_ONLY,
    nav: {
      label: 'Departments',
      icon: Settings,
      group: 'admin',
      order: 120,
    },
  },
  {
    path: 'sla-policies',
    component: AdminSLAManagement,
    allowedRoles: ADMIN_ONLY,
    nav: {
      label: 'SLA Policies',
      icon: Clock,
      group: 'admin',
      order: 130,
    },
  },
  {
    path: 'analytics',
    component: AdminDashboard,
    allowedRoles: ADMIN_ONLY,
    nav: {
      label: 'Analytics',
      icon: PieChart,
      group: 'admin',
      order: 140,
    },
  },

  // ── Shared / bottom of sidebar ────────────────────────────────────────────
  {
    path: 'settings',
    component: SettingsPage,
    allowedRoles: ALL_ROLES,
    nav: {
      label: 'Settings',
      icon: Settings,
      group: 'main',
      order: 150,
    },
  },

  // ── Admin-only routes with no sidebar entry ───────────────────────────────
  {
    // Branding is embedded inside SettingsPage for admins.
    // Kept as a protected standalone route for direct navigation.
    path: 'branding',
    component: AdminBrandingSettingsPage,
    allowedRoles: ADMIN_ONLY,
  },
];
