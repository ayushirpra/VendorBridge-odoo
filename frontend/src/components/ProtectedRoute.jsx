import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Loader2 } from 'lucide-react';

/**
 * PrivateRoute / ProtectedRoute
 * - Reads token from localStorage
 * - Decodes with jwt-decode and checks expiry
 * - Expired → clears localStorage, redirects to /login
 * - No token → redirects to /login immediately
 * - Valid → renders children with a brief loading spinner
 */
const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState('checking'); // 'checking' | 'valid' | 'invalid'

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setStatus('invalid');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp && decoded.exp < now) {
        // Token is expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setStatus('invalid');
      } else {
        setStatus('valid');
      }
    } catch {
      // Malformed token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setStatus('invalid');
    }
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#16a34a] animate-spin" />
          <span className="text-sm text-[#6b7280] font-medium">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
