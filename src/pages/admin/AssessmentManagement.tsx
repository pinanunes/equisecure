import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import AdminLayout from '../../components/AdminLayout';
import type { Evaluation, Exploracao } from '../../types';
import PlanEditorModal from '../../components/PlanEditorModal';

interface AssessmentWithDetails extends Evaluation {
  installation: Exploracao;
  user_email: string;
  section_scores?: Array<{ section_id: string; score: number }>;
}

type SortConfig = {
  key: string;
  direction: 'ascending' | 'descending';
};

const AssessmentManagement: React.FC = () => {
  const [assessments, setAssessments] = useState<AssessmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentWithDetails | null>(null);
  const [generatingPlanId, setGeneratingPlanId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'descending' });
  const [totalCount, setTotalCount] = useState(0);
  const ASSESSMENTS_PER_PAGE = 10;

  // ESTADOS SEPARADOS PARA A PESQUISA E O SEU "DEBOUNCE"
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // --- O ÚNICO E CORRIGIDO useEffect PARA BUSCA DE DADOS ---
    // useEffect #1: APENAS para o debounce da pesquisa.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Quando a pesquisa muda, voltamos à primeira página.
      setCurrentPage(0); 
    }, 500); // 500ms de atraso

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]); // Só reage quando o utilizador digita.

  // useEffect #2: O ÚNICO useEffect que vai buscar os dados.
  useEffect(() => {
    fetchAssessments(currentPage, debouncedSearchTerm, statusFilter, sortConfig);
  }, [currentPage, debouncedSearchTerm, statusFilter, sortConfig]); // Reage a tudo o que deve acionar uma nova busca.

  // useEffect #3: O seu polling (permanece igual)
  useEffect(() => {
    const assessmentToPoll = assessments.find(a => a.plan_status === 'generating');
    if (!assessmentToPoll) return;
    const intervalId = setInterval(async () => {
      try {
        const { data, error } = await supabase.from('evaluations').select('plan_status, plan_markdown, plan_actionable_measures').eq('id', assessmentToPoll.id).single();
        if (error) throw error;
        if (data && data.plan_status !== 'generating') {
          clearInterval(intervalId);
          setAssessments(currentAssessments => currentAssessments.map(a => a.id === assessmentToPoll.id ? { ...a, ...data } : a));
        }
      } catch (error) {
        console.error('Erro durante o polling:', error);
        clearInterval(intervalId);
      }
    }, 5000);
    return () => clearInterval(intervalId);
  }, [assessments]);

  // useEffect para o polling em tempo real (sem alterações)
  useEffect(() => {
    const assessmentToPoll = assessments.find(a => a.plan_status === 'generating');
    if (!assessmentToPoll) return;
    const intervalId = setInterval(async () => {
      try {
        const { data, error } = await supabase.from('evaluations').select('plan_status, plan_markdown, plan_actionable_measures').eq('id', assessmentToPoll.id).single();
        if (error) throw error;
        if (data && data.plan_status !== 'generating') {
          clearInterval(intervalId);
          setAssessments(currentAssessments => currentAssessments.map(a => a.id === assessmentToPoll.id ? { ...a, ...data } : a));
        }
      } catch (error) {
        console.error('Erro durante o polling:', error);
        clearInterval(intervalId);
      }
    }, 5000);
    return () => clearInterval(intervalId);
  }, [assessments]);

  // FUNÇÃO fetchAssessments AGORA TOTALMENTE DINÂMICA
const fetchAssessments = async (page = 0, search = '', status = 'all', sort = sortConfig) => {
    setLoading(true);
    try {
      const from = page * ASSESSMENTS_PER_PAGE;
      // A variável 'to' é calculada aqui...
      const to = from + ASSESSMENTS_PER_PAGE - 1;

      let query = supabase
        .from('evaluations')
        .select(`
            id, created_at, total_score, plan_status,
            installation:installations!inner(name, region, type),
            profile:profiles!inner(email)
        `, { count: 'exact' });

      if (search) {
        query = query.or(`installation.name.ilike.%${search}%,profile.email.ilike.%${search}%`, {
          foreignTable: 'installation,profile'
        });
      }

      if (status !== 'all') {
        query = query.eq('plan_status', status);
      }

      const isForeignSort = sort.key.includes('.');
      const sortKey = isForeignSort ? sort.key.split('.')[1] : sort.key;
      const foreignTable = isForeignSort ? sort.key.split('.')[0] : undefined;

      query = query.order(sortKey, {
        ascending: sort.direction === 'ascending',
        foreignTable: foreignTable,
      });
      
      // ...E é usada aqui, na chamada .range(from, to). Esta é a correção.
      const { data, error, count } = await query.range(from, to);
      
      if (error) throw error;
      
      const assessmentsWithDetails = data.map((evaluation: any) => ({
        ...evaluation,
        installation: evaluation.installation,
        user_email: evaluation.profile?.email || 'Email não encontrado'
      }));

      setAssessments(assessmentsWithDetails);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error in fetchAssessments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // FUNÇÃO para gerir os cliques nos cabeçalhos da tabela
   const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    // Se estamos a clicar na mesma coluna que já está ativa...
    if (sortConfig.key === key) {
      // ...simplesmente invertemos a direção atual.
      direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    }
    // Se for uma coluna nova, a direção por defeito (definida acima) é 'ascending'.
    
    setSortConfig({ key, direction });
    // O useEffect principal tratará de reiniciar a página, mas podemos ser explícitos se quisermos
    if (currentPage !== 0) {
        setCurrentPage(0);
    }
  };

const handleOpenModal = async (assessment: AssessmentWithDetails) => {
    // Para uma melhor UX, podemos mostrar um estado de loading no botão se for preciso,
    // mas por agora vamos simplesmente ir buscar os dados.
    try {
      // 1. Ir buscar a versão completa e atualizada desta avaliação específica
      const { data, error } = await supabase
        .from('evaluations')
        .select('plan_markdown, plan_status') // Só precisamos destes campos
        .eq('id', assessment.id)
        .single();

      if (error) throw error;

      // 2. Usamos os dados frescos da base de dados para definir o estado
      setSelectedAssessment({
        ...assessment, // Mantemos os dados que já tínhamos na lista
        ...data,      // E sobrescrevemos com o plan_markdown e status atualizados
      });

      // 3. Só depois de termos os dados completos é que abrimos o modal
      setIsModalOpen(true);

    } catch (error) {
      alert("Não foi possível carregar o conteúdo do plano. Tente novamente.");
      console.error("Erro ao ir buscar o plano:", error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAssessment(null);
  };

  const handleSaveChanges = async (markdown: string) => {
    if (!selectedAssessment) return;
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .update({ plan_markdown: markdown, plan_status: 'draft' }) // Garante que fica como draft
        .eq('id', selectedAssessment.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setAssessments(prev => prev.map(a => a.id === selectedAssessment.id ? { ...a, ...data } : a));
      alert('Rascunho guardado com sucesso!');
      handleCloseModal();
    } catch (error) {
      alert('Erro ao guardar as alterações.');
      console.error(error);
    }
  };

  const handlePublishPlan = async (markdown: string) => {
    if (!selectedAssessment) return;
    if (!window.confirm('Tem a certeza que quer publicar este plano? Esta ação é irreversível.')) {
        return;
    }
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .update({ plan_markdown: markdown, plan_status: 'published' }) // Muda o estado para published
        .eq('id', selectedAssessment.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setAssessments(prev => prev.map(a => a.id === selectedAssessment.id ? { ...a, ...data } : a));
      alert('Plano publicado com sucesso!');
      handleCloseModal();
    } catch (error) {
      alert('Erro ao publicar o plano.');
      console.error(error);
    }
  };
  const handleCreatePlan = async (assessment: AssessmentWithDetails) => {
    if (!assessment) return;

    try {
        // Passo 1: Atualizar o estado na UI e na BD para 'generating'.
        // Isto aciona o nosso useEffect de polling para começar a trabalhar.
        setAssessments(prev => prev.map(a => a.id === assessment.id ? { ...a, plan_status: 'generating' } : a));
        const { error: updateError } = await supabase
            .from('evaluations')
            .update({ plan_status: 'generating' })
            .eq('id', assessment.id);
        if (updateError) throw updateError;
        
        // Passo 2: Construir e enviar o payload para o N8N.
        // (O seu código para obter rawData e construir o payload permanece o mesmo)
        const { data: rawData, error: fetchError } = await supabase.from('evaluations').select(`*, installation:installations(*), evaluation_answers(question_id, selected_options, text_answer), questionnaire:questionnaires(*, sections(*, questions(*, options:question_options(*))))`).eq('id', assessment.id).single();
        if (fetchError) throw fetchError;
        const payload = { avaliacao_id: assessment.id, exploracao: { id: rawData.installation.id, nome: rawData.installation.name, tipo: rawData.installation.type, regiao: rawData.installation.region, }, avaliacao_scores: { total_score_percentagem: (rawData.total_score * 100), seccoes: rawData.section_scores.map((sc: any) => ({ nome: rawData.questionnaire.sections.find((s: any) => s.id === sc.section_id)?.name, score_percentagem: (sc.score * 100), })) }, respostas_detalhadas: rawData.questionnaire.sections.map((section: any) => ({ seccao: section.name, perguntas: section.questions.map((q: any) => { const answer = rawData.evaluation_answers.find((a: any) => a.question_id === q.id); let respostaTexto = "Sem resposta"; if(answer){ if(q.type === 'text') respostaTexto = answer.text_answer || "Sem resposta"; else if(answer.selected_options) { respostaTexto = q.options.filter((opt: any) => answer.selected_options.includes(opt.id)).map((opt: any) => opt.text).join(', '); } } return { texto: q.text, resposta: respostaTexto, score: q.score }; }) })) };
        
        const webhookUrl = 'https://manuelnunes.duckdns.org/webhook/eb8add01-d6e3-4e47-a6f2-14bc52d828ac';
        const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), });

        if (!response.ok) {
            throw new Error(`Webhook failed with status ${response.status}`);
        }
    } catch (error) {
        console.error('Error creating plan:', error);
        alert('Ocorreu um erro ao iniciar a geração do plano. Por favor, tente novamente.');
        // Reverter o estado na UI e na BD em caso de erro.
        setAssessments(prev => prev.map(a => a.id === assessment.id ? { ...a, plan_status: 'not_generated' } : a));
        await supabase.from('evaluations').update({ plan_status: 'not_generated' }).eq('id', assessment.id);
    }
};
  const handleRegeneratePlan = async () => {
      if (!selectedAssessment) {
        alert("Nenhuma avaliação selecionada para regenerar.");
        return;
      }

      // 1. Ativa o estado de loading ANTES de fazer qualquer outra coisa.
      // Isto irá desativar o botão "Regenerar" e mostrar "A Regenerar..."
      setGeneratingPlanId(selectedAssessment.id);
      
      // 2. Fechamos o modal para que o utilizador veja a tabela a atualizar na página principal.
      handleCloseModal();
      
      // 3. Chamamos a lógica original de 'handleCreatePlan'.
      // A função handleCreatePlan já trata de tudo o resto (chamar o webhook,
      // mudar o estado na base de dados, etc.).
      // O nosso poller useEffect irá automaticamente detetar a mudança de 'generating' para 'draft'.
      await handleCreatePlan(selectedAssessment); 
      
      // 4. Limpamos o estado de loading depois de a operação ser iniciada.
      // O poller assume a responsabilidade a partir daqui.
      setGeneratingPlanId(null);
    };
const renderPlanButton = (assessment: AssessmentWithDetails) => {
    const status = assessment.plan_status;

    if (status === 'generating') {
      return <span className="text-sm text-gray-500 italic">A Gerar Plano...</span>;
    }

    if (status === 'draft' || status === 'published') {
      return (
        <button 
          onClick={() => handleOpenModal(assessment)}
          className="bg-sage-green text-white px-3 py-1 rounded-md text-sm hover:bg-sage-green-dark" 
        >
          {status === 'published' ? 'Ver Plano Publicado' : 'Rever e Publicar'}
        </button>
      );
    }
    
    // Default é 'not_generated'
    return (
      <button 
        onClick={() => handleCreatePlan(assessment)}
        className="bg-forest-green text-white px-3 py-1 rounded-md text-sm hover:bg-forest-green-dark"
      >
        Criar Plano
      </button>
    );
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
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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


  const exportFeedback = async () => {
    setExporting(true);
    try {
      // 1. Ir buscar todos os dados de feedback com a informação relacionada
      const { data: feedbackData, error } = await supabase
        .from('feedback_measures')
        .select(`
          measure_text,
          category,
          user_feedback,
          user_comment,
          evaluation:evaluations(
            installation:installations(name),
            profile:profiles(email)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching feedback data:', error);
        throw error;
      }

      // 2. Preparar os cabeçalhos do CSV
      const csvHeaders = [
        'Nome da Exploração',
        'Email do Utilizador',
        'Medida Recomendada',
        'Categoria da Medida',
        'Feedback do Utilizador',
        'Comentário'
      ];

      // 3. Mapear os dados para as linhas do CSV
      const csvRows = feedbackData.map((feedback: any) => {
        // Usamos optional chaining (?) para evitar erros se alguma relação for nula
        const installationName = feedback.evaluation?.installation?.name || 'N/A';
        const userEmail = feedback.evaluation?.profile?.email || 'N/A';
        
        // Limpamos o texto para garantir que não quebra o CSV (removemos ponto e vírgula e quebras de linha)
        const cleanMeasureText = `"${(feedback.measure_text || '').replace(/"/g, '""').replace(/(\r\n|\n|\r)/gm, ' ')}"`;
        const cleanComment = `"${(feedback.user_comment || '').replace(/"/g, '""').replace(/(\r\n|\n|\r)/gm, ' ')}"`;

        return [
          installationName,
          userEmail,
          cleanMeasureText,
          feedback.category || '',
          feedback.user_feedback || '',
          cleanComment
        ].join(';');
      });

      // 4. Criar e descarregar o ficheiro CSV
      const csvContent = [
        csvHeaders.join(';'),
        ...csvRows
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `feedback_avaliacoes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      alert('Erro ao exportar o feedback.');
      console.error('Error exporting feedback:', error);
    } finally {
      setExporting(false);
    }
  };
if (loading && assessments.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-charcoal">A carregar avaliações...</div>
        </div>
      </AdminLayout>
    );
  }

  // A sua secção RETURN, agora com a lógica e os handlers corretos para suportá-la
  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-charcoal">Gestão de Avaliações</h1>
          <div className="flex space-x-3">
            <button onClick={exportScores} disabled={exporting || assessments.length === 0} className="bg-sage-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-sage-green-dark disabled:opacity-50 disabled:cursor-not-allowed">
              {exporting ? 'A exportar...' : 'Exportar Scores'}
            </button>
            <button onClick={exportFullData} disabled={exporting || assessments.length === 0} className="bg-golden-yellow text-charcoal px-4 py-2 rounded-md text-sm font-medium hover:bg-golden-yellow-dark disabled:opacity-50 disabled:cursor-not-allowed">
              {exporting ? 'A exportar...' : 'Exportar Dados Completos'}
            </button>
            <button
              onClick={exportFeedback}
              disabled={exporting}
              className="bg-forest-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-forest-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'A exportar...' : 'Exportar Feedback'}
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Pesquisar por exploração ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-forest-green"
            >
              <option value="all">Todos os Estados</option>
              <option value="not_generated">Não Gerado</option>
              <option value="generating">A Gerar</option>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
            </select>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {assessments.length === 0 && !loading ? (
            <div className="px-4 py-5 sm:px-6 text-center"><p className="text-gray-500">Nenhuma avaliação encontrada para os critérios de pesquisa.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('installation.name')}>Exploração {sortConfig.key === 'installation.name' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('profile.email')}>Utilizador {sortConfig.key === 'profile.email' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('created_at')}>Data {sortConfig.key === 'created_at' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('total_score')}>Score {sortConfig.key === 'total_score' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('plan_status')}>Plano de Ação {sortConfig.key === 'plan_status' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assessments.map((assessment) => {
                    const risk = getRiskLevel(assessment.total_score);
                    return (
                      <tr key={assessment.id}>
                        <td className="px-6 py-4 whitespace-nowrap"><div><div className="text-sm font-medium text-charcoal">{assessment.installation.name}</div><div className="text-sm text-gray-500">{assessment.installation.region && `${assessment.installation.region} • `}{assessment.installation.type}</div></div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assessment.user_email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(assessment.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><span className={`text-sm font-medium ${risk.color}`}>{(assessment.total_score * 100).toFixed(1)}%</span><span className={`ml-2 text-xs ${risk.color}`}>({risk.level})</span></div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{renderPlanButton(assessment)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><Link to={`/evaluation-report/${assessment.id}`} state={{ from: '/admin/assessments' }} className="text-forest-green hover:text-forest-green-dark">Ver Relatório</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end items-center space-x-4">
            <span className="text-sm text-gray-700">Mostrando {assessments.length} de {totalCount}</span>
            <span className="text-sm text-gray-700">Página {currentPage + 1} de {Math.max(1, Math.ceil(totalCount / ASSESSMENTS_PER_PAGE))}</span>
            <button onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} disabled={currentPage === 0 || loading} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-sm hover:bg-gray-300 disabled:opacity-50">Anterior</button>
            <button onClick={() => setCurrentPage(prev => prev + 1)} disabled={(currentPage + 1) * ASSESSMENTS_PER_PAGE >= totalCount || loading} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-sm hover:bg-gray-300 disabled:opacity-50">Próxima</button>
        </div>

        {/* Resumo */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-charcoal mb-4">Resumo</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center"><div className="text-2xl font-bold text-charcoal">{totalCount}</div><div className="text-sm text-gray-600">Total de Avaliações</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-green-600">{assessments.filter(a => a.total_score <= 0.3).length}</div><div className="text-sm text-gray-600">Risco Baixo</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-yellow-600">{assessments.filter(a => a.total_score > 0.3 && a.total_score <= 0.6).length}</div><div className="text-sm text-gray-600">Risco Médio</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-red-600">{assessments.filter(a => a.total_score > 0.6).length}</div><div className="text-sm text-gray-600">Risco Alto</div></div>
          </div>
        </div>
        
        {/* Modal de Edição do Plano */}
        <PlanEditorModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveChanges}
          onPublish={handlePublishPlan}
          initialMarkdown={selectedAssessment?.plan_markdown || ''}
          status={selectedAssessment?.plan_status}
          // --- ADICIONE ESTAS DUAS PROPS ---
          onRegenerate={handleRegeneratePlan}
          isGenerating={generatingPlanId === selectedAssessment?.id}
          // --- FIM DAS ADIÇÕES ---
        />
      </div>
    </AdminLayout>
  );
};

export default AssessmentManagement;