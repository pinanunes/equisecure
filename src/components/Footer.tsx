import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-cream mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center space-y-4">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/fmv_logo_B.png" 
              alt="Faculdade de Medicina Veterinária - Universidade de Lisboa" 
              className="h-24 w-auto"
            />
          </div>
          
          {/* Copyright Text */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              © 2025 Faculdade de Medicina Veterinária - Universidade de Lisboa
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
