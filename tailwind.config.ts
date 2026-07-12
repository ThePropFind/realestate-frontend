import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // "Green Growth" palette — mirrors realestate-mobile/src/theme/colors.ts
        // (Forest Green brand, Brass Gold accent, Sage secondary, Warm Ivory bg).
        brand: {
          50:  '#e6ece1', // pale sage tint (mobile brandTint)
          100: '#cddcd4',
          200: '#a3b18a', // Sage (mobile sage)
          300: '#6f8f83',
          400: '#3e6c63',
          500: '#2a5a52',
          600: '#184a45', // Forest Green (mobile brand)
          700: '#143f3a',
          800: '#0f332f', // mobile brandDark
          900: '#0a2421',
        },
        accent: {
          50:  '#f9f3e8',
          100: '#eeddbd',
          400: '#c6a15b', // Brass Gold (mobile accent)
          600: '#a67f3e',
          800: '#71542a',
        },
        // Warm Ivory page background — retints every bg-slate-50 surface to match mobile
        slate: { 50: '#F7F3ED' },
      },
      boxShadow: {
        // Soft elevation matching the mobile cards (slate-900 @ low opacity)
        soft: '0 6px 16px rgba(15,23,42,0.06)',
        card: '0 10px 30px rgba(15,23,42,0.08)',
      },
      backgroundImage: {
        // Forest hero gradient — mirrors mobile heroGradient
        'hero-gradient': 'linear-gradient(180deg, #2a6d63 0%, #184a45 45%, #0f332f 100%)',
      },
    },
  },
  plugins: [],
}
export default config
