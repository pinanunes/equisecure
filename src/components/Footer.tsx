import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white shadow-inner mt-auto border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/fmv_logo_B.png" 
              alt="Faculdade de Medicina Veterinária - Universidade de Lisboa" 
              className="h-12 w-auto"
            />
          </div>
          
          {/* Copyright Text */}
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-600">
              Copyright 2025 - Faculdade de Medicina Veterinária - Universidade de Lisboa
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
