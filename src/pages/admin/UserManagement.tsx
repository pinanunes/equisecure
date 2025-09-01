import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import AdminLayout from '../../components/AdminLayout';
import type { Profile } from '../../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Chamamos a nossa nova função da base de dados com 'rpc'
      const { data, error } = await supabase
        .rpc('get_users_with_stats')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users with stats:', error);
        throw error;
      }
      
      setUsers(data || []);

    } catch (error) {
      console.error('Error in fetchUsers:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        alert('Erro ao atualizar o papel do utilizador');
      } else {
        // Update local state
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        alert(`Utilizador ${newRole === 'admin' ? 'promovido a administrador' : 'rebaixado a utilizador'} com sucesso`);
      }
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      alert('Erro ao atualizar o papel do utilizador');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-charcoal">A carregar utilizadores...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-charcoal">Gestão de Utilizadores</h1>
          <div className="text-sm text-gray-600">
            Total: {users.length} utilizadores
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-charcoal">
              Lista de Utilizadores
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Gerir papéis e permissões dos utilizadores
            </p>
          </div>
          
          {users.length === 0 ? (
            <div className="px-4 py-5 sm:px-6 text-center">
              <p className="text-gray-500">Nenhum utilizador encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilizador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Explorações
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avaliações
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Papel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Registo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-forest-green flex items-center justify-center">
                              <span className="text-white font-medium">
                                {user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-charcoal">
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {user.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                        {user.installation_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                        {user.evaluation_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-golden-yellow text-charcoal' 
                            : 'bg-sage-green text-white'
                        }`}>
                          {user.role === 'admin' ? 'Administrador' : 'Utilizador'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {user.role === 'user' ? (
                          <button
                            onClick={() => updateUserRole(user.id, 'admin')}
                            disabled={updating === user.id}
                            className="bg-golden-yellow text-charcoal px-3 py-1 rounded text-sm hover:bg-golden-yellow-dark disabled:opacity-50"
                          >
                            {updating === user.id ? 'A atualizar...' : 'Promover a Admin'}
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUserRole(user.id, 'user')}
                            disabled={updating === user.id}
                            className="bg-warm-brown text-white px-3 py-1 rounded text-sm hover:bg-warm-brown-dark disabled:opacity-50"
                          >
                            {updating === user.id ? 'A atualizar...' : 'Remover Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-charcoal mb-2">Estatísticas de Utilizadores</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total de Utilizadores:</span>
                <span className="font-medium">{users.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Administradores:</span>
                <span className="font-medium">{users.filter(u => u.role === 'admin').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Utilizadores Regulares:</span>
                <span className="font-medium">{users.filter(u => u.role === 'user').length}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-charcoal mb-2">Ações Disponíveis</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Promover utilizadores a administradores</p>
              <p>• Remover privilégios de administrador</p>
              <p>• Ver informações detalhadas dos utilizadores</p>
              <p>• Monitorizar atividade de registo</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserManagement;
