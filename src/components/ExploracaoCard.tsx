// src/components/ExploracaoCard.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import type { Exploracao, Evaluation } from '../types';

interface ExploracaoCardProps {
  installation: Exploracao;
  evaluations: Evaluation[];
  isOpen: boolean;
  onToggle: () => void;
  getRiskLevel: (score: number) => { level: string; color: string; bgColor: string; };
  formatDate: (dateString: string) => string;
  planStatus?: 'not_generated' | 'generating' | 'draft' | 'published';
}

const ExploracaoCard: React.FC<ExploracaoCardProps> = ({
  installation,
  evaluations,
  isOpen,
  onToggle,
  getRiskLevel,
  formatDate,
}) => {
  // Apenas uma declaração da variável 'latestEvaluation'
  const latestEvaluation = evaluations?.[0];
  const latestRisk = latestEvaluation ? getRiskLevel(latestEvaluation.total_score) : null;

  return (
    <li className="px-4 py-4 sm:px-6">
      {/* O seu "Clickable Header" permanece exatamente o mesmo */}
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center space-x-4">
          {latestRisk ? (
            <div className={`h-4 w-4 rounded-full ${latestRisk.bgColor}`}></div>
          ) : (
            <div className="h-4 w-4 rounded-full bg-gray-300"></div>
          )}
          <div>
            <h4 className="text-lg font-medium text-charcoal">{installation.name}</h4>
            <div className="text-sm text-gray-500">{installation.type}</div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
           <Link
              to={`/evaluate?installation=${installation.id}`}
              onClick={(e) => e.stopPropagation()}
              className="bg-sage-green text-white px-3 py-1 rounded text-sm hover:bg-sage-green-dark z-10"
            >
              Reavaliar
            </Link>
          <svg
            className={`h-6 w-6 text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* A sua área "Collapsible Content" é onde fazemos a alteração */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 mt-4' : 'max-h-0'}`}>
        {evaluations.length > 0 ? (
          <div>
            <h5 className="text-sm font-medium text-charcoal mb-2">
              Histórico de Avaliações ({evaluations.length})
            </h5>
            <div className="space-y-2">
              {evaluations.map((evaluation) => { // Estamos dentro do loop de cada avaliação
                const risk = getRiskLevel(evaluation.total_score);
                const planStatus = evaluation.plan_status; // Obtemos o status desta avaliação específica

                return (
                  <div key={evaluation.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">{formatDate(evaluation.created_at)}</span>
                      <span className={`text-sm font-medium ${risk.color}`}>Risco {risk.level}</span>
                      <span className="text-sm text-gray-600">Score: {(evaluation.total_score * 100).toFixed(1)}%</span>
                    </div>

                    {/* --- A ALTERAÇÃO ESTÁ AQUI --- */}
                    {/* Substituímos o antigo Link por este novo botão com lógica condicional */}
                    <Link
                      to={`/evaluation-report/${evaluation.id}`}
                      state={{ from: '/dashboard' }}
                      className="bg-forest-green text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-forest-green-dark inline-flex items-center"
                    >
                      {planStatus === 'published' ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Plano e Relatório
                        </>
                      ) : (
                        'Ver Relatório'
                      )}
                    </Link>
                    {/* --- FIM DA ALTERAÇÃO --- */}

                  </div>
                );
              })}
            </div>
          </div>
        ) : (
            <div className="text-center text-sm text-gray-500 py-4">
                Ainda não existem avaliações para esta exploração.
            </div>
        )}
      </div>
    </li>
  );
};

export default ExploracaoCard;