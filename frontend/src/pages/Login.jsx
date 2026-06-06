import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  ShoppingCart, 
  FileText, 
  Package, 
  UserCircle2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  Loader2
} from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const userData = await login(formData.email, formData.password);
      
      switch (userData.role) {
        case 'admin':
          navigate('/dashboard');
          break;
        case 'procurement_officer':
          navigate('/dashboard');
          break;
        case 'vendor':
          navigate('/vendors');
          break;
        case 'manager':
          navigate('/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setGeneralError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL - Green Gradient */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#15803d] to-[#166534] p-12 flex-col justify-between text-white">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8" />
          <span className="text-2xl font-bold">VendorBridge</span>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            Streamline Your Procurement
          </h1>
          <p className="text-xl text-[#bbf7d0] mb-12">
            Complete vendor management and procurement solution for modern businesses
          </p>

          {/* Feature Cards */}
          <div className="space-y-4">
            {/* Card 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-all duration-200 hover:bg-white/15">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#bbf7d0] rounded-full flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-6 h-6 text-[#15803d]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Vendor Management</h3>
                  <p className="text-[#bbf7d0] text-sm">
                    Register and manage all your vendors in one place
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-all duration-200 hover:bg-white/15">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#bbf7d0] rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-[#15803d]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">RFQ Processing</h3>
                  <p className="text-[#bbf7d0] text-sm">
                    Create and track requests for quotations easily
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-all duration-200 hover:bg-white/15">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#bbf7d0] rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-[#15803d]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Purchase Orders</h3>
                  <p className="text-[#bbf7d0] text-sm">
                    Generate and manage POs with full audit trail
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Text */}
        <div className="text-[#bbf7d0] text-sm">
          Trusted by 500+ procurement teams
        </div>
      </div>

      {/* RIGHT PANEL - White Background */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col">
        {/* Top Right Help */}
        <div className="p-6 text-right">
          <span className="text-sm text-gray-500">
            Need help?{' '}
            <a href="mailto:support@vendorbridge.com" className="text-[#16a34a] hover:underline">
              support@vendorbridge.com
            </a>
          </span>
        </div>

        {/* Center Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[420px]">
            {/* User Avatar */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-[#f3f4f6] rounded-full flex items-center justify-center">
                <UserCircle2 className="w-12 h-12 text-[#4f46e5]" />
              </div>
            </div>

            {/* Heading */}
            <h2 className="text-3xl font-bold text-[#111827] text-center mb-2">
              Welcome Back
            </h2>
            <p className="text-center text-[#6b7280] mb-6">
              Sign in to your procurement account
            </p>

            {/* Divider */}
            <div className="w-full h-px bg-gray-200 mb-6"></div>

            {/* Error Message */}
            {generalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-[#dc2626] text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{generalError}</span>
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
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full h-11 pl-10 pr-4 border ${
                      errors.email ? 'border-red-500' : 'border-[#e5e7eb]'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-200`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <div className="mt-1 flex items-center gap-1 text-[#dc2626] text-sm">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full h-11 pl-10 pr-12 border ${
                      errors.password ? 'border-red-500' : 'border-[#e5e7eb]'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-200`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <div className="mt-1 flex items-center gap-1 text-[#dc2626] text-sm">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#16a34a] focus:ring-[#16a34a]"
                  />
                  <span className="text-sm text-[#6b7280]">Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-[#16a34a] hover:text-[#15803d] transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-500">or continue with</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Register Link */}
            <p className="text-center text-sm text-[#6b7280]">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-[#16a34a] hover:text-[#15803d] transition-colors"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
