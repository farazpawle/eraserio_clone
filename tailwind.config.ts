import type { Config } from "tailwindcss"
import { designTokens } from "./lib/design-tokens"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    // Override default Tailwind values with our design tokens
    screens: designTokens.breakpoints,
    spacing: designTokens.spacing as any,
    fontFamily: designTokens.typography.fontFamily as any,
    fontSize: designTokens.typography.fontSize as any,
    fontWeight: designTokens.typography.fontWeight,
    lineHeight: designTokens.typography.lineHeight,
    letterSpacing: designTokens.typography.letterSpacing,
    borderRadius: {
      ...designTokens.borderRadius,
      // Keep existing CSS variable-based radius for shadcn/ui compatibility
      lg: "var(--radius)",
      md: "calc(var(--radius) - 2px)",
      sm: "calc(var(--radius) - 4px)",
    },
    boxShadow: designTokens.boxShadow,
    zIndex: designTokens.zIndex,
    
    extend: {
      colors: {
        // Keep existing shadcn/ui color system
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // Add our design token primary colors
          ...designTokens.colors.primary,
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          // Add our design token secondary colors
          ...designTokens.colors.secondary,
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
          // Add accent colors from design tokens
          purple: designTokens.colors.accent.purple,
          green: designTokens.colors.accent.green,
          orange: designTokens.colors.accent.orange,
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // Add our comprehensive color system
        brand: designTokens.colors.primary,
        neutral: designTokens.colors.neutral,
        
        // Semantic colors
        success: designTokens.colors.semantic.success,
        warning: designTokens.colors.semantic.warning,
        error: designTokens.colors.semantic.error,
        info: designTokens.colors.semantic.info,
      },
      
      // Animation system from design tokens
      transitionDuration: designTokens.animation.duration,
      transitionTimingFunction: designTokens.animation.easing,
      
      keyframes: {
        // Keep existing shadcn/ui animations
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        
        // Add our design token animations
        ...designTokens.animation.keyframes,
      },
      
      animation: {
        // Keep existing animations
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        
        // Add new animations using our design tokens
        "fade-in": "fadeIn 300ms ease-out",
        "fade-out": "fadeOut 300ms ease-out",
        "slide-in-up": "slideInUp 300ms ease-out",
        "slide-in-down": "slideInDown 300ms ease-out",
        "slide-in-left": "slideInLeft 300ms ease-out",
        "slide-in-right": "slideInRight 300ms ease-out",
        "scale-in": "scaleIn 200ms ease-out",
        "scale-out": "scaleOut 200ms ease-out",
        "bounce": "bounce 1s infinite",
        "pulse": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin": "spin 1s linear infinite",
      },
      
      // Component-specific utilities
      height: {
        ...designTokens.components.button.height,
        ...designTokens.components.input.height,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config