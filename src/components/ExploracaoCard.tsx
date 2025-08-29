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
}

const ExploracaoCard: React.FC<ExploracaoCardProps> = ({
  installation,
  evaluations,
  isOpen,
  onToggle,
  getRiskLevel,
  formatDate,
}) => {
  const latestEvaluation = evaluations?.[0]; // Assumes evaluations are sorted descending
  const latestRisk = latestEvaluation ? getRiskLevel(latestEvaluation.total_score) : null;

  return (
    <li className="px-4 py-4 sm:px-6">
      {/* Clickable Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center space-x-4">
          {/* Risk Circle */}
          {latestRisk && (
            <div className={`h-4 w-4 rounded-full ${latestRisk.bgColor}`}></div>
          )}
          
          {/* Name and Type */}
          <div>
            <h4 className="text-lg font-medium text-charcoal">{installation.name}</h4>
            <div className="text-sm text-gray-500">
              {installation.type}
            </div>
          </div>
        </div>

        {/* Chevron Icon for expand/collapse indicator */}
        <div className="flex items-center space-x-4">
           <Link
              to={`/evaluate?installation=${installation.id}`}
              onClick={(e) => e.stopPropagation()} // Prevents the card from toggling
              className="bg-sage-green text-white px-3 py-1 rounded text-sm hover:bg-sage-green-dark z-10"
            >
              Reavaliar
            </Link>
          <svg
            className={`h-6 w-6 text-gray-400 transform transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Collapsible Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 mt-4' : 'max-h-0'
        }`}
      >
        {evaluations.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-charcoal mb-2">
              Histórico de Avaliações ({evaluations.length})
            </h5>
            <div className="space-y-2">
              {evaluations.map((evaluation) => {
                const risk = getRiskLevel(evaluation.total_score);
                return (
                  <div key={evaluation.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(evaluation.created_at)}
                      </span>
                      <span className={`text-sm font-medium ${risk.color}`}>
                        Risco {risk.level}
                      </span>
                      <span className="text-sm text-gray-600">
                        Score: {(evaluation.total_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Link
                      to={`/evaluation-report/${evaluation.id}`}
                      state={{ from: '/dashboard' }}
                      className="text-forest-green hover:text-forest-green-dark text-sm font-medium"
                    >
                      Ver Relatório
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </li>
  );
};

export default ExploracaoCard;