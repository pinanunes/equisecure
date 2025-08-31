import React, { useState, useEffect } from 'react';

import ReportRenderer from './ReportRenderer';
interface PlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (markdown: string) => void;
  onPublish: (markdown: string) => void;
  initialMarkdown: string;
  status?: 'not_generated' | 'generating' | 'draft' | 'published';
}

const PlanEditorModal: React.FC<PlanEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onPublish,
  initialMarkdown,
  status
}) => {
  const [markdownContent, setMarkdownContent] = useState(initialMarkdown);

  useEffect(() => {
    // Atualiza o conteúdo do editor se um novo plano for aberto
    setMarkdownContent(initialMarkdown);
  }, [initialMarkdown]);

  if (!isOpen) {
    return null;
  }

  const isPublished = status === 'published';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 mx-4 flex flex-col">
        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-charcoal">Revisão e Publicação do Plano de Ação</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>

        {/* Corpo do Modal (Split-screen) */}
        <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden">
          {/* Lado Esquerdo: Pré-visualização Renderizada */}
          <div className="overflow-y-auto border rounded p-3 bg-gray-50">
            <ReportRenderer markdownContent={markdownContent} />
          </div>
          {/* Lado Direito: Editor de Texto */}
          <div className="h-full">
            <textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              disabled={isPublished}
              className="w-full h-full p-3 border rounded font-mono text-sm focus:ring-forest-green focus:border-forest-green disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Rodapé do Modal com Ações */}
        <div className="flex justify-end items-center p-4 border-t space-x-4">
          {isPublished && (
            <span className="text-sm font-medium text-green-600">Este plano já foi publicado.</span>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-charcoal hover:bg-gray-300">
            {isPublished ? 'Fechar' : 'Cancelar'}
          </button>
          {!isPublished && (
            <>
              <button
                onClick={() => onSave(markdownContent)}
                className="px-4 py-2 rounded-md bg-sage-green text-white hover:bg-sage-green-dark"
              >
                Guardar Rascunho
              </button>
              <button
                onClick={() => onPublish(markdownContent)}
                className="px-4 py-2 rounded-md bg-golden-yellow text-charcoal hover:bg-golden-yellow-dark font-medium"
              >
                Publicar Plano
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanEditorModal;