import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import AdminLayout from '../../components/AdminLayout';
import type { Questionnaire } from '../../types';

const QuestionnaireManagement: React.FC = () => {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newQuestionnaireName, setNewQuestionnaireName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  const fetchQuestionnaires = async () => {
    try {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questionnaires:', error);
      } else {
        setQuestionnaires(data || []);
      }
    } catch (error) {
      console.error('Error in fetchQuestionnaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const createQuestionnaire = async () => {
    if (!newQuestionnaireName.trim()) {
      alert('Por favor, introduza um nome para o questionário');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('questionnaires')
        .insert([
          {
            name: newQuestionnaireName.trim(),
            version: 1,
            is_active: false,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating questionnaire:', error);
        alert('Erro ao criar questionário');
      } else {
        setQuestionnaires([data, ...questionnaires]);
        setNewQuestionnaireName('');
        setShowCreateForm(false);
        alert('Questionário criado com sucesso!');
      }
    } catch (error) {
      console.error('Error in createQuestionnaire:', error);
      alert('Erro ao criar questionário');
    } finally {
      setCreating(false);
    }
  };

  const toggleActiveQuestionnaire = async (questionnaireId: string, currentStatus: boolean) => {
    try {
      if (!currentStatus) {
        // First, deactivate all other questionnaires
        await supabase
          .from('questionnaires')
          .update({ is_active: false })
          .neq('id', questionnaireId);
      }

      // Then update the selected questionnaire
      const { error } = await supabase
        .from('questionnaires')
        .update({ is_active: !currentStatus })
        .eq('id', questionnaireId);

      if (error) {
        console.error('Error updating questionnaire status:', error);
        alert('Erro ao atualizar estado do questionário');
      } else {
        // Update local state
        setQuestionnaires(questionnaires.map(q => ({
          ...q,
          is_active: q.id === questionnaireId ? !currentStatus : false
        })));
        alert(`Questionário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      }
    } catch (error) {
      console.error('Error in toggleActiveQuestionnaire:', error);
      alert('Erro ao atualizar estado do questionário');
    }
  };

  const deleteQuestionnaire = async (questionnaireId: string, questionnaireName: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar o questionário "${questionnaireName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questionnaires')
        .delete()
        .eq('id', questionnaireId);

      if (error) {
        console.error('Error deleting questionnaire:', error);
        alert('Erro ao eliminar questionário');
      } else {
        setQuestionnaires(questionnaires.filter(q => q.id !== questionnaireId));
        alert('Questionário eliminado com sucesso!');
      }
    } catch (error) {
      console.error('Error in deleteQuestionnaire:', error);
      alert('Erro ao eliminar questionário');
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
          <div className="text-charcoal">A carregar questionários...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-charcoal">Gestão de Questionários</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-forest-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-forest-green-dark"
          >
            Criar Novo Questionário
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-charcoal mb-4">Criar Novo Questionário</h2>
              <div className="mb-4">
                <label htmlFor="questionnaireName" className="block text-sm font-medium text-charcoal mb-2">
                  Nome do Questionário
                </label>
                <input
                  id="questionnaireName"
                  type="text"
                  value={newQuestionnaireName}
                  onChange={(e) => setNewQuestionnaireName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                  placeholder="Ex: Avaliação de Biossegurança v2.0"
                  disabled={creating}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewQuestionnaireName('');
                  }}
                  disabled={creating}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={createQuestionnaire}
                  disabled={creating || !newQuestionnaireName.trim()}
                  className="bg-forest-green text-white px-4 py-2 rounded-md hover:bg-forest-green-dark disabled:opacity-50"
                >
                  {creating ? 'A criar...' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questionnaires List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-charcoal">
              Lista de Questionários
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Gerir questionários de avaliação de biossegurança
            </p>
          </div>
          
          {questionnaires.length === 0 ? (
            <div className="px-4 py-5 sm:px-6 text-center">
              <p className="text-gray-500">Nenhum questionário encontrado.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-2 text-forest-green hover:text-forest-green-dark font-medium"
              >
                Criar o primeiro questionário
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Questionário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Criação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {questionnaires.map((questionnaire) => (
                    <tr key={questionnaire.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-charcoal">
                            {questionnaire.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Versão {questionnaire.version}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          questionnaire.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {questionnaire.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(questionnaire.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Link
                          to={`/admin/questionnaires/${questionnaire.id}/edit`}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => toggleActiveQuestionnaire(questionnaire.id, questionnaire.is_active)}
                          className={`px-3 py-1 rounded text-sm ${
                            questionnaire.is_active
                              ? 'bg-gray-500 text-white hover:bg-gray-600'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          {questionnaire.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => deleteQuestionnaire(questionnaire.id, questionnaire.name)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-charcoal mb-2">Estatísticas</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total de Questionários:</span>
                <span className="font-medium">{questionnaires.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Questionários Ativos:</span>
                <span className="font-medium">{questionnaires.filter(q => q.is_active).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Questionários Inativos:</span>
                <span className="font-medium">{questionnaires.filter(q => !q.is_active).length}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-charcoal mb-2">Ações Disponíveis</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Criar novos questionários</p>
              <p>• Editar questionários existentes</p>
              <p>• Ativar/desativar questionários</p>
              <p>• Eliminar questionários não utilizados</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-charcoal mb-2">Informação</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Apenas um questionário pode estar ativo de cada vez</p>
              <p>• O questionário ativo é usado para novas avaliações</p>
              <p>• Questionários com avaliações não podem ser eliminados</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default QuestionnaireManagement;
