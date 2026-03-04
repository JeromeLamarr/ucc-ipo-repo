import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { FileText, Clock, CheckCircle, Plus, AlertCircle } from 'lucide-react';

export function ApplicantDashboard() {
  const { profile } = useAuth();
  const { primaryColor } = useBranding();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    drafts: 0,
  });

  useEffect(() => {
    fetchRecords();
  }, [profile]);

  const fetchRecords = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('ip_records')
        .select('*')
        .eq('applicant_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allRecords = data || [];
      const submittedRecords = allRecords.filter(r => r.status !== 'draft');
      const draftRecords = allRecords.filter(r => r.status === 'draft');

      setStats({
        total: submittedRecords.length,
        pending:
          submittedRecords.filter((r) =>
            ['submitted', 'waiting_supervisor', 'waiting_evaluation'].includes(r.status)
          ).length || 0,
        approved:
          submittedRecords.filter((r) =>
            ['supervisor_approved', 'evaluator_approved', 'ready_for_filing'].includes(r.status)
          ).length || 0,
        rejected: submittedRecords.filter((r) => r.status === 'rejected').length || 0,
        drafts: draftRecords.length,
      });
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Pending Approval Banner */}
      {profile && profile.is_approved === false && (
        <div className="bg-amber-50 border-2 border-amber-200 border-dotted rounded-xl p-6 md:p-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 md:h-8 md:w-8" style={{ color: '#d97706' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-bold text-amber-900 mb-2">Account Under Review</h3>
              <p className="text-amber-800 mb-4">Your account is currently pending approval from the University IP Office. This typically takes 1-2 business days.</p>
              <p className="text-sm text-amber-700">Once approved, you'll receive an email confirmation and will be able to access all features of the system, including submitting intellectual property disclosures.</p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-3">Welcome, {profile?.full_name}</h1>
          <p className="text-lg text-gray-600 font-medium">Manage your intellectual property submissions</p>
        </div>
        {profile && profile.is_approved === false ? (
          <div className="relative group">
            <button
              disabled
              className="flex items-center gap-2 px-8 py-4 text-gray-400 bg-gray-100 rounded-xl shadow-lg cursor-not-allowed opacity-60 w-fit"
            >
              <Plus className="h-6 w-6" />
              New Submission
            </button>
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded py-2 px-3 whitespace-nowrap">
              Available after account approval
            </div>
          </div>
        ) : (
          <Link
            to="/dashboard/submit"
            className="flex items-center gap-2 px-8 py-4 text-white rounded-xl hover:font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-fit"
            style={{ background: `linear-gradient(to right, ${primaryColor}, #6366f1)` }}
          >
            <Plus className="h-6 w-6" />
            New Submission
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: `linear-gradient(135deg, ${primaryColor}08, #6366f108)`, borderColor: `${primaryColor}40` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: `linear-gradient(135deg, ${primaryColor}, #6366f1)` }}>
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: primaryColor, backgroundColor: `${primaryColor}20` }}>Total</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Submissions</p>
          <p className="text-4xl font-black text-gray-900 mt-2">{stats.total}</p>
        </div>

        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #f5991808, #d97706108)', borderColor: '#f5991840' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #f59918, #d97706)' }}>
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: '#f59918', backgroundColor: '#f5991820' }}>Drafts</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Draft Saves</p>
          <p className="text-4xl font-black mt-2" style={{ color: '#f59918' }}>{stats.drafts}</p>
        </div>

        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #fbbf2408, #fcd34d08)', borderColor: '#fbbf2440' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #fbbf24, #fcd34d)' }}>
              <Clock className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: '#fbbf24', backgroundColor: '#fbbf2420' }}>In Review</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Pending</p>
          <p className="text-4xl font-black mt-2" style={{ color: '#fbbf24' }}>{stats.pending}</p>
        </div>

        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #22c55e08, #16a34a08)', borderColor: '#22c55e40' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: '#22c55e', backgroundColor: '#22c55e20' }}>Approved</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Approved</p>
          <p className="text-4xl font-black mt-2" style={{ color: '#22c55e' }}>{stats.approved}</p>
        </div>
      </div>
    </div>
  );
}
