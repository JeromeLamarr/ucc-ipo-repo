import { useAuth } from '../contexts/AuthContext';
import { AdminDepartmentManagement } from '../components/AdminDepartmentManagement';

export function DepartmentManagementPage() {
  const { profile } = useAuth();

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Unauthorized</h1>
          <p className="text-gray-600">Only administrators can manage departments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Department Management</h1>
        <p className="text-gray-600 mt-2">Create, edit, and manage all departments in the system</p>
      </div>

      <AdminDepartmentManagement />
    </div>
  );
}
