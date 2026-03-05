import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        yellow: 'var(--yellow)',
        blue: 'var(--blue)',
        green: 'var(--green)',
        red: 'var(--red)',
        'light-blue': 'var(--light-blue)',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        heading: ['var(--font-archivo)', 'sans-serif'],
      },
      boxShadow: {
        'neobrutalism': '4px 4px 0px 0px #000',
        'neobrutalism-sm': '2px 2px 0px 0px #000',
        'neobrutalism-hover': '2px 2px 0px 0px #000',
      },
      borderRadius: {
        'base': '10px',
      },
    },
  },
  plugins: [],
}
export default config
