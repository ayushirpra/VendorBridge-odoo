import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  ClipboardList,
  Users,
  FileSearch,
  CheckCircle,
  UserPlus,
  Camera,
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Eye,
  EyeOff,
  MessageSquare,
  AlertCircle,
  Loader2
} from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'procurement_officer',
    password: '',
    confirmPassword: '',
    profile_photo_url: '',
    termsAccepted: false
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'procurement_officer', label: 'Procurement Officer' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'manager', label: 'Manager' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (formData.first_name.length < 2) {
      newErrors.first_name = 'First name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.first_name)) {
      newErrors.first_name = 'First name can only contain letters';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (formData.last_name.length < 2) {
      newErrors.last_name = 'Last name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.last_name)) {
      newErrors.last_name = 'Last name can only contain letters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.termsAccepted) {
      newErrors.terms = 'You must accept the Terms of Service';
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

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, photo: 'Please select an image file' }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, photo: 'Image size must be less than 5MB' }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setFormData(prev => ({ ...prev, profile_photo_url: reader.result }));
      };
      reader.readAsDataURL(file);

      if (errors.photo) {
        setErrors(prev => ({ ...prev, photo: '' }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        role: formData.role,
        password: formData.password,
        profile_photo_url: formData.profile_photo_url || undefined
      };

      await register(registrationData);
      alert('Registration successful! Please login with your credentials.');
      navigate('/login');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      const validationErrors = err.response?.data?.errors;

      if (validationErrors && Array.isArray(validationErrors)) {
        const newErrors = {};
        validationErrors.forEach(error => {
          newErrors[error.field] = error.message;
        });
        setErrors(newErrors);
      } else {
        setGeneralError(errorMessage);
      }
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
            Join VendorBridge Today
          </h1>
          <p className="text-xl text-[#bbf7d0] mb-12">
            Start streamlining your procurement process in minutes
          </p>

          {/* Step Cards */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-all duration-200 hover:bg-white/15">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#bbf7d0] rounded-full flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-6 h-6 text-[#15803d]" />
                </div>
                <div>
                  <div className="text-sm text-[#bbf7d0] mb-1">Step 1</div>
                  <h3 className="font-bold text-lg">Create Account</h3>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-all duration-200 hover:bg-white/15">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#bbf7d0] rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-[#15803d]" />
                </div>
                <div>
                  <div className="text-sm text-[#bbf7d0] mb-1">Step 2</div>
                  <h3 className="font-bold text-lg">Add Your Vendors</h3>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-all duration-200 hover:bg-white/15">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#bbf7d0] rounded-full flex items-center justify-center flex-shrink-0">
                  <FileSearch className="w-6 h-6 text-[#15803d]" />
                </div>
                <div>
                  <div className="text-sm text-[#bbf7d0] mb-1">Step 3</div>
                  <h3 className="font-bold text-lg">Send RFQs</h3>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-all duration-200 hover:bg-white/15">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#bbf7d0] rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-[#15803d]" />
                </div>
                <div>
                  <div className="text-sm text-[#bbf7d0] mb-1">Step 4</div>
                  <h3 className="font-bold text-lg">Generate POs</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Text */}
        <div className="text-[#bbf7d0] text-sm">
          Join 500+ procurement teams already using VendorBridge
        </div>
      </div>

      {/* RIGHT PANEL - White Background */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col overflow-y-auto">
        {/* Top Right Help */}
        <div className="p-6 text-right">
          <span className="text-sm text-gray-500">
            Need help?{' '}
            <a href="mailto:support@vendorbridge.com" className="text-[#16a34a] hover:underline">
              support@vendorbridge.com
            </a>
          </span>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[600px] py-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <UserPlus className="w-8 h-8 text-[#16a34a]" />
                <h2 className="text-3xl font-bold text-[#111827]">Create Your Account</h2>
              </div>
              <p className="text-[#6b7280]">Fill in your details to get started</p>
            </div>

            {/* Profile Photo Upload */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-24 h-24 bg-[#f3f4f6] rounded-full flex items-center justify-center overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-[#16a34a] hover:bg-[#15803d] rounded-full flex items-center justify-center cursor-pointer transition-all duration-200">
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            {errors.photo && (
              <div className="text-center mb-4 flex items-center justify-center gap-1 text-[#dc2626] text-sm">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.photo}</span>
              </div>
            )}

            {/* Divider */}
            <div className="w-full h-px bg-gray-200 mb-8"></div>

            {/* Error Message */}
            {generalError && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-[#dc2626] text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Fields - 2 Columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className={`w-full h-11 pl-10 pr-4 border ${
                        errors.first_name ? 'border-red-500' : 'border-[#e5e7eb]'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-200`}
                      placeholder="John"
                    />
                  </div>
                  {errors.first_name && (
                    <div className="mt-1 flex items-center gap-1 text-[#dc2626] text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.first_name}</span>
                    </div>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-2">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className={`w-full h-11 pl-10 pr-4 border ${
                        errors.last_name ? 'border-red-500' : 'border-[#e5e7eb]'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-200`}
                      placeholder="Doe"
                    />
                  </div>
                  {errors.last_name && (
                    <div className="mt-1 flex items-center gap-1 text-[#dc2626] text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.last_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Email & Phone - 2 Columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
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
                    <div className="mt-1 flex items-center gap-1 text-[#dc2626] text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.email}</span>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full h-11 pl-10 pr-4 border ${
                        errors.phone ? 'border-red-500' : 'border-[#e5e7eb]'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-200`}
                      placeholder="+1-555-1234"
                    />
                  </div>
                  {errors.phone && (
                    <div className="mt-1 flex items-center gap-1 text-[#dc2626] text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`w-full h-11 pl-10 pr-4 border ${
                      errors.role ? 'border-red-500' : 'border-[#e5e7eb]'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-200 appearance-none bg-white`}
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.role && (
                  <div className="mt-1 flex items-center gap-1 text-[#dc2626] text-sm">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.role}</span>
                  </div>
                )}
              </div>

              {/* Password Fields - 2 Columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* Password */}
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
                      placeholder="••••••••"
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
                    <div className="mt-1 flex items-center gap-1 text-[#dc2626] text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.password}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full h-11 pl-10 pr-12 border ${
                        errors.confirmPassword ? 'border-red-500' : 'border-[#e5e7eb]'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] transition-all duration-200`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-[18px] h-[18px]" />
                      ) : (
                        <Eye className="w-[18px] h-[18px]" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <div className="mt-1 flex items-center gap-1 text-[#dc2626] text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.confirmPassword}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms Checkbox */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#16a34a] focus:ring-[#16a34a]"
                  />
                  <span className="text-sm text-[#6b7280]">
                    I agree to the{' '}
                    <a href="#" className="text-[#16a34a] hover:underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-[#16a34a] hover:underline">
                      Privacy Policy
                    </a>
                  </span>
                </label>
                {errors.terms && (
                  <div className="mt-1 flex items-center gap-1 text-[#dc2626] text-sm">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.terms}</span>
                  </div>
                )}
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <p className="mt-6 text-center text-sm text-[#6b7280]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-[#16a34a] hover:text-[#15803d] transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
