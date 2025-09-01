/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",
        secondary: "#8b5cf6",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#374151',
            a: {
              color: '#2563eb',
              '&:hover': {
                color: '#1d4ed8',
              },
            },
            'h1, h2, h3, h4, h5, h6': {
              color: '#111827',
            },
            table: {
              width: '100%',
              borderCollapse: 'collapse',
              borderRadius: '0.5rem',
              overflow: 'hidden',
            },
            'thead th': {
              backgroundColor: '#f3f4f6',
              padding: '0.75rem 1rem',
              fontWeight: '600',
              textAlign: 'left',
            },
            'tbody td': {
              padding: '0.75rem 1rem',
            },
            'tbody tr': {
              borderBottomWidth: '1px',
              borderColor: '#e5e7eb',
            },
            'tbody tr:hover': {
              backgroundColor: '#f9fafb',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};