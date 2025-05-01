
import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">EMSIExchangeHub</h2>
            <p className="text-gray-400 text-sm">The marketplace for EMSI students</p>
          </div>
          <div className="mt-4 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} EMSIExchangeHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
