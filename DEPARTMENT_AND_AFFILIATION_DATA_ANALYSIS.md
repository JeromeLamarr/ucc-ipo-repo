# Department and Affiliation Data Analysis

**Date:** January 19, 2026  
**Project:** UCC IPO Management System

---

## Executive Summary

This document provides a comprehensive analysis of all department and affiliation data columns across the UCC IPO system. The system maintains department information through multiple tables and uses both a dedicated `departments` table and legacy `affiliation` fields for tracking organizational units.

---

## 1. Database Schema Overview

### 1.1 Departments Table
**Table Name:** `departments`  
**Created:** Migration `20251219_add_departments_system.sql`

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique identifier for department |
| `name` | TEXT | NOT NULL, UNIQUE | Department name |
| `description` | TEXT | NULL | Department description |
| `active` | BOOLEAN | DEFAULT true | Whether department is active for registration |
| `created_by` | UUID | REFERENCES auth.users(id) | Admin who created the department |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_departments_active` - ON `active` (filter for active departments)
- `idx_departments_name` - ON `name` (quick lookup)
- `idx_departments_created_by` - ON `created_by` (audit trail)

**Row-Level Security (RLS):**
- ✅ Enabled
- Public users can view **active departments only** (for registration)
- Admins can view all departments
- Only service role/admins can create/update/delete

---

### 1.2 Users Table - Department Fields
**Table Name:** `users`  
**Schema File:** `20251115150428_create_ip_management_system_schema_v2.sql`

#### Traditional Department Field:
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `affiliation` | TEXT | NULL | Legacy affiliation/department field (free text) |

#### New Department Field:
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `department_id` | UUID | REFERENCES departments(id) ON DELETE SET NULL | Foreign key to departments table |

**Indexes on Users:**
- `idx_users_department_id` - ON `department_id`
- `idx_users_email` - ON `email`
- `idx_users_role` - ON `role`

---

### 1.3 IP Records Table - Department Association
**Table Name:** `ip_records`

**Current Structure:** No direct department column, but associated through:
```
ip_records.applicant_id → users.id → users.department_id → departments.id
```

| Column | Type | Related Field |
|--------|------|---------------|
| `applicant_id` | UUID | REFERENCES users(id) |
| (Department access) | (via JOIN) | Through applicant's user record |

---

### 1.4 Legacy IP Records Table
**Table Name:** `legacy_ip_records`  
**Created:** Migration `20251229000002_create_legacy_ip_records_table.sql`

**No department field** - These are historical records migrated from legacy system

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `title` | TEXT | Record title |
| `category` | TEXT | IP category |
| `legacy_source` | TEXT | Where it came from |
| `digitized_at` | TIMESTAMPTZ | When it was digitized |
| `ipophil_application_no` | TEXT | Original application number |
| `created_by_admin_id` | UUID | Admin who created the record |

---

## 2. Current Department & Affiliation Usage

### 2.1 Active Department List
Based on the schema, departments are managed as distinct records:

**Example Departments (from registration page):**
- Users can select from active departments when registering
- Fetched via: `SELECT id, name, description FROM departments WHERE active = true`

### 2.2 User-Department Mapping

#### Two-Column System:
```
users.affiliation (legacy) ← → users.department_id (new)
        ↓                              ↓
   Free text                    UUID reference to departments table
   (old system)                 (new system)
```

**Status:** Migration in progress from text-based to structured department_id

---

## 3. Data Analysis Queries

### 3.1 Users by Department (New System)
```sql
SELECT 
  d.name as department_name,
  COUNT(u.id) as user_count,
  COUNT(CASE WHEN u.is_verified THEN 1 END) as verified_users,
  COUNT(CASE WHEN u.role = 'applicant' THEN 1 END) as applicants,
  COUNT(CASE WHEN u.role = 'evaluator' THEN 1 END) as evaluators,
  COUNT(CASE WHEN u.role = 'supervisor' THEN 1 END) as supervisors,
  COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admins
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
GROUP BY d.id, d.name
ORDER BY user_count DESC;
```

### 3.2 Users with Legacy Affiliation (Unmigrated)
```sql
SELECT 
  email,
  full_name,
  affiliation as legacy_affiliation,
  department_id,
  CASE 
    WHEN department_id IS NULL AND affiliation IS NOT NULL THEN 'NEEDS MIGRATION'
    WHEN department_id IS NOT NULL THEN 'MIGRATED'
    WHEN department_id IS NULL AND affiliation IS NULL THEN 'NO AFFILIATION'
  END as status,
  created_at,
  updated_at
FROM users
ORDER BY status, created_at DESC;
```

### 3.3 Records by Department
```sql
SELECT 
  d.name as department,
  COUNT(ip.id) as total_records,
  COUNT(CASE WHEN ip.status = 'submitted' THEN 1 END) as submitted,
  COUNT(CASE WHEN ip.status = 'under_review' THEN 1 END) as under_review,
  COUNT(CASE WHEN ip.status = 'approved' THEN 1 END) as approved,
  COUNT(CASE WHEN ip.status = 'rejected' THEN 1 END) as rejected
FROM departments d
LEFT JOIN users u ON d.id = u.department_id
LEFT JOIN ip_records ip ON u.id = ip.applicant_id
WHERE d.active = true
GROUP BY d.id, d.name
ORDER BY total_records DESC;
```

### 3.4 Department Statistics
```sql
SELECT 
  d.id,
  d.name as department_name,
  d.description,
  d.active,
  COUNT(u.id) as total_users,
  COUNT(DISTINCT ip.id) as total_ip_records,
  MAX(ip.created_at) as latest_record_date
FROM departments d
LEFT JOIN users u ON d.id = u.department_id
LEFT JOIN ip_records ip ON u.id = ip.applicant_id
GROUP BY d.id, d.name, d.description, d.active
ORDER BY total_users DESC;
```

---

## 4. Registration Flow - Department Assignment

### 4.1 Registration Page (`RegisterPage.tsx`)

**Step 1: Load Active Departments**
```typescript
const fetchDepartments = async () => {
  const { data } = await supabase
    .from('departments')
    .select('id, name, description')
    .eq('active', true)
    .order('name', { ascending: true });
  
  setDepartments(data || []);
};
```

**Step 2: User Selects Department During Registration**
- Department selection is **REQUIRED** ✓
- Field: `departmentId` (state)
- Validation: `if (!departmentId) setError('Please select a department')`

**Step 3: Submit Registration**
```typescript
const { data, error } = await supabase.functions.invoke('register-user', {
  body: {
    email,
    fullName,
    password,
    departmentId,  // ← Sent to edge function
  },
});
```

### 4.2 User Management Page (`UserManagement.tsx`)

Similar department selection interface:
```typescript
<select
  value={selectedDepartment}
  onChange={(e) => setSelectedDepartment(e.target.value)}
>
  <option value="">Select a department...</option>
  {departments.map((dept) => (
    <option key={dept.id} value={dept.id}>
      {dept.name}
    </option>
  ))}
</select>
```

---

## 5. Data Migration Status

### 5.1 Legacy System
- **Field:** `affiliation` (TEXT, free-form)
- **Status:** Phase-out in progress
- **Used in:** Document generation, certificates

### 5.2 New System
- **Field:** `department_id` (UUID foreign key)
- **Status:** Active implementation
- **Benefits:**
  - ✓ Structured data
  - ✓ Referential integrity
  - ✓ Cascading updates/deletes
  - ✓ Better for reporting and analytics

---

## 6. RLS (Row-Level Security) Policies

### 6.1 Departments Table RLS

| Policy Name | Operation | Condition | Purpose |
|-------------|-----------|-----------|---------|
| "Anyone can view active departments" | SELECT | `active = true` | Public registration access |
| "Admins can view all departments" | SELECT | `true` | Admin management access |
| "Service role can manage departments" | INSERT, UPDATE, DELETE | Service role check | Backend management |

### 6.2 Users Table RLS
- Department_id column follows standard user RLS
- Each user can see their own department assignment
- Admins can see all assignments

---

## 7. Records and Department Association

### 7.1 IP Records by Department

**Query Path:**
```
ip_records
  ↓ applicant_id
users
  ↓ department_id
departments
```

### 7.2 Legacy IP Records
- **No department tracking** - Historical records only
- **Digitized for reference** - No active assignment
- **Access:** Admins only

---

## 8. Outstanding Issues & Recommendations

### Current Issues Found:

1. **Dual Systems:**
   - ⚠️ Both `affiliation` (TEXT) and `department_id` (UUID) in use
   - ⚠️ Some users may have only one or the other filled
   - **Recommendation:** Complete migration to `department_id`

2. **Legacy Records:**
   - ⚠️ `legacy_ip_records` has no department assignment
   - **Recommendation:** Add optional `department_id` if needed for grouping

3. **Department Consistency:**
   - ✓ Active flag prevents inactive departments from appearing in registration
   - **Recommendation:** Audit for orphaned department_ids if departments are deleted

### Recommendations:

1. **Migration Script** - Create one-time migration to map affiliation → department_id
2. **Validation** - Add constraints to ensure at least one department field for users
3. **Reporting** - Build department-based analytics dashboard
4. **Cleanup** - Remove legacy `affiliation` field after full migration

---

## 9. Summary Statistics

### Table Relationships
```
┌─────────────┐
│ departments │
│  (id, name) │
└──────┬──────┘
       │ 1:N
       │
┌──────┴──────┐
│    users    │
│ (dept_id)   │ 1:N
└──────┬──────┘
       │
       ├─→ ip_records (as applicant)
       ├─→ ip_documents
       └─→ certificates

legacy_ip_records (separate, no dept link)
```

### Key Metrics
- **Departments Table:** Manages active/inactive organizational units
- **Users Column:** `department_id` (new) + `affiliation` (legacy)
- **IP Records:** Associated through applicant's user record
- **RLS Enabled:** ✓ On departments table
- **Migration Status:** In-progress (dual system)

---

## 10. How to Use This Analysis

### For Database Admins:
1. Use query 3.1 to get user distribution by department
2. Use query 3.2 to identify unmigrated users
3. Run query 3.4 to get department performance metrics

### For Developers:
- Department selection required in registration
- Use `department_id` for new features (not `affiliation`)
- Check RLS policies before querying departments

### For Reporting:
- Group by `d.name` from departments table
- Filter by `d.active = true` for current operations
- Use aggregates on users and ip_records counts

---

**Document Version:** 1.0  
**Last Updated:** January 19, 2026  
**Status:** Complete Analysis
