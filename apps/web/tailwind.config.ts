import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Consolas',
          'Liberation Mono',
          'ui-monospace',
          'monospace',
        ],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        bid: '10px',
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
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
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
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        // BID brand palette
        bid: {
          DEFAULT: 'hsl(var(--bid) / <alpha-value>)',
          dark: 'hsl(var(--bid-dark) / <alpha-value>)',
          mid: 'hsl(var(--bid-mid) / <alpha-value>)',
          light: 'hsl(var(--bid-light) / <alpha-value>)',
        },
        // Legacy app aliases backed by the same light/dark theme tokens.
        surface: {
          DEFAULT: 'hsl(var(--background) / <alpha-value>)',
          panel: 'hsl(var(--card) / <alpha-value>)',
          subtle: 'hsl(var(--muted) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'hsl(var(--foreground) / <alpha-value>)',
          muted: 'hsl(var(--muted-foreground) / <alpha-value>)',
          faint: 'hsl(var(--faint-foreground) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'hsl(var(--legacy-line) / <alpha-value>)',
          strong: 'hsl(var(--legacy-line-strong) / <alpha-value>)',
        },
        // Semantic accents used by badges, alerts, and charts.
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          dark: 'hsl(var(--info-dark) / <alpha-value>)',
          light: 'hsl(var(--info-light) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          dark: 'hsl(var(--success-dark) / <alpha-value>)',
          light: 'hsl(var(--success-light) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          dark: 'hsl(var(--warning-dark) / <alpha-value>)',
          light: 'hsl(var(--warning-light) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
          light: 'hsl(var(--danger-light) / <alpha-value>)',
        },
      },
      ringColor: {
        DEFAULT: 'hsl(var(--ring))',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'toast-in': 'toast-in 0.25s ease-out',
      },
    },
  },
  plugins: [animate],
};
export default config;
