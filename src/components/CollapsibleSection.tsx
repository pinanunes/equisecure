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
      {/* O cabeçalho clicável */}
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

      {/* O conteúdo colapsável */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? 'max-h-[2000px]' : 'max-h-0' // max-h grande para não cortar conteúdo
        }`}
      >
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;