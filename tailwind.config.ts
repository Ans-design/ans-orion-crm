import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.css',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        none: '0',
        sm: 'var(--radius-sm, 7px)',
        DEFAULT: 'var(--radius-ui, 7px)',
        md: 'var(--radius-ui, 7px)',
        lg: 'var(--radius-ui, 7px)',
        xl: 'var(--radius-ui, 7px)',
        '2xl': 'var(--radius-ui, 7px)',
        '3xl': 'var(--radius-ui, 7px)',
        full: '9999px',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          /* HSL dédié — ne pas réutiliser --primary hex (color-mix / CSS custom) */
          DEFAULT: 'hsl(var(--primary-hsl, 345 100% 55%))',
          foreground: 'hsl(var(--primary-foreground-hsl, 0 0% 100%))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive-hsl, 345 100% 55%))',
          foreground: 'hsl(var(--destructive-foreground-hsl, 0 0% 100%))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring-hsl, 345 100% 55%))',
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)',
        },
        ans: {
          red: {
            DEFAULT: 'var(--ans-red-500)',
            500: 'var(--ans-red-500)',
            600: 'var(--ans-red-600)',
            700: 'var(--ans-red-700)',
            vivid: 'var(--ans-red-vivid)',
            dark: 'var(--ans-red-dark)',
          },
          pink: {
            400: 'var(--ans-pink-400)',
            500: 'var(--ans-pink-500)',
            600: 'var(--ans-pink-600)',
          },
          gold: {
            400: 'var(--ans-gold-400)',
            500: 'var(--ans-gold-500)',
          },
          orange: {
            500: 'var(--ans-orange-500)',
            600: 'var(--ans-orange-600)',
          },
          plum: {
            700: 'var(--ans-plum-700)',
            900: 'var(--ans-plum-900)',
          },
          yellow: 'var(--ans-yellow)',
          'yellow-soft': 'var(--ans-yellow-soft)',
          cyan: 'var(--ans-cyan)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        info: 'var(--info)',
        surface: {
          app: 'var(--bg-app)',
          page: 'var(--bg-page)',
          panel: 'var(--bg-panel)',
          card: 'var(--bg-card)',
          'card-soft': 'var(--bg-card-soft)',
          'card-elevated': 'var(--bg-card-elevated)',
          chip: 'var(--bg-chip)',
          'chip-active': 'var(--bg-chip-active)',
          'row-alt': 'var(--bg-row-alt)',
          'row-hover': 'var(--bg-row-hover)',
          'selected-soft': 'var(--bg-selected-soft)',
          'context-soft': 'var(--bg-context-soft)',
          hover: 'var(--bg-hover)',
          'active-soft': 'var(--bg-active-soft)',
          'warm-subtle': 'var(--bg-warm-subtle)',
        },
        backdrop: 'var(--backdrop)',
        orion: {
          bg: 'var(--bg-app)',
          'bg-2': 'var(--bg-page)',
          surface: 'var(--bg-panel)',
          muted: 'var(--text-subtle)',
          dim: 'var(--text-subtle)',
          red: 'var(--primary)',
          yellow: 'var(--warning)',
        },
      },
      keyframes: {
        'orion-fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
      },
      animation: {
        'orion-fade-up': 'orion-fade-up 0.35s ease-out both',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
