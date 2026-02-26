# Dashboard Records Table UI/UX Pattern

**Purpose:** Document the reusable table UI/UX pattern used on `/dashboard/records` so it can be copied to other pages.

---

## File Locations

| Component | File Path | Purpose |
|-----------|-----------|---------|
| **Main Page** | `src/pages/AllRecordsPage.tsx` | Renders the /dashboard/records page with workflow and draft records tables |
| **Status Helpers** | `src/lib/statusLabels.ts` | Maps status values to labels and Tailwind color classes |
| **Pagination** | `src/components/Pagination.tsx` | Reusable pagination component with items-per-page selector |
| **Reusable Pattern** | `src/components/dashboard/RecordsTablePattern.tsx` | **NEW** - Copy of the table UI pattern, accepts props |
| **Routes** | `src/App.tsx` | Route definition: `/dashboard/records` → `<AllRecordsPage />` |

---

## State Shape

The AllRecordsPage manages the following state:

```typescript
// Record Data
const [records, setRecords] = useState<IpRecord[]>([]);  // All fetched records
const [filteredRecords, setFilteredRecords] = useState<IpRecord[]>([]);  // Filtered submitted records
const [filteredDrafts, setFilteredDrafts] = useState<IpRecord[]>([]);  // Filtered draft records
const [loading, setLoading] = useState(true);

// Search & Filter Controls
const [searchTerm, setSearchTerm] = useState('');
const [statusFilter, setStatusFilter] = useState<IpStatus | 'all'>('all');
const [categoryFilter, setCategoryFilter] = useState<IpCategory | 'all'>('all');

// Pagination (Workflow Records)
const [workflowCurrentPage, setWorkflowCurrentPage] = useState(1);
const [workflowItemsPerPage, setWorkflowItemsPerPage] = useState(10);

// Pagination (Draft Records)
const [draftsCurrentPage, setDraftsCurrentPage] = useState(1);
const [draftsItemsPerPage, setDraftsItemsPerPage] = useState(10);

// Delete Confirmation
const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);
```

### IpRecord Type

```typescript
type IpRecord = Database['public']['Tables']['ip_records']['Row'] & {
  applicant?: Database['public']['Tables']['users']['Row'];
  supervisor?: Database['public']['Tables']['users']['Row'];
  evaluator?: Database['public']['Tables']['users']['Row'];
};

type IpStatus = Database['public']['Tables']['ip_records']['Row']['status'];
type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];
```

---

## UI Pattern: Toolbar + Table Layout

### 1. **Toolbar (Search & Filters)**

**Layout:** 3-column grid on desktop (`md:grid-cols-3`), responsive on mobile

**Location in code:** Lines 340-395 in AllRecordsPage.tsx

**Component Structure:**

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
  
  {/* Search Input */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search by title or applicant..."
      className="w-full pl-9 lg:pl-10 pr-3 lg:pr-4 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>

  {/* Status Filter Dropdown */}
  <div className="relative">
    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value as IpStatus | 'all')}
      className="w-full pl-9 lg:pl-10 pr-8 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
    >
      <option value="all">All Statuses</option>
      <option value="submitted">Submitted</option>
      <option value="waiting_supervisor">Waiting Supervisor</option>
      <option value="supervisor_approved">Supervisor Approved</option>
      <option value="waiting_evaluation">Waiting Evaluation</option>
      <option value="evaluator_approved">Evaluator Approved</option>
      <option value="ready_for_filing">Ready for Filing</option>
      <option value="rejected">Rejected</option>
    </select>
  </div>

  {/* Category Filter Dropdown */}
  <div className="relative">
    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
    <select
      value={categoryFilter}
      onChange={(e) => setCategoryFilter(e.target.value as IpCategory | 'all')}
      className="w-full pl-9 lg:pl-10 pr-8 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
    >
      <option value="all">All Categories</option>
      <option value="patent">Patent</option>
      <option value="copyright">Copyright</option>
      <option value="trademark">Trademark</option>
      <option value="design">Industrial Design</option>
      <option value="utility_model">Utility Model</option>
      <option value="other">Other</option>
    </select>
  </div>
</div>
```

**Key Features:**
- **Search:** Real-time client-side filter on `title` and `applicant.full_name`
- **Status Filter:** Dropdown with hard-coded status options
- **Category Filter:** Dropdown with hard-coded category options
- **Icons:** Left-aligned `<Search>` and `<Filter>` icons from lucide-react
- **Responsive:** Stacks to 1 column on mobile, 3 columns on desktop

---

### 2. **Table Container**

**Wrapper Classes:**

```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
  {/* Header section with title and subtitle */}
  {/* Toolbar (filters) */}
  {/* Table or mobile cards */}
  {/* Pagination */}
</div>
```

**Key Classes:**
- `bg-white` - White background
- `rounded-xl` - Large rounded corners
- `shadow-sm` - Subtle shadow
- `border border-gray-200` - Light gray border
- `p-4 lg:p-6` - Responsive padding

---

### 3. **Desktop Table Header**

**Styling:** `bg-gray-50 sticky top-0 z-10` (sticky for scroll)

```tsx
<thead className="bg-gray-50 sticky top-0 z-10">
  <tr>
    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Title
    </th>
    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Applicant
    </th>
    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Category
    </th>
    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Status
    </th>
    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
      Supervisor
    </th>
    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
      Evaluator
    </th>
    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden 2xl:table-cell">
      Created
    </th>
    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
      Actions
    </th>
  </tr>
</thead>
```

**Header Cell Classes:**
- `text-left` or `text-right` - Alignment
- `text-xs` - Small font size
- `font-medium` - Medium weight
- `text-gray-500` - Gray color
- `uppercase` - Uppercase text
- `tracking-wider` - Letter spacing
- `hidden xl:table-cell` - Hide on smaller screens
- `sticky right-0` - Sticky actions column (follows horizontal scroll)

---

### 4. **Table Rows (Desktop)**

**Row Hover:** `hover:bg-gray-50 transition-colors`

```tsx
<tbody className="bg-white divide-y divide-gray-200">
  {paginatedWorkflowRecords.map((record) => (
    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
      
      {/* Title Cell */}
      <td className="px-3 py-3">
        <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={record.title}>
          {record.title}
        </div>
      </td>

      {/* Applicant Cell (with email) */}
      <td className="px-3 py-3">
        <div className="text-sm text-gray-900">{record.applicant?.full_name}</div>
        <div className="text-xs text-gray-500 truncate max-w-[180px]">{record.applicant?.email}</div>
      </td>

      {/* Category Cell */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="text-sm text-gray-900 capitalize">{record.category}</div>
      </td>

      {/* Status Pill Badges */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span
          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
            getStatusColor(record.status)  // Returns color class from statusLabels.ts
          }`}
        >
          {getStatusLabel(record.status)}  {/* Returns label from statusLabels.ts */}
        </span>
      </td>

      {/* Supervisor Cell (hidden on xl) */}
      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
        {record.supervisor?.full_name || '-'}
      </td>

      {/* Evaluator Cell (hidden on xl) */}
      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
        {record.evaluator?.full_name || '-'}
      </td>

      {/* Created Date Cell (hidden on 2xl) */}
      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 hidden 2xl:table-cell">
        {formatDate(record.created_at)}
      </td>

      {/* Actions Cell (sticky right) */}
      <td className="px-3 py-3 whitespace-nowrap text-sm sticky right-0 bg-white">
        <div className="flex items-center justify-end gap-2">
          <Link
            to={`/dashboard/submissions/${record.id}`}
            className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden 2xl:inline">View</span>
          </Link>
          <button
            onClick={() => setDeleteConfirmation({ id: record.id, title: record.title })}
            className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
            title="Delete Record"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden 2xl:inline">Delete</span>
          </button>
        </div>
      </td>

    </tr>
  ))}
</tbody>
```

**Row Cell Classes:**
- `px-3 py-3` - Cell padding
- `text-sm` - Small font for data
- `whitespace-nowrap` - Prevent wrapping
- `truncate max-w-[180px]` - Truncate long text
- `text-gray-500` - Secondary text color
- `sticky right-0 bg-white` - Keep actions visible on scroll

---

### 5. **Status Pill Badges**

**Color Mapping:** From `src/lib/statusLabels.ts`

```javascript
// Example: statusColors object
{
  submitted: 'bg-blue-100 text-blue-800',
  waiting_supervisor: 'bg-yellow-100 text-yellow-800',
  supervisor_revision: 'bg-orange-100 text-orange-800',
  supervisor_approved: 'bg-green-100 text-green-800',
  waiting_evaluation: 'bg-purple-100 text-purple-800',
  evaluator_revision: 'bg-orange-100 text-orange-800',
  evaluator_approved: 'bg-green-100 text-green-800',
  preparing_legal: 'bg-indigo-100 text-indigo-800',
  ready_for_filing: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
}
```

**Badge Styling:**

```tsx
<span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
  Submitted
</span>
```

**Badge Classes:**
- `px-2 py-1` - Padding
- `inline-flex` - Inline display
- `text-xs` - Tiny font
- `leading-5` - Line height
- `font-semibold` - Bold weight
- `rounded-full` - Fully rounded
- `bg-{color}-100 text-{color}-800` - Color variant

---

### 6. **Mobile Card View**

**Container:** `bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow`

**Layout per card:**

```tsx
<div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
  
  {/* Header Area */}
  <div className="flex items-start justify-between mb-3">
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-gray-900 mb-2">{record.title}</h3>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {record.category}
        </span>
        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
          {getStatusLabel(record.status)}
        </span>
      </div>
    </div>
  </div>

  {/* Details Section */}
  <div className="space-y-2 text-sm">
    <div className="flex items-center text-gray-600">
      <span className="font-medium w-24">Applicant:</span>
      <span className="truncate">{record.applicant?.full_name}</span>
    </div>
    {record.supervisor?.full_name && (
      <div className="flex items-center text-gray-600">
        <span className="font-medium w-24">Supervisor:</span>
        <span className="truncate">{record.supervisor.full_name}</span>
      </div>
    )}
    {record.evaluator?.full_name && (
      <div className="flex items-center text-gray-600">
        <span className="font-medium w-24">Evaluator:</span>
        <span className="truncate">{record.evaluator.full_name}</span>
      </div>
    )}
    <div className="flex items-center text-gray-600">
      <span className="font-medium w-24">Created:</span>
      <span>{formatDate(record.created_at)}</span>
    </div>
  </div>

  {/* Actions Area */}
  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
    <Link
      to={`/dashboard/submissions/${record.id}`}
      className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center justify-center gap-2"
    >
      <Eye className="h-4 w-4" />
      View
    </Link>
    <button
      onClick={() => setDeleteConfirmation({ id: record.id, title: record.title })}
      className="flex-1 text-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium inline-flex items-center justify-center gap-2"
    >
      <Trash2 className="h-4 w-4" />
      Delete
    </button>
  </div>
</div>
```

**Mobile Card Classes:**
- `border border-gray-200` - Border
- `rounded-lg` - Rounded corners
- `p-4` - Padding
- `hover:shadow-md transition-shadow` - Hover effect
- `divide-y divide-gray-200` - Row dividers
- `flex-wrap` - Wrap badges

---

### 7. **Empty State**

**Desktop:**
```tsx
{filteredRecords.length === 0 ? (
  <tr>
    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <p>No workflow records found</p>
    </td>
  </tr>
) : (
  /* Map rows */
)}
```

**Mobile:**
```tsx
{filteredRecords.length === 0 ? (
  <div className="text-center py-12 text-gray-500">
    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
    <p>No workflow records found</p>
  </div>
) : (
  /* Map cards */
)}
```

**Classes:**
- `py-12` - Vertical padding
- `text-center` - Centered text
- `text-gray-500` - Muted text
- `h-12 w-12` - Icon size
- `text-gray-300` - Light icon color

---

### 8. **Pagination**

**Component:** `<Pagination />` from `src/components/Pagination.tsx`

**Props:**
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (count: number) => void;
  totalItems: number;
}
```

**Usage:**
```tsx
{workflowTotalPages > 1 && (
  <Pagination
    currentPage={workflowCurrentPage}
    totalPages={workflowTotalPages}
    onPageChange={setWorkflowCurrentPage}
    itemsPerPage={workflowItemsPerPage}
    onItemsPerPageChange={(count) => {
      setWorkflowItemsPerPage(count);
      setWorkflowCurrentPage(1);
    }}
    totalItems={filteredRecords.length}
  />
)}
```

---

### 9. **Loading State**

```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
```

**Classes:**
- `animate-spin` - Spinning animation
- `rounded-full` - Circle
- `border-b-2 border-blue-600` - Spinner color

---

## Filtering Logic

### Search
**Client-side**, real-time filter:
```typescript
if (searchTerm) {
  filtered = filtered.filter(
    (record) =>
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.applicant?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}
```

### Status Filter
**Client-side** dropdown filter:
```typescript
if (statusFilter !== 'all') {
  filtered = filtered.filter((record) => record.status === statusFilter);
}
```

### Category Filter
**Client-side** dropdown filter:
```typescript
if (categoryFilter !== 'all') {
  filtered = filtered.filter((record) => record.category === categoryFilter);
}
```

### Draft Separation
Records with `status === 'draft'` are separated and displayed in a separate section with amber styling:
```typescript
const drafts = records.filter((record) => record.status === 'draft');
const submitted = records.filter((record) => record.status !== 'draft');
```

---

## Tailwind Classes Used

### Layout & Spacing
- `flex`, `flex-col`, `flex-row`, `items-center`, `justify-between`, `justify-end`, `gap-*, `p-*`, `px-*`, `py-*`, `mb-*, `mt-*`, `space-y-*`

### Colors & Styling
- `bg-white`, `bg-gray-50`, `bg-gray-100`, `bg-blue-100`, `border border-gray-200`, `rounded-lg`, `rounded-xl`, `shadow-sm`, `hover:bg-gray-50`, `hover:shadow-md`, `text-gray-900`, `text-gray-600`, `text-gray-500`, `text-xs`, `text-sm`, `font-medium`, `font-semibold`, `font-bold`

### Tables
- `table`, `w-full`, `divide-y divide-gray-200`, `thead`, `tbody`, `th`, `td`, `sticky top-0`, `sticky right-0`, `whitespace-nowrap` 

### Responsive
- `hidden lg:block`, `lg:hidden`, `hidden xl:table-cell`, `hidden 2xl:inline`, `grid grid-cols-1 md:grid-cols-3`, `flex flex-col sm:flex-row`, `sm:flex-row`, `w-full`, `flex-1`

### Interactive
- `hover:bg-gray-50`, `hover:text-blue-700`, `hover:text-red-700`, `hover:shadow-md`, `focus:ring-2 focus:ring-blue-500`, `focus:border-transparent`, `focus:outline-none`, `transition`, `transition-colors`, `transition-shadow`, `cursor-not-allowed`, `disabled:opacity-50`

---

## Icons Used

From `lucide-react`:
- `<Search />` - Search input icon
- `<Filter />` - Filter dropdown icon
- `<Eye />` - View action button
- `<Trash2 />` - Delete action button
- `<FileText />` - Empty state icon
- `<Download />` - Export CSV button (in header)
- `<ChevronLeft />`, `<ChevronRight />` - Pagination arrows (in Pagination component)
- `<Award />`, `<MoreVertical />` - Currently imported but not used in this pattern

---

## Key Features to Copy

1. **Responsive Design:** Desktop table + mobile cards
2. **Sticky Headers & Actions:** Allow horizontal scrolling while keeping nav visible
3. **Client-side Filtering:** Fast, real-time search and filter dropdowns
4. **Status Pills:** Color-coded badges using centralized status label system
5. **Dual Pagination:** Separate pagination for workflow records and draft records
6. **Delete Confirmation Modal:** Overlay modal with confirm/cancel
7. **Draft Separation:** Amber-themed section for draft submissions
8. **Responsive Toolbar:** 3-column grid on desktop, single column on mobile
9. **Empty States:** Icon + message when no records match filters
10. **Loading Spinner:** Centered spinner while fetching data

---

## Dependencies

**React:**
- `useState`, `useEffect` from react
- `Link` from react-router-dom

**Components:**
- `Pagination` from `src/components/Pagination.tsx`

**Utilities:**
- `getStatusColor()` and `getStatusLabel()` from `src/lib/statusLabels.ts`
- `supabase` client from `src/lib/supabase.ts`

**Icons:**
- lucide-react: `Search`, `Filter`, `Eye`, `Download`, `Trash2`, `FileText`

---

## How to Use This Pattern

1. **For a new table page:** Copy the overall structure from AllRecordsPage (toolbar → table/cards → pagination)
2. **For consistent styling:** Use the Tailwind classes listed above
3. **For status colors:** Import and use `getStatusColor()` and `getStatusLabel()` from status helpers
4. **For reusable UI:** Import `<RecordsTablePattern />` component (see next section)
5. **For filters:** Adapt the 3-column toolbar grid as needed for different filter types
6. **For responsive behavior:** Keep the `hidden lg:block` / `lg:hidden` pattern for desktop/mobile views

---

## RecordsTablePattern Component

A new reusable component has been created at:
**`src/components/dashboard/RecordsTablePattern.tsx`**

This component encapsulates the table UI pattern and accepts props for:
- `rows: IpRecord[]` - The data to display
- `onView: (record: IpRecord) => void` - Callback when View button is clicked
- `onDelete: (record: IpRecord) => void` - Callback when Delete button is clicked
- `loading: boolean` - Show loading state
- `statusOptions: StatusOption[]` - Status filter options
- `categoryOptions: CategoryOption[]` - Category filter options
- `onSearchChange: (term: string) => void` - Search input handler
- `onStatusFilterChange: (status: string) => void` - Status filter handler
- `onCategoryFilterChange: (category: string) => void` - Category filter handler

See [RecordsTablePattern.tsx](../src/components/dashboard/RecordsTablePattern.tsx) for implementation details.

---

## Notes

- No changes were made to backend logic, routes, or Supabase queries
- The AllRecordsPage continues to work exactly as before
- This documentation is for reference and copying to other pages
- The RecordsTablePattern component is optional—pages can replicate the JSX directly instead
