import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo.svg';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recoveryTokenFound, setRecoveryTokenFound] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes, specifically PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session);
        
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery event detected');
          setRecoveryTokenFound(true);
          setCheckingToken(false);
        } else if (event === 'SIGNED_IN' && session) {
          // Check if this is a recovery session
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('User signed in during recovery');
            setRecoveryTokenFound(true);
            setCheckingToken(false);
          }
        } else {
          // Check if we already have a valid session
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            console.log('Valid session found');
            setRecoveryTokenFound(true);
          } else {
            console.log('No valid session found');
            setError('Link de recuperação inválido ou expirado. Por favor, solicite um novo link.');
          }
          setCheckingToken(false);
        }
      }
    );

    // Initial check for existing session
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Initial session found');
          setRecoveryTokenFound(true);
        }
        setCheckingToken(false);
      } catch (error) {
        console.error('Error checking initial session:', error);
        setError('Erro ao validar link de recuperação.');
        setCheckingToken(false);
      }
    };

    checkInitialSession();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('As passwords não coincidem');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      // Verificar se temos uma sessão válida
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Sessão expirada. Por favor, solicite um novo link de recuperação.');
        setLoading(false);
        return;
      }

      console.log('Tentando atualizar password...');
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Erro ao atualizar password:', error);
        setError(`Erro ao redefinir password: ${error.message}`);
      } else {
        console.log('Password atualizada com sucesso');
        setSuccess(true);
        // Fazer logout para forçar novo login com a nova password
        await supabase.auth.signOut();
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      setError('Erro ao redefinir a password. Tente novamente.');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
          <img
            src={logo}
            alt="EquiSecure"
            className="h-64 w-auto mx-auto mb-8"
          />
            <h2 className="text-3xl font-extrabold text-charcoal">
              Password redefinida com sucesso!
            </h2>
            <p className="mt-2 text-sm text-charcoal">
              A sua password foi atualizada. Será redirecionado para o login em breve...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking token
  if (checkingToken) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              src={logo}
              alt="EquiSecure"
              className="h-64 w-auto mx-auto mb-8"
            />
            <h2 className="text-3xl font-extrabold text-charcoal">
              Verificando link de recuperação...
            </h2>
            <p className="mt-2 text-sm text-charcoal">
              Por favor, aguarde
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no valid recovery token found
  if (!recoveryTokenFound) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              src={logo}
              alt="EquiSecure"
              className="h-64 w-auto mx-auto mb-8"
            />
            <h2 className="text-3xl font-extrabold text-charcoal">
              Link Inválido
            </h2>
            <p className="mt-2 text-sm text-charcoal">
              {error || 'Link de recuperação inválido ou expirado.'}
            </p>
            <div className="mt-4">
              <button
                onClick={() => navigate('/forgot-password')}
                className="font-medium text-forest-green hover:text-forest-green-dark"
              >
                Solicitar novo link de recuperação
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src={logo}
            alt="EquiSecure"
            className="h-64 w-auto mx-auto mb-8"
          />
          <h2 className="text-3xl font-extrabold text-charcoal">
            Redefinir Password
          </h2>
          <p className="mt-2 text-sm text-charcoal">
            Introduza a sua nova password
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">
                Nova Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-charcoal rounded-t-md focus:outline-none focus:ring-forest-green focus:border-forest-green focus:z-10 sm:text-sm"
                placeholder="Nova Password (mínimo 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirmar Nova Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-charcoal rounded-b-md focus:outline-none focus:ring-forest-green focus:border-forest-green focus:z-10 sm:text-sm"
                placeholder="Confirmar Nova Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-forest-green hover:bg-forest-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-green disabled:opacity-50"
            >
              {loading ? 'A redefinir...' : 'Redefinir Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
