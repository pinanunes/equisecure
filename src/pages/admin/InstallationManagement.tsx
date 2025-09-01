import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import AdminLayout from '../../components/AdminLayout';
import type { Exploracao } from '../../types';

interface InstallationWithLastEvaluation extends Exploracao {
  lastEvaluationDate?: string;
  lastEvaluationScore?: number;
  evaluationCount: number;
  active: boolean;
}

const InstallationManagement: React.FC = () => {
  const [installations, setInstallations] = useState<InstallationWithLastEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchInstallations();
  }, []);

  const fetchInstallations = async () => {
    try {
      // Fazemos uma única query à nossa nova view otimizada
      const { data, error } = await supabase
        .from('installations_with_stats') // <-- A ÚNICA MUDANÇA É AQUI
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching installations:', error);
        throw error;
      }

      // Os dados já vêm formatados, só precisamos de os definir no estado
      setInstallations(data || []);

    } catch (error) {
      console.error('Error in fetchInstallations:', error);
    } finally {
      setLoading(false);
    }
  };

      
  const toggleInstallationStatus = async (installationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('installations')
        .update({ active: !currentStatus })
        .eq('id', installationId);

      if (error) {
        console.error('Error updating installation status:', error);
        alert('Erro ao atualizar o estado da exploração. Verifique se a coluna "active" existe na base de dados.');
        return;
      }

      // Update local state
      setInstallations(prev => 
        prev.map(installation => 
          installation.id === installationId 
            ? { ...installation, active: !currentStatus }
            : installation
        )
      );
    } catch (error) {
      console.error('Error in toggleInstallationStatus:', error);
      alert('Erro ao atualizar o estado da exploração.');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca avaliada';
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRiskLevel = (score?: number) => {
    if (score === undefined) return { level: 'N/A', color: 'text-gray-500' };
    if (score <= 0.3) return { level: 'Baixo', color: 'text-green-600' };
    if (score <= 0.6) return { level: 'Médio', color: 'text-yellow-600' };
    return { level: 'Alto', color: 'text-red-600' };
  };

  const filteredInstallations = installations.filter(installation => {
    if (filter === 'active') return installation.active;
    if (filter === 'inactive') return !installation.active;
    return true;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-charcoal">A carregar explorações...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-charcoal">Gestão de Explorações</h1>
          
          {/* Filter buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-forest-green text-white'
                  : 'bg-gray-200 text-charcoal hover:bg-gray-300'
              }`}
            >
              Todas ({installations.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'active'
                  ? 'bg-forest-green text-white'
                  : 'bg-gray-200 text-charcoal hover:bg-gray-300'
              }`}
            >
              Ativas ({installations.filter(i => i.active).length})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'inactive'
                  ? 'bg-forest-green text-white'
                  : 'bg-gray-200 text-charcoal hover:bg-gray-300'
              }`}
            >
              Inativas ({installations.filter(i => !i.active).length})
            </button>
          </div>
        </div>

        {/* Installations Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {filteredInstallations.length === 0 ? (
            <div className="px-4 py-5 sm:px-6 text-center">
              <p className="text-gray-500">
                {filter === 'all' 
                  ? 'Nenhuma exploração encontrada.' 
                  : `Nenhuma exploração ${filter === 'active' ? 'ativa' : 'inativa'} encontrada.`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exploração
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proprietário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última Avaliação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avaliações
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInstallations.map((installation) => {
                    const risk = getRiskLevel(installation.lastEvaluationScore);
                    return (
                      <tr key={installation.id} className={installation.active ? '' : 'bg-gray-50 opacity-75'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-charcoal">
                              {installation.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {installation.region && `${installation.region} • `}
                              {installation.type}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(installation as any).user_email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(installation.lastEvaluationDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${risk.color}`}>
                              {installation.lastEvaluationScore 
                                ? `${(installation.lastEvaluationScore * 100).toFixed(1)}%`
                                : 'N/A'
                              }
                            </span>
                            {installation.lastEvaluationScore !== undefined && (
                              <span className={`ml-2 text-xs ${risk.color}`}>
                                ({risk.level})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {installation.evaluationCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            installation.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {installation.active ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => toggleInstallationStatus(installation.id, installation.active)}
                            className={`${
                              installation.active
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {installation.active ? 'Desativar' : 'Ativar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-charcoal mb-4">Resumo</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-charcoal">{installations.length}</div>
              <div className="text-sm text-gray-600">Total de Explorações</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{installations.filter(i => i.active).length}</div>
              <div className="text-sm text-gray-600">Explorações Ativas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{installations.filter(i => !i.active).length}</div>
              <div className="text-sm text-gray-600">Explorações Inativas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {installations.reduce((sum, i) => sum + i.evaluationCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Total de Avaliações</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default InstallationManagement;
