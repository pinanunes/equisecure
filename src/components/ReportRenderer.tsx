import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

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
    const citationRegex = /\[\["(.+?)"\s*,\s*"(.+?)"\s*\]\]/gs;

    const processed = markdownContent.replace(citationRegex, (_match, citationText, doiUrl) => {
      let finalDoiUrl = doiUrl.trim();
      if (!finalDoiUrl.startsWith('http')) {
        finalDoiUrl = `https://doi.org/${finalDoiUrl}`;
      }
      if (!citationMap.has(citationText)) {
        uniqueReferences.push({ citation: citationText, doi: finalDoiUrl });
      }
      const citationNumber = uniqueReferences.findIndex(ref => ref.citation === citationText) + 1;
      
      return `<sup><a href="#ref-${citationNumber}" class="text-blue-600 hover:underline no-underline font-bold">[${citationNumber}]</a></sup>`;
    });

    return { processedMarkdown: processed, references: uniqueReferences };
  }, [markdownContent]);

  return (
    <div>
      {/* A MUDANÇA CRUCIAL: A classe 'prose' foi removida. */}
      {/* Em vez disso, adicionamos uma classe nossa para os estilos base. */}
      <div className="report-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
        >
          {processedMarkdown}
        </ReactMarkdown>
      </div>

      {/* A secção de Referências permanece a mesma */}
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