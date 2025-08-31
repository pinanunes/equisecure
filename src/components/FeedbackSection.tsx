import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface FeedbackSectionProps {
  evaluationId: string;
  actionableMeasures: { measure: string; category: string }[] | string;
}

type FeedbackState = { [measureText: string]: string };
// 1. NOVO TIPO DE ESTADO para os comentários
type CommentState = { [measureText: string]: string };

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ evaluationId, actionableMeasures }) => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackState>({});
  // 1. NOVO ESTADO para gerir os comentários
  const [comments, setComments] = useState<CommentState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const parsedMeasures = useMemo(() => {
    // ... (esta lógica permanece a mesma)
    if (Array.isArray(actionableMeasures)) return actionableMeasures;
    if (typeof actionableMeasures === 'string') { try { const parsed = JSON.parse(actionableMeasures); return Array.isArray(parsed) ? parsed : []; } catch (error) { console.error("Falha ao fazer o parse da prop actionableMeasures:", error); return []; } }
    return [];
  }, [actionableMeasures]);

  useEffect(() => {
    const fetchExistingFeedback = async () => {
      try {
        // 2. ADICIONAR 'user_comment' à query
        const { data, error } = await supabase
          .from('feedback_measures')
          .select('measure_text, user_feedback, user_comment') // Pedimos também o comentário
          .eq('evaluation_id', evaluationId);

        if (error) throw error;

        if (data) {
          const existingFeedback = data.reduce((acc, item) => {
            if (item.user_feedback) acc[item.measure_text] = item.user_feedback;
            return acc;
          }, {} as FeedbackState);
          
          // 2. PREENCHER o estado dos comentários
          const existingComments = data.reduce((acc, item) => {
            if (item.user_comment) acc[item.measure_text] = item.user_comment;
            return acc;
          }, {} as CommentState);

          setFeedback(existingFeedback);
          setComments(existingComments);
        }
      } catch (err) {
        console.error('Erro ao buscar feedback existente:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExistingFeedback();
  }, [evaluationId]);

  const handleFeedbackChange = (measure: string, value: string) => {
    setFeedback(prev => ({ ...prev, [measure]: value }));
  };

  // 3. NOVA FUNÇÃO para gerir as alterações nos comentários
  const handleCommentChange = (measure: string, value: string) => {
    setComments(prev => ({ ...prev, [measure]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    if (!user) {
      alert("Precisa de estar autenticado para submeter feedback.");
      setSaving(false);
      return;
    }

    // 4. ATUALIZAR o payload a ser guardado
    const feedbackToSave = parsedMeasures.map(item => ({
      evaluation_id: evaluationId,
      user_id: user.id,
      measure_text: item.measure,
      category: item.category, // <-- Adicionámos a categoria
      user_feedback: feedback[item.measure] || null,
      user_comment: comments[item.measure] || null, // <-- Adicionámos o comentário
    }));

    // O 'upsert' agora vai também inserir/atualizar a categoria e o comentário
    const { error } = await supabase.from('feedback_measures').upsert(feedbackToSave, {
        onConflict: 'evaluation_id, measure_text' // Garante que o upsert funciona corretamente
    });

    if (error) {
      alert('Erro ao guardar o seu feedback. Por favor, tente novamente.');
      console.error(error);
    } else {
      alert('O seu feedback foi guardado com sucesso. Obrigado!');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-6">A carregar secção de feedback...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Cabeçalho da secção de feedback */}
      <h3 className="text-xl font-bold text-charcoal mb-2">A sua opinião é importante!</h3>
      <p className="text-gray-600 mb-6">
        Para nos ajudar a melhorar, por favor indique a viabilidade de implementação de cada uma das medidas recomendadas.
      </p>

      <div className="space-y-6">
        {parsedMeasures.map((item, index) => (
          <div key={index} className="border-t pt-4">
            <p className="font-medium text-charcoal mb-3"><strong>Medida {index + 1}:</strong> {item.measure}</p>
            
            {/* Botões de rádio (completos) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
              <label className="inline-flex items-center mb-2 sm:mb-0">
                <input type="radio" name={`feedback-${index}`} value="facil" checked={feedback[item.measure] === 'facil'} onChange={(e) => handleFeedbackChange(item.measure, e.target.value)} className="form-radio text-forest-green" />
                <span className="ml-2">Fácil de implementar</span>
              </label>
              <label className="inline-flex items-center mb-2 sm:mb-0">
                <input type="radio" name={`feedback-${index}`} value="desafiador" checked={feedback[item.measure] === 'desafiador'} onChange={(e) => handleFeedbackChange(item.measure, e.target.value)} className="form-radio text-golden-yellow" />
                <span className="ml-2">Desafiador</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name={`feedback-${index}`} value="inviavel" checked={feedback[item.measure] === 'inviavel'} onChange={(e) => handleFeedbackChange(item.measure, e.target.value)} className="form-radio text-warm-brown" />
                <span className="ml-2">Não é viável</span>
              </label>
            </div>
            
            {/* Caixa de texto para comentários (nova funcionalidade) */}
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">
                Comentários (opcional)
              </label>
              <textarea
                value={comments[item.measure] || ''}
                onChange={(e) => handleCommentChange(item.measure, e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-forest-green focus:ring-forest-green sm:text-sm"
                placeholder="Ex: Já tentei fazer isto, mas tive dificuldade com..."
              />
            </div>
          </div>
        ))}
      </div>

      {/* Botão de submeter (completo) */}
      <div className="text-right mt-6">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-forest-green text-white px-6 py-2 rounded-md font-medium hover:bg-forest-green-dark disabled:opacity-50"
        >
          {saving ? 'A Guardar...' : 'Guardar Feedback'}
        </button>
      </div>
    </div>
  );
};

export default FeedbackSection;