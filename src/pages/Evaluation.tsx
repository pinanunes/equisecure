import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Questionnaire, Section, Question, QuestionOption, Exploracao } from '../types';

interface QuestionnaireWithSections extends Questionnaire {
  sections: (Section & {
    questions: (Question & {
      options: QuestionOption[];
    })[];
  })[];
}

interface UserAnswer {
  questionId: string;
  selectedOptions: string[]; // For multiple choice and checkbox
  textAnswer?: string; // For text questions
}

interface SectionScore {
  sectionId: string;
  currentScore: number;
  maxScore: number;
  percentage: number;
}

const Evaluation: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [sectionScores, setSectionScores] = useState<SectionScore[]>([]);
  const [totalScore, setTotalScore] = useState({ current: 0, max: 0, percentage: 0 });
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  
  // Exploração management state
  const [exploracaoId, setExploracaoId] = useState<string | null>(null);
  const [showExploracaoForm, setShowExploracaoForm] = useState(false);
  const [exploracaoForm, setExploracaoForm] = useState({
    name: '',
    region: '',
    type: ''
  });

  useEffect(() => {
    fetchActiveQuestionnaire();
    initializeEvaluation();
  }, []);

  useEffect(() => {
    if (questionnaire) {
      calculateScores();
    }
  }, [answers, questionnaire]);

  const initializeEvaluation = async () => {
    const installationParam = searchParams.get('installation');
    
    if (installationParam) {
      // This is a re-evaluation
      setExploracaoId(installationParam);
      
      try {
        // Fetch the exploração data
        const { data: exploracaoData, error: exploracaoError } = await supabase
          .from('installations')
          .select('*')
          .eq('id', installationParam)
          .eq('user_id', user?.id)
          .single();

        if (exploracaoError) {
          console.error('Error fetching exploração:', exploracaoError);
          return;
        }

        // Fetch the most recent evaluation for this exploração
        const { data: latestEvaluation, error: evaluationError } = await supabase
          .from('evaluations')
          .select(`
            *,
            evaluation_answers (
              question_id,
              selected_options,
              text_answer
            )
          `)
          .eq('installation_id', installationParam)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!evaluationError && latestEvaluation) {
          // Pre-fill answers from the latest evaluation
          const preFilledAnswers: UserAnswer[] = latestEvaluation.evaluation_answers.map((answer: any) => ({
            questionId: answer.question_id,
            selectedOptions: answer.selected_options || [],
            textAnswer: answer.text_answer || undefined
          }));
          
          setAnswers(preFilledAnswers);
        }
      } catch (error) {
        console.error('Error in initializeEvaluation:', error);
      }
    } else {
      // This is a new evaluation - show exploração form
      setShowExploracaoForm(true);
    }
  };

  const fetchActiveQuestionnaire = async () => {
    try {
      const { data: questionnaireData, error: questionnaireError } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('is_active', true)
        .single();

      if (questionnaireError) {
        console.error('Error fetching active questionnaire:', questionnaireError);
        return;
      }

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select(`
          *,
          questions (
            *,
            options:question_options (*)
          )
        `)
        .eq('questionnaire_id', questionnaireData.id)
        .order('order_index');

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
        return;
      }

      const questionnaire: QuestionnaireWithSections = {
        ...questionnaireData,
        sections: sectionsData || []
      };

      setQuestionnaire(questionnaire);
      
      // Initialize section scores
      const initialScores = questionnaire.sections.map(section => ({
        sectionId: section.id,
        currentScore: 0,
        maxScore: section.questions.reduce((sum, q) => sum + q.max_score, 0),
        percentage: 0
      }));
      setSectionScores(initialScores);
      
    } catch (error) {
      console.error('Error in fetchActiveQuestionnaire:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateScores = () => {
    if (!questionnaire) return;

    const updatedSectionScores = questionnaire.sections.map(section => {
      let sectionCurrentScore = 0;
      let sectionMaxScore = 0;

      section.questions.forEach(question => {
        sectionMaxScore += question.max_score;
        
        const answer = answers.find(a => a.questionId === question.id);
        if (answer && question.type !== 'text') {
          if (question.type === 'multiple_choice') {
            // For multiple choice, use the score of the selected option
            const selectedOption = question.options?.find(opt => 
              answer.selectedOptions.includes(opt.id)
            );
            if (selectedOption) {
              sectionCurrentScore += selectedOption.score;
            }
          } else if (question.type === 'checkbox') {
            // For checkbox, sum all selected options
            answer.selectedOptions.forEach(optionId => {
              const option = question.options?.find(opt => opt.id === optionId);
              if (option) {
                sectionCurrentScore += option.score;
              }
            });
          }
        }
      });

      return {
        sectionId: section.id,
        currentScore: sectionCurrentScore,
        maxScore: sectionMaxScore,
        percentage: sectionMaxScore > 0 ? (sectionCurrentScore / sectionMaxScore) * 100 : 0
      };
    });

    setSectionScores(updatedSectionScores);

    // Calculate total score
    const totalCurrent = updatedSectionScores.reduce((sum, s) => sum + s.currentScore, 0);
    const totalMax = updatedSectionScores.reduce((sum, s) => sum + s.maxScore, 0);
    
    setTotalScore({
      current: totalCurrent,
      max: totalMax,
      percentage: totalMax > 0 ? (totalCurrent / totalMax) * 100 : 0
    });
  };

  const handleAnswerChange = (questionId: string, selectedOptions: string[], textAnswer?: string) => {
    setAnswers(prev => {
      const existingIndex = prev.findIndex(a => a.questionId === questionId);
      const newAnswer: UserAnswer = {
        questionId,
        selectedOptions,
        textAnswer
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newAnswer;
        return updated;
      } else {
        return [...prev, newAnswer];
      }
    });
  };

  const getScoreGradient = (percentage: number) => {
    const green = Math.max(0, 255 - (percentage * 2.55));
    const red = Math.min(255, percentage * 2.55);
    return `rgb(${red}, ${green}, 0)`;
  };

  const handleCreateExploracao = async () => {
    if (!exploracaoForm.name.trim()) {
      alert('Por favor, insira o nome da exploração.');
      return;
    }

    try {
      const { data: newExploracao, error } = await supabase
        .from('installations')
        .insert({
          user_id: user?.id,
          name: exploracaoForm.name.trim(),
          region: exploracaoForm.region.trim() || null,
          type: exploracaoForm.type.trim() || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating exploração:', error);
        alert('Erro ao criar exploração. Tente novamente.');
        return;
      }

      setExploracaoId(newExploracao.id);
      setShowExploracaoForm(false);
    } catch (error) {
      console.error('Error in handleCreateExploracao:', error);
      alert('Erro ao criar exploração. Tente novamente.');
    }
  };

  const handleCompleteEvaluation = async () => {
    if (!exploracaoId || !questionnaire) {
      alert('Erro: Dados da exploração ou questionário não encontrados.');
      return;
    }

    try {
      // Calculate final scores
      const finalTotalScore = totalScore.max > 0 ? totalScore.current / totalScore.max : 0;
      
      // Create the evaluation record
      const { data: evaluation, error: evaluationError } = await supabase
        .from('evaluations')
        .insert({
          user_id: user?.id,
          installation_id: exploracaoId,
          questionnaire_id: questionnaire.id,
          total_score: finalTotalScore,
          section_scores: sectionScores.map(s => ({
            section_id: s.sectionId,
            score: s.maxScore > 0 ? s.currentScore / s.maxScore : 0
          }))
        })
        .select()
        .single();

      if (evaluationError) {
        console.error('Error creating evaluation:', evaluationError);
        alert('Erro ao guardar avaliação. Tente novamente.');
        return;
      }

      // Save individual answers
      const answersToSave = answers.map(answer => ({
        evaluation_id: evaluation.id,
        question_id: answer.questionId,
        selected_options: answer.selectedOptions.length > 0 ? answer.selectedOptions : null,
        text_answer: answer.textAnswer || null
      }));

      if (answersToSave.length > 0) {
        const { error: answersError } = await supabase
          .from('evaluation_answers')
          .insert(answersToSave);

        if (answersError) {
          console.error('Error saving answers:', answersError);
          // Don't fail the whole process for this
        }
      }

      // Navigate to results page (we'll create this next)
      navigate(`/evaluation-report/${evaluation.id}`);
    } catch (error) {
      console.error('Error in handleCompleteEvaluation:', error);
      alert('Erro ao concluir avaliação. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-charcoal">A carregar questionário...</div>
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-charcoal mb-4">Nenhum questionário ativo</h1>
          <p className="text-charcoal mb-4">Não existe um questionário ativo no momento.</p>
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

  const currentSection = questionnaire.sections[currentSectionIndex];
  const currentSectionScore = sectionScores.find(s => s.sectionId === currentSection?.id);

  // Show exploração form if needed
  if (showExploracaoForm) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-charcoal mb-6">Nova Exploração</h1>
            <p className="text-gray-600 mb-6">
              Para começar a avaliação, primeiro precisa de criar uma nova exploração.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Nome da Exploração *
                </label>
                <input
                  type="text"
                  value={exploracaoForm.name}
                  onChange={(e) => setExploracaoForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                  placeholder="Ex: Quinta do Vale Verde"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Região
                </label>
                <input
                  type="text"
                  value={exploracaoForm.region}
                  onChange={(e) => setExploracaoForm(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                  placeholder="Ex: Lisboa, Porto, Alentejo..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Tipo de Exploração
                </label>
                <select
                  value={exploracaoForm.type}
                  onChange={(e) => setExploracaoForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="Coudelaria">Coudelaria</option>
                  <option value="Centro de Treinos">Centro de Treinos</option>
                  <option value="Centro Hípico">Centro Hípico</option>
                  <option value="Quinta de Lazer">Quinta de Lazer</option>
                  <option value="Exploração Agrícola">Exploração Agrícola</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateExploracao}
                className="flex-1 bg-forest-green text-white px-4 py-2 rounded-md hover:bg-forest-green-dark"
              >
                Criar e Continuar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-charcoal">{questionnaire.name}</h1>
              <p className="text-gray-600">Avaliação de Biossegurança Equina</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
              Voltar
            </button>
          </div>

          {/* Total Score */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-charcoal">Score Total de Risco</span>
              <span className="text-sm font-medium text-charcoal">
                {totalScore.current.toFixed(1)} / {totalScore.max.toFixed(1)} ({totalScore.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="h-4 rounded-full transition-all duration-300"
                style={{
                  width: `${totalScore.percentage}%`,
                  backgroundColor: getScoreGradient(totalScore.percentage)
                }}
              />
            </div>
          </div>

          {/* Section Navigation */}
          <div className="flex space-x-2 overflow-x-auto">
            {questionnaire.sections.map((section, index) => {
              const sectionScore = sectionScores.find(s => s.sectionId === section.id);
              return (
                <button
                  key={section.id}
                  onClick={() => setCurrentSectionIndex(index)}
                  className={`px-4 py-2 rounded-md whitespace-nowrap text-sm font-medium transition-colors ${
                    currentSectionIndex === index
                      ? 'bg-forest-green text-white'
                      : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                  }`}
                >
                  {section.name}
                  {sectionScore && (
                    <span className="ml-2 text-xs">
                      ({sectionScore.percentage.toFixed(0)}%)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Section */}
        {currentSection && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-charcoal mb-2">{currentSection.name}</h2>
              
              {/* Section Score */}
              {currentSectionScore && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-charcoal">Score da Secção</span>
                    <span className="text-sm font-medium text-charcoal">
                      {currentSectionScore.currentScore.toFixed(1)} / {currentSectionScore.maxScore.toFixed(1)} ({currentSectionScore.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${currentSectionScore.percentage}%`,
                        backgroundColor: getScoreGradient(currentSectionScore.percentage)
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {currentSection.questions.map((question, questionIndex) => {
                const answer = answers.find(a => a.questionId === question.id);
                
                return (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-charcoal mb-3">
                      {questionIndex + 1}. {question.text}
                    </h3>

                    {question.type === 'multiple_choice' && question.options && (
                      <div className="space-y-2">
                        {question.options.map(option => (
                          <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option.id}
                              checked={answer?.selectedOptions.includes(option.id) || false}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleAnswerChange(question.id, [option.id]);
                                }
                              }}
                              className="w-4 h-4 text-forest-green focus:ring-forest-green"
                            />
                            <span className="text-charcoal">{option.text}</span>
                            <span className="text-sm text-gray-500">(Score: {option.score})</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'checkbox' && question.options && (
                      <div className="space-y-2">
                        {question.options.map(option => (
                          <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              value={option.id}
                              checked={answer?.selectedOptions.includes(option.id) || false}
                              onChange={(e) => {
                                const currentSelected = answer?.selectedOptions || [];
                                let newSelected;
                                
                                if (e.target.checked) {
                                  newSelected = [...currentSelected, option.id];
                                } else {
                                  newSelected = currentSelected.filter(id => id !== option.id);
                                }
                                
                                handleAnswerChange(question.id, newSelected);
                              }}
                              className="w-4 h-4 text-forest-green focus:ring-forest-green rounded"
                            />
                            <span className="text-charcoal">{option.text}</span>
                            <span className="text-sm text-gray-500">(Score: {option.score})</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'text' && (
                      <textarea
                        value={answer?.textAnswer || ''}
                        onChange={(e) => handleAnswerChange(question.id, [], e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                        rows={3}
                        placeholder="Digite a sua resposta aqui..."
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
                disabled={currentSectionIndex === 0}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Secção Anterior
              </button>
              
              {currentSectionIndex < questionnaire.sections.length - 1 ? (
                <button
                  onClick={() => setCurrentSectionIndex(currentSectionIndex + 1)}
                  className="bg-forest-green text-white px-4 py-2 rounded-md hover:bg-forest-green-dark"
                >
                  Próxima Secção
                </button>
              ) : (
                <button
                  onClick={handleCompleteEvaluation}
                  className="bg-golden-yellow text-charcoal px-4 py-2 rounded-md hover:bg-golden-yellow-dark font-medium"
                >
                  Concluir Avaliação
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Evaluation;
