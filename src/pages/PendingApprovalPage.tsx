import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, HelpCircle, Home } from 'lucide-react';

export function PendingApprovalPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-100 rounded-full p-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Account Under Review
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          Thank you for registering! Your email has been verified and you've successfully logged in. 
          Your account is currently pending approval from the University IP Office administrator.
          You will receive an email notification once your account has been approved.
        </p>

        {/* Timeline */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold text-blue-900">Typical review time:</p>
              <p className="text-sm text-blue-700">1-3 business days</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-gray-600 mb-3">
            <strong>What happens next?</strong> An administrator will review your registration and approve your account. 
            Once approved, you'll be able to submit intellectual property disclosures and access all system features.
          </p>
          <p className="text-sm text-gray-600">
            In the meantime, you're welcome to visit our public pages to learn more about the IP submission process.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>

          <button
            onClick={handleLogOut}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>

        {/* Support Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 font-semibold mb-2 uppercase tracking-wide">Need Help?</p>
          <p className="text-xs text-gray-600 mb-3">
            If you have questions about the approval process or need to update your registration, 
            please reach out to us.
          </p>
          <a
            href="mailto:support@ucc.edu.gh"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            <HelpCircle className="w-4 h-4" />
            support@ucc.edu.gh
          </a>
        </div>
      </div>
    </div>
  );
}
