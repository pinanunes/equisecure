import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Evaluation, Exploracao, Questionnaire, Section, Question, QuestionOption } from '../types';

interface EvaluationWithDetails extends Evaluation {
  installation: Exploracao;
  questionnaire: Questionnaire & {
    sections: (Section & {
      questions: (Question & {
        options: QuestionOption[];
      })[];
    })[];
  };
  evaluation_answers: Array<{
    question_id: string;
    selected_options: string[] | null;
    text_answer: string | null;
  }>;
  section_scores: Array<{
    section_id: string;
    score: number;
  }>;
}

const EvaluationReport: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [evaluation, setEvaluation] = useState<EvaluationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (evaluationId) {
      fetchEvaluationReport();
    }
  }, [evaluationId]);

  const fetchEvaluationReport = async () => {
    try {
      // Build query - admins can view any evaluation, regular users only their own
      let query = supabase
        .from('evaluations')
        .select(`
          *,
          installation:installations(*),
          questionnaire:questionnaires(
            *,
            sections(
              *,
              questions(
                *,
                options:question_options(*)
              )
            )
          ),
          evaluation_answers(
            question_id,
            selected_options,
            text_answer
          )
        `)
        .eq('id', evaluationId);

      // Only filter by user_id if the user is not an admin
      if (user?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query.single();

      if (error) {
        console.error('Error fetching evaluation report:', error);
        // Navigate back to appropriate page based on user role
        navigate(user?.role === 'admin' ? '/admin/assessments' : '/dashboard');
        return;
      }

      setEvaluation(data as EvaluationWithDetails);
    } catch (error) {
      console.error('Error in fetchEvaluationReport:', error);
      // Navigate back to appropriate page based on user role
      navigate(user?.role === 'admin' ? '/admin/assessments' : '/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getScoreGradient = (percentage: number) => {
    const green = Math.max(0, 255 - (percentage * 2.55));
    const red = Math.min(255, percentage * 2.55);
    return `rgb(${red}, ${green}, 0)`;
  };

  const getRiskLevel = (score: number) => {
    const percentage = score * 100;
    if (percentage <= 25) return { level: 'Baixo', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (percentage <= 50) return { level: 'Médio', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    if (percentage <= 75) return { level: 'Alto', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    return { level: 'Muito Alto', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const generateImprovementRecommendations = () => {
    if (!evaluation) return [];

    const recommendations: Array<{
      question: string;
      currentAnswer: string;
      recommendation: string;
      section: string;
    }> = [];

    evaluation.questionnaire.sections.forEach(section => {
      section.questions?.forEach(question => {
        if (question.type === 'text') return; // Skip text questions

        const answer = evaluation.evaluation_answers.find(a => a.question_id === question.id);
        if (!answer || !answer.selected_options) return;

        // Find the minimum possible score for this question
        const minScore = question.options?.reduce((min, current) => 
          current.score < min ? current.score : min
        , Number.MAX_VALUE) ?? 0;

        // Get the selected options
        const selectedOptions = question.options?.filter(opt => 
          answer.selected_options?.includes(opt.id)
        ) || [];

        // Check if any selected option has a score higher than the minimum
        const hasSuboptimalAnswer = selectedOptions.some(opt => opt.score > minScore);

        if (hasSuboptimalAnswer) {
          const currentAnswerText = selectedOptions.map(opt => opt.text).join(', ') || 'Nenhuma resposta';
          
          // Find the best option(s) with minimum score for the recommendation
          const bestOptions = question.options?.filter(opt => opt.score === minScore) || [];
          const bestOptionText = bestOptions.map(opt => opt.text).join(' ou ');
          
          recommendations.push({
            question: question.text,
            currentAnswer: currentAnswerText,
            recommendation: question.improvement_tip || `Considere implementar: ${bestOptionText}`,
            section: section.name
          });
        }
      });
    });

    return recommendations;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-charcoal">A carregar relatório...</div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-charcoal mb-4">Relatório não encontrado</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-forest-green text-white px-4 py-2 rounded-md hover:bg-forest-green-dark"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalRisk = getRiskLevel(evaluation.total_score);
  const sectionScores = evaluation.section_scores as Array<{ section_id: string; score: number }>;
  const recommendations = generateImprovementRecommendations();

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-charcoal mb-2">Relatório de Avaliação</h1>
              <h2 className="text-xl text-gray-700 mb-1">{evaluation.installation.name}</h2>
              <p className="text-gray-600">
                Avaliado em {formatDate(evaluation.created_at)}
              </p>
              {evaluation.installation.region && (
                <p className="text-sm text-gray-500">Região: {evaluation.installation.region}</p>
              )}
              {evaluation.installation.type && (
                <p className="text-sm text-gray-500">Tipo: {evaluation.installation.type}</p>
              )}
            </div>
            <div className="flex space-x-3">
              {/* Only show Reavaliar button for non-admin users */}
              {user?.role !== 'admin' && (
                <button
                  onClick={() => navigate(`/evaluate?installation=${evaluation.installation.id}`)}
                  className="bg-sage-green text-white px-4 py-2 rounded-md hover:bg-sage-green-dark"
                >
                  Reavaliar
                </button>
              )}
              <button
                onClick={() => navigate(user?.role === 'admin' ? '/admin/assessments' : '/dashboard')}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold text-charcoal mb-4">Score Total de Biossegurança</h3>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${totalRisk.bgColor} ${totalRisk.color}`}>
                Risco {totalRisk.level}
              </div>
              <p className="text-2xl font-bold text-charcoal mt-2">
                {(evaluation.total_score * 100).toFixed(1)}%
              </p>
            </div>
            <div className="w-64">
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className="h-6 rounded-full transition-all duration-300"
                  style={{
                    width: `${evaluation.total_score * 100}%`,
                    backgroundColor: getScoreGradient(evaluation.total_score * 100)
                  }}
                />
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm">
            {evaluation.total_score <= 0.25 
              ? "Excelente! A sua exploração apresenta um nível de risco muito baixo."
              : evaluation.total_score <= 0.5
              ? "Bom nível de biossegurança, mas há algumas áreas que podem ser melhoradas."
              : evaluation.total_score <= 0.75
              ? "Nível de risco moderado. Recomendamos implementar as melhorias sugeridas."
              : "Nível de risco elevado. É importante implementar urgentemente as medidas de biossegurança recomendadas."
            }
          </p>
        </div>

        {/* Section Scores */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold text-charcoal mb-4">Avaliação por Secção</h3>
          
          <div className="space-y-4">
            {evaluation.questionnaire.sections.map(section => {
              const sectionScore = sectionScores.find(s => s.section_id === section.id);
              const score = sectionScore?.score || 0;
              const risk = getRiskLevel(score);
              
              return (
                <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-charcoal">{section.name}</h4>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${risk.bgColor} ${risk.color}`}>
                      {risk.level}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${score * 100}%`,
                            backgroundColor: getScoreGradient(score * 100)
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-charcoal min-w-0">
                      {(score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Improvement Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-bold text-charcoal mb-4">
              Recomendações de Melhoria ({recommendations.length})
            </h3>
            
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="border-l-4 border-golden-yellow bg-golden-yellow bg-opacity-10 p-4 rounded-r-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-golden-yellow rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-charcoal">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-charcoal mb-1">{rec.section}</h4>
                      <p className="text-sm text-gray-700 mb-2">{rec.question}</p>
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Resposta atual:</strong> {rec.currentAnswer}
                        </p>
                        <p className="text-sm text-forest-green">
                          <strong>Recomendação:</strong> {rec.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {recommendations.length === 0 && (
              <div className="text-center py-8">
                <div className="text-green-600 text-4xl mb-4">✓</div>
                <h4 className="text-lg font-medium text-charcoal mb-2">Parabéns!</h4>
                <p className="text-gray-600">
                  A sua exploração já implementa as melhores práticas de biossegurança em todas as áreas avaliadas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Admin-only: Detailed Questions and Answers */}
        {user?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-charcoal mb-4">
              Respostas Detalhadas (Visualização de Administrador)
            </h3>
            
            <div className="space-y-6">
              {evaluation.questionnaire.sections.map((section, sectionIndex) => (
                <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-charcoal mb-4 border-b border-gray-200 pb-2">
                    {sectionIndex + 1}. {section.name}
                  </h4>
                  
                  <div className="space-y-4">
                    {section.questions?.map((question, questionIndex) => {
                      const answer = evaluation.evaluation_answers.find(a => a.question_id === question.id);
                      
                      let answerText = 'Sem resposta';
                      if (answer) {
                        if (question.type === 'text') {
                          answerText = answer.text_answer || 'Sem resposta';
                        } else if (answer.selected_options) {
                          const selectedOptions = question.options?.filter(opt => 
                            answer.selected_options?.includes(opt.id)
                          ) || [];
                          answerText = selectedOptions.map(opt => opt.text).join(', ') || 'Sem resposta';
                        }
                      }
                      
                      return (
                        <div key={question.id} className="bg-gray-50 rounded p-3">
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {sectionIndex + 1}.{questionIndex + 1}
                            </span>
                            <p className="text-sm text-charcoal mt-1">{question.text}</p>
                          </div>
                          
                          <div className="border-l-3 border-blue-400 pl-3">
                            <p className="text-sm text-gray-700">
                              <strong>Resposta:</strong> {answerText}
                            </p>
                            {question.type !== 'text' && answer?.selected_options && (
                              <div className="mt-2">
                                {question.options?.filter(opt => 
                                  answer.selected_options?.includes(opt.id)
                                ).map(opt => (
                                  <span key={opt.id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                                    Score: {opt.score}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationReport;
