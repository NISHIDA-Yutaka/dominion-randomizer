/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in-out': {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(79, 70, 229, 0)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 15px 5px rgba(99, 102, 241, 0.7)',
            transform: 'scale(1.05)'
           },
        },
      },
      animation: {
        'fade-in-out': 'fade-in-out 2.5s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};