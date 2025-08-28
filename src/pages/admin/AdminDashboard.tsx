import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import AdminLayout from '../../components/AdminLayout';

interface DashboardStats {
  totalUsers: number;
  totalExploracoes: number;
  totalEvaluations: number;
  averageScore: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalExploracoes: 0,
    totalEvaluations: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total installations
      const { count: installationsCount } = await supabase
        .from('installations')
        .select('*', { count: 'exact', head: true });

      // Fetch total evaluations and average score
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('total_score');

      const totalEvaluations = evaluations?.length || 0;
      const averageScore = evaluations?.length 
        ? evaluations.reduce((sum, evaluation) => sum + evaluation.total_score, 0) / evaluations.length
        : 0;

      setStats({
        totalUsers: usersCount || 0,
        totalExploracoes: installationsCount || 0,
        totalEvaluations,
        averageScore,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Utilizadores',
      value: stats.totalUsers,
      icon: '👥',
      color: 'bg-blue-500',
    },
    {
      title: 'Total de Explorações',
      value: stats.totalExploracoes,
      icon: '🏢',
      color: 'bg-green-500',
    },
    {
      title: 'Total de Avaliações',
      value: stats.totalEvaluations,
      icon: '📊',
      color: 'bg-yellow-500',
    },
    {
      title: 'Score Médio de Biossegurança',
      value: `${(stats.averageScore * 100).toFixed(1)}%`,
      icon: '🎯',
      color: 'bg-purple-500',
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-charcoal">A carregar estatísticas...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-charcoal mb-8">Dashboard de Administração</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`${card.color} rounded-lg p-3 mr-4`}>
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-charcoal">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-charcoal mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/users"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">👥</span>
                <div>
                  <h3 className="font-medium text-charcoal">Gerir Utilizadores</h3>
                  <p className="text-sm text-gray-600">Ver e gerir contas de utilizadores</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/admin/installations"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🏢</span>
                <div>
                  <h3 className="font-medium text-charcoal">Ver Explorações</h3>
                  <p className="text-sm text-gray-600">Consultar todas as explorações avaliadas</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/admin/assessments"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <h3 className="font-medium text-charcoal">Ver Avaliações</h3>
                  <p className="text-sm text-gray-600">Consultar todas as avaliações realizadas</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/admin/questionnaires"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">📝</span>
                <div>
                  <h3 className="font-medium text-charcoal">Gerir Questionários</h3>
                  <p className="text-sm text-gray-600">Criar e editar questionários de avaliação</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
