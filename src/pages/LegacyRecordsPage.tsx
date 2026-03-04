import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Search, Filter, Eye, Plus, Archive } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Pagination } from '../components/Pagination';
import type { Database } from '../lib/database.types';

type LegacyRecord = Database['public']['Tables']['legacy_ip_records']['Row'];
type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];

export function LegacyRecordsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [records, setRecords] = useState<LegacyRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<LegacyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IpCategory | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Redirect if not admin
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchRecords();
    }
  }, [profile]);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, categoryFilter, sourceFilter]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('legacy_ip_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching legacy records:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.details?.creator_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((record) => record.category === categoryFilter);
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter((record) => record.details?.legacy_source === sourceFilter);
    }

    setFilteredRecords(filtered);
  };

  const categories = ['patent', 'trademark', 'copyright', 'trade_secret', 'software', 'design', 'other'] as IpCategory[];
  const sources = ['old_system', 'physical_archive', 'email', 'manual_entry', 'other'];

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, sourceFilter]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Archive className="w-7 h-7 text-amber-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Legacy IP Records</h1>
            <p className="text-gray-600 mt-1">Digitized historical intellectual property records</p>
          </div>
        </div>
        <Link
          to="/dashboard/legacy-records/new"
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Legacy Record
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Title or inventor name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as IpCategory | 'all')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Sources</option>
            <option value="old_system">Old System</option>
            <option value="physical_archive">Physical Archive</option>
            <option value="email">Email</option>
            <option value="manual_entry">Manual Entry</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Records section */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Legacy Records</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">
            <p>Loading legacy records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No legacy records found.</p>
            <Link
              to="/dashboard/legacy-records/new"
              className="mt-4 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Create the first legacy record
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventor / Author</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{record.title}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{record.details?.creator_name || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                          {record.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{record.details?.legacy_source || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {new Date(record.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/dashboard/legacy-records/${record.id}`}
                          className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-4">
              {paginatedRecords.map((record) => (
                <div key={record.id} className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-gray-900">{record.title}</div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 shrink-0">
                      {record.category}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-gray-500">Inventor / Author</div>
                      <div className="font-medium text-gray-900">{record.details?.creator_name || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Source</div>
                      <div className="font-medium text-gray-900">{record.details?.legacy_source || 'N/A'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-500">Date Created</div>
                      <div className="font-medium text-gray-900">{new Date(record.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <Link
                    to={`/dashboard/legacy-records/${record.id}`}
                    className="flex w-full items-center justify-center gap-2 px-3 py-2 text-sm border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50 transition"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(count) => {
                setItemsPerPage(count);
                setCurrentPage(1);
              }}
              totalItems={filteredRecords.length}
            />
          </>
        )}
      </div>
    </div>
  );
}
