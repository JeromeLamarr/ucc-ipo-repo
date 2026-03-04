import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { Star, AlertCircle, History, ArrowRight } from 'lucide-react';

export function EvaluatorDashboardHome() {
  const { primaryColor } = useBranding();
  const { profile } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [revisionCount, setRevisionCount] = useState(0);
  const [evaluatedCount, setEvaluatedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, [profile]);

  const fetchCounts = async () => {
    if (!profile) return;
    try {
      const [queueResult, historyResult] = await Promise.all([
        supabase
          .from('ip_records')
          .select('status')
          .eq('evaluator_id', profile.id)
          .in('status', ['waiting_evaluation', 'evaluator_revision']),
        supabase
          .from('ip_records')
          .select('id')
          .eq('evaluator_id', profile.id)
          .in('status', ['evaluator_approved', 'rejected', 'completed', 'preparing_legal', 'ready_for_filing']),
      ]);

      const queue = queueResult.data || [];
      setPendingCount(queue.filter((r) => r.status === 'waiting_evaluation').length);
      setRevisionCount(queue.filter((r) => r.status === 'evaluator_revision').length);
      setEvaluatedCount((historyResult.data || []).length);
    } catch (error) {
      console.error('Error fetching evaluator counts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: primaryColor }}
        ></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Evaluator Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}. Here's your evaluation overview.
          </p>
        </div>
        <Link
          to="/dashboard/evaluations"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          Go to Evaluations
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="p-6 rounded-xl shadow-sm border border-gray-200"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}08, #6366f108)`,
            borderColor: `${primaryColor}40`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Evaluation</p>
              <p className="text-3xl font-bold mt-1" style={{ color: primaryColor }}>
                {pendingCount}
              </p>
            </div>
            <Star className="h-12 w-12 opacity-20" style={{ color: primaryColor }} />
          </div>
        </div>

        <div
          className="p-6 rounded-xl shadow-sm border border-gray-200"
          style={{
            background: 'linear-gradient(135deg, #f5991808, #d97706108)',
            borderColor: '#f5991840',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Needs Revision</p>
              <p className="text-3xl font-bold mt-1" style={{ color: '#f59918' }}>
                {revisionCount}
              </p>
            </div>
            <AlertCircle className="h-12 w-12 opacity-20" style={{ color: '#f59918' }} />
          </div>
        </div>

        <div
          className="p-6 rounded-xl shadow-sm border border-gray-200"
          style={{
            background: 'linear-gradient(135deg, #22c55e08, #16a34a08)',
            borderColor: '#22c55e40',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Evaluated Total</p>
              <p className="text-3xl font-bold mt-1" style={{ color: '#22c55e' }}>
                {evaluatedCount}
              </p>
            </div>
            <History className="h-12 w-12 opacity-20 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h2>
        <p className="text-sm text-gray-600 mb-4">
          {pendingCount > 0
            ? `You have ${pendingCount} submission${pendingCount !== 1 ? 's' : ''} waiting for your evaluation.`
            : 'No submissions pending evaluation at the moment.'}
        </p>
        <Link
          to="/dashboard/evaluations"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          Open Evaluations
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
