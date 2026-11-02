export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cine: {
          bg: '#0b0d12',
          surface: '#13161d',
          surface2: '#1b1f29',
          border: '#262b36',
          accent: '#e11d48',
          accent2: '#7c3aed',
          text: '#f4f4f5',
          muted: '#9ca3af',
        },
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
};
