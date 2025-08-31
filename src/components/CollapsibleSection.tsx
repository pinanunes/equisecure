import React from 'react';

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, isOpen, onToggle, children }) => {
  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      {/* O cabeçalho clicável (permanece o mesmo) */}
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-6 text-left"
      >
        <h3 className="text-xl font-bold text-charcoal">{title}</h3>
        <svg
          className={`h-6 w-6 text-gray-500 transform transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* --- A ALTERAÇÃO ESTÁ AQUI --- */}
      {/* O conteúdo colapsável, agora usando a técnica de grid */}
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          // Quando está aberto, definimos as linhas da grelha para '1fr' (uma fração do espaço, ou seja, altura automática)
          // Quando está fechado, definimos para '0fr' (altura zero)
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        {/* Este 'div' interior é crucial para que a animação funcione corretamente */}
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-2"> {/* Adicionado um pt-2 para um pequeno espaçamento */}
            {children}
          </div>
        </div>
      </div>
      {/* --- FIM DA ALTERAÇÃO --- */}
    </div>
  );
};

export default CollapsibleSection;