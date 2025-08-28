import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin', current: location.pathname === '/admin' },
    { name: 'Utilizadores', href: '/admin/users', current: location.pathname === '/admin/users' },
    { name: 'Explorações', href: '/admin/installations', current: location.pathname === '/admin/installations' },
    { name: 'Avaliações', href: '/admin/assessments', current: location.pathname === '/admin/assessments' },
    { name: 'Questionários', href: '/admin/questionnaires', current: location.pathname === '/admin/questionnaires' },
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-forest-green shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">EquiSecure Admin</h1>
              <p className="text-sage-green">Painel de Administração</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="bg-sage-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-sage-green-dark"
              >
                Voltar ao Dashboard
              </Link>
              <span className="text-white text-sm">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-warm-brown text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-warm-brown-dark"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="bg-white shadow-sm w-64 min-h-screen">
          <div className="p-4">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`block px-4 py-2 rounded-md text-sm font-medium ${
                      item.current
                        ? 'bg-forest-green text-white'
                        : 'text-charcoal hover:bg-sage-green hover:text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
