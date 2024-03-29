module.exports = {
  mode: 'jit',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand_primary: '#ffffff',
        brand_secondary: '#000000',
        brand_accent: '#E21B1B',
        brand_yellow: '#ffa33e',
        brand_pink: '#a23acd',
      },

      opacity: {
        10: '0.1',
        20: '0.2',
        30: '0.3',
        40: '0.4',
        50: '0.5',
        60: '0.6',
        70: '0.7',
        80: '0.8',
        90: '0.90',
      },
      height: {
        '10vh': '10vh',
        '20vh': '20vh',
        '30vh': '30vh',
        '40vh': '40vh',
        '50vh': '50vh',
        '60vh': '60vh',
        '70vh': '70vh',
        '80vh': '80vh',
        '90vh': '90vh',
        '100vh': '100vh',
        '110vh': '110vh',
        '120vh': '120vh',
        '130vh': '130vh',
        '140vh': '140vh',
        '150vh': '150vh',
        '175vh': '175vh',
      },
    },
  },
};
