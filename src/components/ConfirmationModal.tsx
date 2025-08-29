// src/components/ConfirmationModal.tsx

import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  children: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onConfirm, onCancel, title, children }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-charcoal mb-4">{title}</h2>
        <div className="text-gray-600 mb-6">
          {children}
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-gray-200 text-charcoal hover:bg-gray-300"
          >
            Não
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-golden-yellow text-charcoal hover:bg-golden-yellow-dark font-medium"
          >
            Sim, Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;