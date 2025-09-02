import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms' // Importar o plugin

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // As suas cores personalizadas que definimos no index.css podem viver aqui
      colors: {
        'forest-green': '#2F4F4F',
        'forest-green-dark': '#1a2f2f',
        'warm-brown': '#8B4513',
        'warm-brown-dark': '#5d2e0c',
        'sage-green': '#A2B59F',
        'sage-green-dark': '#8a9d87',
        'golden-yellow': '#DAA520',
        'golden-yellow-dark': '#b8891c',
        'sky-blue': '#87CEEB',
        'cream': '#F5F5DC',
        'charcoal': '#36454F',
        },
    },
  },
  plugins: [
    forms, // Ativar o plugin de formulários
  ],
} satisfies Config