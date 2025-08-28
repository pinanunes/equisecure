import React, { useState } from 'react';

interface ConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onConsent }) => {
  const [hasAgreed, setHasAgreed] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (hasAgreed) {
      onConsent();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-forest-green rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-charcoal">
              Consentimento para Utilização de Dados em Investigação
            </h2>
          </div>

          <div className="space-y-4 text-charcoal mb-6">
            <p className="text-lg">
              Na EquiSecure, estamos empenhados em avançar a ciência da biossegurança equina. 
              Para tal, gostaríamos de utilizar os dados anonimizados das suas avaliações para 
              fins de investigação científica.
            </p>

            <div className="bg-sage-green bg-opacity-10 p-4 rounded-lg border-l-4 border-sage-green">
              <h3 className="font-semibold text-lg mb-3 text-forest-green">
                A sua privacidade é a nossa prioridade:
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-forest-green mr-2">•</span>
                  <span>
                    Todos os dados utilizados serão <strong>completamente anonimizados</strong>. 
                    Nenhuma informação pessoal (nome, e-mail) ou da sua exploração (nome, localização exata) 
                    será partilhada.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-forest-green mr-2">•</span>
                  <span>
                    Os dados agregados e anónimos poderão ser usados em publicações científicas, 
                    conferências e para o desenvolvimento de melhores práticas de biossegurança.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-forest-green mr-2">•</span>
                  <span>
                    Esta escolha <strong>não afetará</strong> a sua utilização da aplicação.
                  </span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-gray-600">
              Ao marcar a caixa abaixo, concorda com a utilização confidencial e anónima dos seus 
              dados de avaliação para investigação científica.
            </p>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-start space-x-3 mb-6">
              <input
                type="checkbox"
                id="consent-checkbox"
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                className="w-5 h-5 text-forest-green focus:ring-forest-green border-gray-300 rounded mt-1"
              />
              <label htmlFor="consent-checkbox" className="text-charcoal cursor-pointer">
                <span className="font-medium">
                  Concordo com a utilização dos meus dados de avaliação, de forma anónima e confidencial, 
                  para fins de investigação científica.
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={handleSubmit}
                disabled={!hasAgreed}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  hasAgreed
                    ? 'bg-forest-green text-white hover:bg-forest-green-dark'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;
