import React, { useState, useEffect } from 'react';
import ReportRenderer from './ReportRenderer';

interface PlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (markdown: string) => void;
  onPublish: (markdown: string) => void;
  initialMarkdown: string;
  status?: 'not_generated' | 'generating' | 'draft' | 'published';
  onRegenerate: (model: string) => void;
  isGenerating?: boolean;
}

const PlanEditorModal: React.FC<PlanEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onPublish,
  initialMarkdown,
  status, // <-- A vírgula foi adicionada aqui
  onRegenerate,
  isGenerating
}) => {
  const [markdownContent, setMarkdownContent] = useState(initialMarkdown);
  const [selectedModel, setSelectedModel] = useState('pro');
  useEffect(() => {
    setMarkdownContent(initialMarkdown);
  }, [initialMarkdown]);

  if (!isOpen) {
    return null;
  }
  
  const isDraft = status === 'draft';
  const isPublished = status === 'published';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 mx-4 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-charcoal">Revisão e Publicação do Plano de Ação</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
          <div className="overflow-y-auto border rounded p-3 bg-gray-50">
            <ReportRenderer markdownContent={markdownContent} />
          </div>
          <div className="h-full">
            <textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              disabled={isPublished}
              className="w-full h-full p-3 border rounded font-mono text-sm focus:ring-forest-green focus:border-forest-green disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="flex justify-between items-center p-4 border-t">
          <div>
            {isDraft && (
              <div className="flex items-center space-x-2">
                {/* O nosso novo seletor de modelo */}
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isGenerating}
                  className="px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-forest-green focus:border-forest-green"
                >
                  <option value="pro">Gemini Pro (Qualidade)</option>
                  <option value="flash">Gemini Flash (Rápido)</option>
                </select>
                <button
                  onClick={() => onRegenerate(selectedModel)} // Passamos o modelo selecionado
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-md bg-warm-brown text-white hover:bg-warm-brown-dark text-sm disabled:opacity-50"
                >
                  {isGenerating ? 'A Regenerar...' : 'Regenerar'}
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {isPublished && (
              <span className="text-sm font-medium text-green-600">Este plano já foi publicado.</span>
            )}
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-charcoal hover:bg-gray-300">
              {isPublished ? 'Fechar' : 'Cancelar'}
            </button>
            {isDraft && (
              <>
                <button onClick={() => onSave(markdownContent)} className="px-4 py-2 rounded-md bg-sage-green text-white hover:bg-sage-green-dark">
                  Guardar Rascunho
                </button>
                <button onClick={() => onPublish(markdownContent)} className="px-4 py-2 rounded-md bg-golden-yellow text-charcoal hover:bg-golden-yellow-dark font-medium">
                  Publicar Plano
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// A linha 'export default' foi adicionada
export default PlanEditorModal;