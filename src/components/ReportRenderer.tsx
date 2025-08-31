import React, { useMemo } from 'react';
// CORREÇÃO #1: A importação do 'ReactNode' é separada para um 'type-only import'.
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';

interface ReportRendererProps {
  markdownContent: string;
}

const ReportRenderer: React.FC<ReportRendererProps> = ({ markdownContent }) => {

  const { processedMarkdown, references } = useMemo(() => {
    if (!markdownContent) {
      return { processedMarkdown: '', references: [] };
    }

    const citationMap = new Map<string, number>();
    const uniqueReferences: { citation: string, doi: string }[] = [];

    // A regex robusta com o flag 's' (dotAll) para apanhar quebras de linha.
    const citationRegex = /\[\["(.+?)"\s*,\s*"(.+?)"\s*\]\]/gs;

    // CORREÇÃO #2: O parâmetro 'match' não utilizado é prefixado com um underscore.
    // Isto diz ao TypeScript que o parâmetro é intencionalmente não utilizado.
    const processed = markdownContent.replace(citationRegex, (_match, citationText, doiUrl) => {
      let finalDoiUrl = doiUrl.trim();
      if (!finalDoiUrl.startsWith('http')) {
        finalDoiUrl = `https://doi.org/${finalDoiUrl}`;
      }
      if (!citationMap.has(citationText)) {
        uniqueReferences.push({ citation: citationText, doi: finalDoiUrl });
        citationMap.set(citationText, uniqueReferences.length);
      }
      const citationNumber = citationMap.get(citationText);
      return `CITATION_MARKER_${citationNumber}`;
    });

    return { processedMarkdown: processed, references: uniqueReferences };
  }, [markdownContent]);

  // A LÓGICA FUNCIONAL: Função "Helper" que processa os marcadores.
  const processNodeChildren = (children: ReactNode[]): ReactNode[] => {
    return children.flatMap((child) => {
      if (typeof child === 'string') {
        const parts = child.split(/CITATION_MARKER_(\d+)/);
        return parts.map((part, index) => {
          if (index % 2 === 1) {
            const citationNumber = parseInt(part, 10);
            return (
              <sup key={index} className="font-sans font-bold">
                <a href={`#ref-${citationNumber}`} className="text-blue-600 hover:underline no-underline">
                  [{citationNumber}]
                </a>
              </sup>
            );
          }
          return part;
        });
      }
      return child;
    });
  };

  return (
    <div>
      {/* Corpo principal do relatório */}
      <div className="prose max-w-none">
        <ReactMarkdown
          components={{
            // Aplicamos a nossa lógica tanto a parágrafos...
            p: ({ node, ...props }) => {
              const children = React.Children.toArray(props.children);
              return <p {...props}>{processNodeChildren(children)}</p>;
            },
            // ...como a itens de lista.
            li: ({ node, ...props }) => {
              const children = React.Children.toArray(props.children);
              return <li {...props}>{processNodeChildren(children)}</li>;
            },
          }}
        >
          {processedMarkdown}
        </ReactMarkdown>
      </div>

      {/* Secção de Referências (já estava correta) */}
      {references.length > 0 && (
        <div className="mt-12 pt-6 border-t">
          <h3 className="text-lg font-bold mb-4">Referências</h3>
          <ol className="list-decimal list-inside space-y-3">
            {references.map((ref, index) => (
              <li key={index} id={`ref-${index + 1}`}>
                <span className="text-sm text-gray-700">{ref.citation}</span>
                <a 
                  href={ref.doi} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ml-2 text-sm text-blue-600 hover:underline"
                >
                  {ref.doi}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default ReportRenderer;