import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import AdminLayout from '../../components/AdminLayout';
import type { Evaluation, Exploracao } from '../../types';

interface AssessmentWithDetails extends Evaluation {
  installation: Exploracao;
  user_email: string;
  section_scores?: Array<{ section_id: string; score: number }>;
}

const AssessmentManagement: React.FC = () => {
  const [assessments, setAssessments] = useState<AssessmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      // First, fetch evaluations with installations
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('evaluations')
        .select(`
          *,
          installation:installations(*)
        `)
        .order('created_at', { ascending: false });

      if (evaluationsError) {
        console.error('Error fetching assessments:', evaluationsError);
        return;
      }

      // Then, fetch user emails for each evaluation
      const assessmentsWithDetails: AssessmentWithDetails[] = [];

      for (const evaluation of evaluationsData || []) {
        // Fetch user profile for this evaluation
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', evaluation.user_id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile for evaluation:', evaluation.id, profileError);
        }

        assessmentsWithDetails.push({
          ...evaluation,
          installation: evaluation.installation,
          user_email: profileData?.email || 'Email não encontrado'
        });
      }

      setAssessments(assessmentsWithDetails);
    } catch (error) {
      console.error('Error in fetchAssessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRiskLevel = (score: number) => {
    if (score <= 0.3) return { level: 'Baixo', color: 'text-green-600' };
    if (score <= 0.6) return { level: 'Médio', color: 'text-yellow-600' };
    return { level: 'Alto', color: 'text-red-600' };
  };

  const exportScores = async () => {
    setExporting(true);
    try {
      // Prepare CSV data for scores
      const csvHeaders = [
        'Nome da Exploração',
        'Utilizador',
        'Data',
        'Score Total (%)'
      ];

      // Add section score headers dynamically
      const sectionHeaders: string[] = [];
      if (assessments.length > 0) {
        const firstAssessment = assessments[0];
        if (firstAssessment.section_scores) {
          const sectionScores = firstAssessment.section_scores as Array<{ section_id: string; score: number }>;
          sectionScores.forEach((_, index) => {
            sectionHeaders.push(`Score Secção ${index + 1} (%)`);
          });
        }
      }

      const allHeaders = [...csvHeaders, ...sectionHeaders];

      const csvRows = assessments.map(assessment => {
        const baseRow = [
          assessment.installation.name,
          assessment.user_email,
          formatDate(assessment.created_at),
          (assessment.total_score * 100).toFixed(1)
        ];

        // Add section scores
        const sectionScores: string[] = [];
        if (assessment.section_scores) {
          const scores = assessment.section_scores as Array<{ section_id: string; score: number }>;
          scores.forEach(sectionScore => {
            sectionScores.push((sectionScore.score * 100).toFixed(1));
          });
        }

        return [...baseRow, ...sectionScores];
      });

      // Create CSV content
      const csvContent = [
        allHeaders.join(';'),
        ...csvRows.map(row => row.join(';'))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `avaliacoes_scores_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting scores:', error);
      alert('Erro ao exportar scores.');
    } finally {
      setExporting(false);
    }
  };

  const exportFullData = async () => {
    setExporting(true);
    try {
      // Fetch detailed assessment data with answers (without user:profiles join)
      const { data: detailedAssessments, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          installation:installations(*),
          evaluation_answers(
            question_id,
            selected_options,
            text_answer
          ),
          questionnaire:questionnaires(
            sections(
              id,
              name,
              questions(
                id,
                text,
                type,
                options:question_options(*)
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching detailed assessments:', error);
        alert('Erro ao buscar dados detalhados das avaliações.');
        return;
      }

      // Fetch user emails for each assessment
      const assessmentsWithUserEmails = [];
      for (const assessment of detailedAssessments || []) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', assessment.user_id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile for assessment:', assessment.id, profileError);
        }

        assessmentsWithUserEmails.push({
          ...assessment,
          user_email: profileData?.email || 'Email não encontrado'
        });
      }

      // Prepare CSV headers
      const csvHeaders = [
        'Nome da Exploração',
        'Utilizador',
        'Data',
        'Secção',
        'Pergunta',
        'Resposta'
      ];

      const csvRows: string[] = [];

      assessmentsWithUserEmails.forEach(assessment => {
        const baseInfo = [
          assessment.installation.name,
          assessment.user_email,
          formatDate(assessment.created_at)
        ];

        assessment.questionnaire?.sections?.forEach((section: any) => {
          section.questions?.forEach((question: any) => {
            const answer = assessment.evaluation_answers?.find(
              (a: any) => a.question_id === question.id
            );

            let responseText = 'Sem resposta';
            
            if (answer) {
              if (question.type === 'text') {
                responseText = answer.text_answer || 'Sem resposta';
              } else if (answer.selected_options) {
                const selectedOptionTexts = question.options
                  ?.filter((opt: any) => answer.selected_options?.includes(opt.id))
                  .map((opt: any) => opt.text) || [];
                responseText = selectedOptionTexts.join(', ') || 'Sem resposta';
              }
            }

            csvRows.push([
              ...baseInfo,
              section.name,
              question.text,
              responseText
            ].join(';'));
          });
        });
      });

      // Create CSV content
      const csvContent = [
        csvHeaders.join(';'),
        ...csvRows
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `avaliacoes_completas_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting full data:', error);
      alert('Erro ao exportar dados completos.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-charcoal">A carregar avaliações...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-charcoal">Gestão de Avaliações</h1>
          
          {/* Export buttons */}
          <div className="flex space-x-3">
            <button
              onClick={exportScores}
              disabled={exporting || assessments.length === 0}
              className="bg-sage-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-sage-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'A exportar...' : 'Exportar Scores'}
            </button>
            <button
              onClick={exportFullData}
              disabled={exporting || assessments.length === 0}
              className="bg-golden-yellow text-charcoal px-4 py-2 rounded-md text-sm font-medium hover:bg-golden-yellow-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'A exportar...' : 'Exportar Dados Completos'}
            </button>
          </div>
        </div>

        {/* Assessments Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {assessments.length === 0 ? (
            <div className="px-4 py-5 sm:px-6 text-center">
              <p className="text-gray-500">Nenhuma avaliação encontrada.</p>
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
                      Utilizador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assessments.map((assessment) => {
                    const risk = getRiskLevel(assessment.total_score);
                    return (
                      <tr key={assessment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-charcoal">
                              {assessment.installation.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assessment.installation.region && `${assessment.installation.region} • `}
                              {assessment.installation.type}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assessment.user_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(assessment.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${risk.color}`}>
                              {(assessment.total_score * 100).toFixed(1)}%
                            </span>
                            <span className={`ml-2 text-xs ${risk.color}`}>
                              ({risk.level})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            to={`/evaluation-report/${assessment.id}`}
                            state={{ from: '/admin/assessments' }}
                            className="text-forest-green hover:text-forest-green-dark mr-4"
                          >
                            Ver Relatório
                          </Link>
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
              <div className="text-2xl font-bold text-charcoal">{assessments.length}</div>
              <div className="text-sm text-gray-600">Total de Avaliações</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {assessments.filter(a => a.total_score <= 0.3).length}
              </div>
              <div className="text-sm text-gray-600">Risco Baixo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {assessments.filter(a => a.total_score > 0.3 && a.total_score <= 0.6).length}
              </div>
              <div className="text-sm text-gray-600">Risco Médio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {assessments.filter(a => a.total_score > 0.6).length}
              </div>
              <div className="text-sm text-gray-600">Risco Alto</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AssessmentManagement;
