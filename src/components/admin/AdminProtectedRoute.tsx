
import { Navigate, Outlet } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';

export function AdminProtectedRoute() {
  const { isAdmin, loading } = useAdmin();

  // Show loading while checking admin status
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Redirect to homepage if not an admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Render the child routes if the user is an admin
  return <Outlet />;
}
