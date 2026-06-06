import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  KeyRound,
  Mail,
  Send,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const validateEmail = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validateEmail()) {
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
      setEmail('');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send reset link. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
    if (success) setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-[400px]">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {!success ? (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-[#dcfce7] rounded-full flex items-center justify-center">
                  <KeyRound className="w-10 h-10 text-[#16a34a]" />
                </div>
              </div>

              {/* Heading */}
              <h2 className="text-3xl font-bold text-[#111827] text-center mb-2">
                Forgot Password?
              </h2>
              <p className="text-center text-[#6b7280] mb-6">
                Enter your email and we'll send you reset instructions
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-[#dc2626] text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      className={`w-full h-11 pl-10 pr-4 border ${
                        error ? 'border-red-500' : 'border-[#e5e7eb]'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-200`}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-6">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm text-[#6b7280] hover:text-[#16a34a] transition-colors font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-[#dcfce7] rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-[#16a34a]" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-[#111827] text-center mb-2">
                Check your inbox!
              </h2>
              <p className="text-center text-[#6b7280] mb-6">
                We've sent password reset instructions to your email address.
              </p>

              {/* Success Details */}
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-4 mb-6">
                <div className="space-y-2 text-sm text-[#15803d]">
                  <p className="font-medium">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Check your email inbox</li>
                    <li>Click the reset link in the email</li>
                    <li>Create a new password</li>
                    <li>Sign in with your new password</li>
                  </ol>
                  <p className="text-xs mt-3 text-[#16a34a]">
                    <strong>Note:</strong> In development mode, check the server console for the reset token.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="block w-full h-12 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Sign In</span>
                </Link>
                
                <button
                  onClick={() => setSuccess(false)}
                  className="block w-full h-12 border border-[#e5e7eb] hover:bg-gray-50 text-[#6b7280] font-medium rounded-lg transition-all duration-200"
                >
                  Send Another Email
                </button>
              </div>
            </>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#6b7280] mb-2">
            Need help?
          </p>
          <a
            href="mailto:support@vendorbridge.com"
            className="text-sm text-[#16a34a] hover:text-[#15803d] font-medium transition-colors"
          >
            Contact support@vendorbridge.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
