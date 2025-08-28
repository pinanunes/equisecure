import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import AdminLayout from '../../components/AdminLayout';
import type { Questionnaire, Section, Question, QuestionOption } from '../../types';

interface QuestionnaireWithSections extends Questionnaire {
  sections: (Section & {
    questions: (Question & {
      options: QuestionOption[];
    })[];
  })[];
}

const QuestionnaireBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [questionForm, setQuestionForm] = useState({
    text: '',
    type: 'multiple_choice' as 'multiple_choice' | 'checkbox' | 'text',
    improvement_tip: '',
    options: [{ text: '', score: 0 }]
  });

  useEffect(() => {
    if (id) {
      fetchQuestionnaire();
    }
  }, [id]);

  const fetchQuestionnaire = async () => {
    try {
      const { data: questionnaireData, error: questionnaireError } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('id', id)
        .single();

      if (questionnaireError) {
        console.error('Error fetching questionnaire:', questionnaireError);
        navigate('/admin/questionnaires');
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
        .eq('questionnaire_id', id)
        .order('order_index');

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
      }

      const questionnaire: QuestionnaireWithSections = {
        ...questionnaireData,
        sections: sectionsData || []
      };

      setQuestionnaire(questionnaire);
      if (questionnaire.sections.length > 0 && !selectedSectionId) {
        setSelectedSectionId(questionnaire.sections[0].id);
      }
    } catch (error) {
      console.error('Error in fetchQuestionnaire:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSection = async () => {
    console.log('createSection called');
    console.log('newSectionName:', newSectionName);
    console.log('questionnaire:', questionnaire);
    
    if (!newSectionName.trim() || !questionnaire) {
      console.log('Early return - missing name or questionnaire');
      return;
    }

    console.log('Proceeding with section creation...');
    
    try {
      const insertData = {
        questionnaire_id: questionnaire.id,
        name: newSectionName.trim(),
        order_index: questionnaire.sections.length
      };
      
      console.log('Insert data:', insertData);
      
      const { data, error } = await supabase
        .from('sections')
        .insert([insertData])
        .select()
        .single();

      console.log('Supabase response - data:', data);
      console.log('Supabase response - error:', error);

      if (error) {
        console.error('Error creating section:', error);
        alert('Erro ao criar secção: ' + error.message);
      } else {
        console.log('Section created successfully, updating state...');
        const newSection = { ...data, questions: [] };
        const updatedQuestionnaire = {
          ...questionnaire,
          sections: [...questionnaire.sections, newSection]
        };
        
        console.log('Updated questionnaire:', updatedQuestionnaire);
        
        setQuestionnaire(updatedQuestionnaire);
        setNewSectionName('');
        setShowSectionModal(false);
        setSelectedSectionId(data.id);
        
        console.log('State updated successfully');
      }
    } catch (error) {
      console.error('Error in createSection:', error);
      alert('Erro inesperado: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const updateSection = async () => {
    if (!newSectionName.trim() || !editingSection || !questionnaire) return;

    try {
      const { error } = await supabase
        .from('sections')
        .update({ name: newSectionName.trim() })
        .eq('id', editingSection.id);

      if (error) {
        console.error('Error updating section:', error);
        alert('Erro ao atualizar secção');
      } else {
        setQuestionnaire({
          ...questionnaire,
          sections: questionnaire.sections.map(s =>
            s.id === editingSection.id ? { ...s, name: newSectionName.trim() } : s
          )
        });
        setNewSectionName('');
        setEditingSection(null);
        setShowSectionModal(false);
      }
    } catch (error) {
      console.error('Error in updateSection:', error);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Tem a certeza que deseja eliminar esta secção? Todas as perguntas serão também eliminadas.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);

      if (error) {
        console.error('Error deleting section:', error);
        alert('Erro ao eliminar secção');
      } else {
        const updatedSections = questionnaire!.sections.filter(s => s.id !== sectionId);
        setQuestionnaire({
          ...questionnaire!,
          sections: updatedSections
        });
        if (selectedSectionId === sectionId) {
          setSelectedSectionId(updatedSections.length > 0 ? updatedSections[0].id : null);
        }
      }
    } catch (error) {
      console.error('Error in deleteSection:', error);
    }
  };

  const openQuestionModal = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        text: question.text,
        type: question.type,
        improvement_tip: question.improvement_tip || '',
        options: question.options && question.options.length > 0 ? question.options.map(o => ({ text: o.text, score: o.score })) : [{ text: '', score: 0 }]
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        text: '',
        type: 'multiple_choice',
        improvement_tip: '',
        options: [{ text: '', score: 0 }]
      });
    }
    setShowQuestionModal(true);
  };

  const saveQuestion = async () => {
    console.log('saveQuestion called');
    console.log('questionForm:', questionForm);
    console.log('selectedSectionId:', selectedSectionId);
    console.log('questionnaire:', questionnaire);
    
    if (!questionForm.text.trim() || !selectedSectionId || !questionnaire) {
      console.log('Early return - missing required data');
      return;
    }

    console.log('Proceeding with question save...');

    try {
      const selectedSection = questionnaire.sections.find(s => s.id === selectedSectionId);
      if (!selectedSection) {
        console.log('Selected section not found');
        return;
      }

      console.log('Selected section:', selectedSection);

      let maxScore = 0;
      if (questionForm.type === 'multiple_choice') {
        maxScore = Math.max(...questionForm.options.map(o => o.score));
        console.log('Multiple choice max score:', maxScore);
      } else if (questionForm.type === 'checkbox') {
        maxScore = questionForm.options.reduce((sum, o) => sum + o.score, 0);
        console.log('Checkbox total score:', maxScore);
      }

      console.log('Calculated maxScore:', maxScore);
      console.log('Question options:', questionForm.options);

      if (editingQuestion) {
        console.log('Updating existing question:', editingQuestion.id);
        
        const updateData = {
          text: questionForm.text.trim(),
          type: questionForm.type,
          improvement_tip: questionForm.improvement_tip.trim() || null,
          max_score: maxScore
        };
        
        console.log('Question update data:', updateData);
        
        // Update existing question
        const { error: questionError } = await supabase
          .from('questions')
          .update(updateData)
          .eq('id', editingQuestion.id);

        console.log('Question update result - error:', questionError);

        if (questionError) {
          console.error('Error updating question:', questionError);
          alert('Erro ao atualizar pergunta: ' + questionError.message);
          return;
        }

        console.log('Question updated successfully, deleting old options...');

        // Delete existing options
        const { error: deleteError } = await supabase
          .from('question_options')
          .delete()
          .eq('question_id', editingQuestion.id);

        console.log('Delete options result - error:', deleteError);

        // Insert new options
        if (questionForm.type !== 'text') {
          const optionsData = questionForm.options.map((option, index) => ({
            question_id: editingQuestion.id,
            text: option.text.trim(),
            score: option.score,
            order_index: index
          }));
          
          console.log('Options insert data:', optionsData);
          
          const { error: optionsError } = await supabase
            .from('question_options')
            .insert(optionsData);

          console.log('Options insert result - error:', optionsError);

          if (optionsError) {
            console.error('Error updating options:', optionsError);
            alert('Erro ao atualizar opções: ' + optionsError.message);
            return;
          }
        }
      } else {
        console.log('Creating new question...');
        
        const questionData = {
          section_id: selectedSectionId,
          text: questionForm.text.trim(),
          type: questionForm.type,
          improvement_tip: questionForm.improvement_tip.trim() || null,
          order_index: selectedSection.questions.length,
          max_score: maxScore
        };
        
        console.log('Question insert data:', questionData);
        
        // Create new question
        const { data: newQuestionData, error: questionError } = await supabase
          .from('questions')
          .insert([questionData])
          .select()
          .single();

        console.log('Question insert result - data:', newQuestionData);
        console.log('Question insert result - error:', questionError);

        if (questionError) {
          console.error('Error creating question:', questionError);
          alert('Erro ao criar pergunta: ' + questionError.message);
          return;
        }

        console.log('Question created successfully, inserting options...');

        // Insert options
        if (questionForm.type !== 'text') {
          const optionsData = questionForm.options.map((option, index) => ({
            question_id: newQuestionData.id,
            text: option.text.trim(),
            score: option.score,
            order_index: index
          }));
          
          console.log('Options insert data:', optionsData);
          
          const { error: optionsError } = await supabase
            .from('question_options')
            .insert(optionsData);

          console.log('Options insert result - error:', optionsError);

          if (optionsError) {
            console.error('Error creating options:', optionsError);
            alert('Erro ao criar opções: ' + optionsError.message);
            return;
          }
        }
      }

      console.log('Question saved successfully, refreshing data...');

      // Refresh questionnaire data
      await fetchQuestionnaire();
      setShowQuestionModal(false);
      setEditingQuestion(null);
      
      console.log('Question save completed successfully');
    } catch (error) {
      console.error('Error in saveQuestion:', error);
      alert('Erro inesperado: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Tem a certeza que deseja eliminar esta pergunta?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) {
        console.error('Error deleting question:', error);
        alert('Erro ao eliminar pergunta');
      } else {
        await fetchQuestionnaire();
      }
    } catch (error) {
      console.error('Error in deleteQuestion:', error);
    }
  };

  const addOption = () => {
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { text: '', score: 0 }]
    });
  };

  const removeOption = (index: number) => {
    if (questionForm.options.length > 1) {
      setQuestionForm({
        ...questionForm,
        options: questionForm.options.filter((_, i) => i !== index)
      });
    }
  };

  const updateOption = (index: number, field: 'text' | 'score', value: string | number) => {
    const updatedOptions = [...questionForm.options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setQuestionForm({
      ...questionForm,
      options: updatedOptions
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-charcoal">A carregar questionário...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!questionnaire) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-charcoal">Questionário não encontrado</div>
        </div>
      </AdminLayout>
    );
  }

  const selectedSection = questionnaire.sections.find(s => s.id === selectedSectionId);

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-charcoal">{questionnaire.name}</h1>
            <p className="text-gray-600">Construtor de Questionário - Versão {questionnaire.version}</p>
          </div>
          <button
            onClick={() => navigate('/admin/questionnaires')}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Voltar
          </button>
        </div>

        <div className="flex flex-1 gap-6">
          {/* Sections Sidebar */}
          <div className="w-1/3 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-charcoal">Secções</h2>
              <button
                onClick={() => {
                  setEditingSection(null);
                  setNewSectionName('');
                  setShowSectionModal(true);
                }}
                className="bg-forest-green text-white px-3 py-1 rounded text-sm hover:bg-forest-green-dark"
              >
                Adicionar
              </button>
            </div>
            
            <div className="space-y-2">
              {questionnaire.sections.map((section) => (
                <div
                  key={section.id}
                  className={`p-3 rounded cursor-pointer border ${
                    selectedSectionId === section.id
                      ? 'bg-forest-green text-white border-forest-green'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                  onClick={() => setSelectedSectionId(section.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{section.name}</div>
                      <div className="text-sm opacity-75">
                        {section.questions.length} pergunta(s)
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSection(section);
                          setNewSectionName(section.name);
                          setShowSectionModal(true);
                        }}
                        className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSection(section.id);
                        }}
                        className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Questions Main Area */}
          <div className="flex-1 bg-white rounded-lg shadow p-4">
            {selectedSection ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-charcoal">
                    Perguntas - {selectedSection.name}
                  </h2>
                  <button
                    onClick={() => openQuestionModal()}
                    className="bg-forest-green text-white px-3 py-1 rounded text-sm hover:bg-forest-green-dark"
                  >
                    Adicionar Pergunta
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedSection.questions.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-charcoal mb-1">
                            {index + 1}. {question.text}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Tipo: {question.type === 'multiple_choice' ? 'Escolha Múltipla' : 
                                   question.type === 'checkbox' ? 'Caixas de Seleção' : 'Texto'}
                            {question.max_score > 0 && ` | Score Máximo: ${question.max_score}`}
                          </div>
                          {question.improvement_tip && (
                            <div className="text-sm text-blue-600 mb-2">
                              💡 {question.improvement_tip}
                            </div>
                          )}
                          {question.options && question.options.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <strong>Opções:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {question.options.map((option) => (
                                  <li key={option.id}>
                                    {option.text} (Score: {option.score})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => openQuestionModal(question)}
                            className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteQuestion(question.id)}
                            className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {selectedSection.questions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma pergunta criada ainda.
                      <br />
                      <button
                        onClick={() => openQuestionModal()}
                        className="mt-2 text-forest-green hover:text-forest-green-dark font-medium"
                      >
                        Criar a primeira pergunta
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Selecione uma secção para ver as perguntas
              </div>
            )}
          </div>
        </div>

        {/* Section Modal */}
        {showSectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-charcoal mb-4">
                {editingSection ? 'Editar Secção' : 'Nova Secção'}
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Nome da Secção
                </label>
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                  placeholder="Ex: Entrada/Saída da Instalação"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSectionModal(false);
                    setEditingSection(null);
                    setNewSectionName('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingSection ? updateSection : createSection}
                  disabled={!newSectionName.trim()}
                  className="bg-forest-green text-white px-4 py-2 rounded-md hover:bg-forest-green-dark disabled:opacity-50"
                >
                  {editingSection ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question Modal */}
        {showQuestionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-charcoal mb-4">
                {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Texto da Pergunta
                  </label>
                  <textarea
                    value={questionForm.text}
                    onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                    rows={3}
                    placeholder="Digite a pergunta aqui..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Tipo de Pergunta
                  </label>
                  <select
                    value={questionForm.type}
                    onChange={(e) => setQuestionForm({ 
                      ...questionForm, 
                      type: e.target.value as 'multiple_choice' | 'checkbox' | 'text',
                      options: e.target.value === 'text' ? [] : questionForm.options
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                  >
                    <option value="multiple_choice">Escolha Múltipla (uma resposta)</option>
                    <option value="checkbox">Caixas de Seleção (múltiplas respostas)</option>
                    <option value="text">Campo de Texto</option>
                  </select>
                </div>

                {questionForm.type !== 'text' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-charcoal">
                        Opções de Resposta
                      </label>
                      <button
                        onClick={addOption}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        Adicionar Opção
                      </button>
                    </div>
                    <div className="space-y-2">
                      {questionForm.options.map((option, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => updateOption(index, 'text', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                            placeholder="Texto da opção"
                          />
                          <input
                            type="number"
                            value={option.score}
                            onChange={(e) => updateOption(index, 'score', parseFloat(e.target.value) || 0)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                            placeholder="Score"
                            step="0.1"
                          />
                          {questionForm.options.length > 1 && (
                            <button
                              onClick={() => removeOption(index)}
                              className="bg-red-500 text-white px-2 py-2 rounded hover:bg-red-600"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Dica de Melhoria (opcional)
                  </label>
                  <textarea
                    value={questionForm.improvement_tip}
                    onChange={(e) => setQuestionForm({ ...questionForm, improvement_tip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green focus:border-forest-green"
                    rows={2}
                    placeholder="Dica que será mostrada se a resposta não for ideal..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowQuestionModal(false);
                    setEditingQuestion(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveQuestion}
                  disabled={!questionForm.text.trim() || (questionForm.type !== 'text' && questionForm.options.some(o => !o.text.trim()))}
                  className="bg-forest-green text-white px-4 py-2 rounded-md hover:bg-forest-green-dark disabled:opacity-50"
                >
                  {editingQuestion ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default QuestionnaireBuilder;
