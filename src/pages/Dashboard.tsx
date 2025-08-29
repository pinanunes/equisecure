// src/components/ExploracaoCard.tsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import type { Exploracao, Evaluation } from '../types';
import ConsentModal from '../components/ConsentModal';
import ExploracaoCard from '../components/ExploracaoCard';

const Dashboard: React.FC = () => {
  const { user, signOut, updateConsent } = useAuth();
  const [exploracoes, setExploracoes] = useState<Exploracao[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [openExploracaoId, setOpenExploracaoId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchExploracoes();
      fetchEvaluations();
      
      // Check if user needs to give consent
      if (user.has_given_consent === false || user.has_given_consent === undefined) {
        setShowConsentModal(true);
      }
    }
  }, [user]);


  const handleConsent = async () => {
    const { error } = await updateConsent();
    if (!error) {
      setShowConsentModal(false);
    } else {
      console.error('Error updating consent:', error);
      // Still close modal to not block the user
      setShowConsentModal(false);
    }
  };

  const fetchExploracoes = async () => {
    try {
      const { data, error } = await supabase
        .from('installations')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching exploracoes:', error);
      } else {
        setExploracoes(data || []);
      }
    } catch (error) {
      console.error('Error in fetchExploracoes:', error);
    }
  };

  const fetchEvaluations = async () => {
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          installation:installations(*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching evaluations:', error);
      } else {
        setEvaluations(data || []);
      }
    } catch (error) {
      console.error('Error in fetchEvaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };
  const getInstallationEvaluations = (installationId: string) => {
    return evaluations.filter(evaluation => evaluation.installation_id === installationId);
  };

  // 3. Add a handler to toggle the accordion
  const handleToggleExploracao = (installationId: string) => {
    setOpenExploracaoId(prevId => (prevId === installationId ? null : installationId));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const getRiskLevel = (score: number) => {
    if (score <= 0.3) return { level: 'Baixo', color: 'text-green-600', bgColor: 'bg-green-500' };
    if (score <= 0.6) return { level: 'Médio', color: 'text-yellow-600', bgColor: 'bg-yellow-500' };
    return { level: 'Alto', color: 'text-red-600', bgColor: 'bg-red-500' };
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-charcoal">A carregar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-forest-green shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">EquiSecure</h1>
              <p className="text-sage-green">Bem-vindo, {user?.full_name || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="bg-golden-yellow text-charcoal px-4 py-2 rounded-md text-sm font-medium hover:bg-golden-yellow-dark"
                >
                  Administração
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="bg-warm-brown text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-warm-brown-dark"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Action Buttons */}
          <div className="mb-8">
            <Link
              to="/evaluate"
              className="bg-forest-green text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-forest-green-dark inline-block"
            >
              Avaliar Nova Exploração
            </Link>
          </div>

          {/* Installations List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-charcoal">
                As Suas Explorações
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Lista de explorações avaliadas e histórico de avaliações
              </p>
            </div>
            
            {exploracoes.length === 0 ? (
              <div className="px-4 py-5 sm:px-6 text-center">
                <p className="text-gray-500">Ainda não avaliou nenhuma exploração.</p>
                <Link
                  to="/evaluate"
                  className="mt-2 text-forest-green hover:text-forest-green-dark font-medium"
                >
                  Fazer a primeira avaliação
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {/* 4. Replace the old list with the new component */}
                {exploracoes.map((installation) => {
                  const installationEvaluations = getInstallationEvaluations(installation.id);
                  
                  return (
                    <ExploracaoCard
                      key={installation.id}
                      installation={installation}
                      evaluations={installationEvaluations}
                      isOpen={openExploracaoId === installation.id}
                      onToggle={() => handleToggleExploracao(installation.id)}
                      getRiskLevel={getRiskLevel}
                      formatDate={formatDate}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
      
      {/* Consent Modal */}
      <ConsentModal isOpen={showConsentModal} onConsent={handleConsent} />
    </div>
  );
};

export default Dashboard;
