/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Blueprint-specific semantic colors
        line: "hsl(var(--blueprint-line))",
        grid: "hsl(var(--blueprint-grid))",
        annotation: "hsl(var(--blueprint-annotation))",
        success: "hsl(var(--blueprint-success))",
        // Blueprint color scale
        blueprint: {
          50:  "hsl(210, 40%, 98%)",
          100: "hsl(210, 35%, 93%)",
          200: "hsl(215, 30%, 85%)",
          300: "hsl(215, 35%, 70%)",
          400: "hsl(215, 50%, 55%)",
          500: "hsl(215, 70%, 45%)",
          600: "hsl(215, 80%, 35%)",
          700: "hsl(215, 85%, 28%)",
          800: "hsl(215, 55%, 15%)",
          900: "hsl(215, 55%, 10%)",
          950: "hsl(215, 55%, 6%)",
        },
        cyan: {
          400: "hsl(185, 85%, 50%)",
          500: "hsl(185, 90%, 45%)",
          600: "hsl(185, 85%, 38%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'blueprint': '0 0 20px -5px hsl(var(--blueprint-line) / 0.5)',
        'blueprint-lg': '0 0 30px -5px hsl(var(--blueprint-line) / 0.6)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
