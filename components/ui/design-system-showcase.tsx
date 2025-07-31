'use client'

import React from 'react'
import { designTokens } from '@/lib/design-tokens'

/**
 * Design System Showcase Component
 * 
 * This component demonstrates the usage of our new design tokens
 * and serves as a reference for developers.
 */
export const DesignSystemShowcase: React.FC = () => {
  return (
    <div className="p-8 space-y-12 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-display-1 text-brand">Design System Showcase</h1>
        <p className="text-body-large text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          Explore our comprehensive design token system with colors, typography, spacing, and components.
        </p>
      </div>

      {/* Color Palette */}
      <section className="space-y-6">
        <h2 className="text-heading-1 text-neutral-900 dark:text-neutral-100">Color Palette</h2>
        
        {/* Primary Colors */}
        <div className="space-y-4">
          <h3 className="text-heading-3 text-neutral-700 dark:text-neutral-300">Primary Brand Colors</h3>
          <div className="grid grid-cols-11 gap-2">
            {Object.entries(designTokens.colors.primary).map(([scale, color]) => (
              <div key={scale} className="text-center">
                <div 
                  className="w-16 h-16 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700"
                  style={{ backgroundColor: color }}
                />
                <div className="mt-2 space-y-1">
                  <div className="text-caption font-medium text-neutral-900 dark:text-neutral-100">{scale}</div>
                  <div className="text-caption text-neutral-500 dark:text-neutral-400 font-mono">{color}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Semantic Colors */}
        <div className="space-y-4">
          <h3 className="text-heading-3 text-neutral-700 dark:text-neutral-300">Semantic Colors</h3>
          <div className="grid grid-cols-4 gap-6">
            {Object.entries(designTokens.colors.semantic).map(([name, colorScale]) => (
              <div key={name} className="space-y-2">
                <h4 className="text-body font-semibold capitalize text-neutral-900 dark:text-neutral-100">{name}</h4>
                <div className="grid grid-cols-3 gap-1">
                  {[50, 500, 600].map(scale => (
                    <div key={scale} className="text-center">
                      <div 
                        className="w-12 h-12 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-700"
                        style={{ backgroundColor: (colorScale as any)[scale] }}
                      />
                      <div className="text-caption text-neutral-500 dark:text-neutral-400 mt-1">{scale}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="text-heading-1 text-neutral-900 dark:text-neutral-100">Typography</h2>
        
        <div className="space-y-4">
          <div className="text-display-1 text-neutral-900 dark:text-neutral-100">Display 1 - Hero Heading</div>
          <div className="text-display-2 text-neutral-900 dark:text-neutral-100">Display 2 - Large Heading</div>
          <div className="text-heading-1 text-neutral-900 dark:text-neutral-100">Heading 1 - Section Title</div>
          <div className="text-heading-2 text-neutral-900 dark:text-neutral-100">Heading 2 - Subsection</div>
          <div className="text-heading-3 text-neutral-900 dark:text-neutral-100">Heading 3 - Small Section</div>
          <div className="text-body-large text-neutral-700 dark:text-neutral-300">Body Large - Important content</div>
          <div className="text-body text-neutral-700 dark:text-neutral-300">Body - Regular content with good readability</div>
          <div className="text-body-small text-neutral-600 dark:text-neutral-400">Body Small - Secondary content</div>
          <div className="text-caption text-neutral-500 dark:text-neutral-500">Caption - Supplementary text</div>
        </div>
      </section>

      {/* Spacing */}
      <section className="space-y-6">
        <h2 className="text-heading-1 text-neutral-900 dark:text-neutral-100">Spacing Scale</h2>
        
        <div className="space-y-4">
          {['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'].map(size => (
            <div key={size} className="flex items-center space-x-4">
              <div className="w-20 text-body-small text-neutral-600 dark:text-neutral-400 font-mono">{size}</div>
              <div 
                className="bg-brand h-4 rounded"
                style={{ width: `var(--spacing-${size})` }}
              />
              <div className="text-caption text-neutral-500 dark:text-neutral-500 font-mono">
                {(designTokens.spacing as any)[size]}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Component Examples */}
      <section className="space-y-6">
        <h2 className="text-heading-1 text-neutral-900 dark:text-neutral-100">Component Examples</h2>
        
        {/* Buttons */}
        <div className="space-y-4">
          <h3 className="text-heading-3 text-neutral-700 dark:text-neutral-300">Buttons</h3>
          <div className="flex flex-wrap gap-4">
            <button className="btn-primary btn-sm">Primary Small</button>
            <button className="btn-primary btn-md">Primary Medium</button>
            <button className="btn-primary btn-lg">Primary Large</button>
            <button className="btn-secondary btn-md">Secondary</button>
            <button className="btn-outline btn-md">Outline</button>
            <button className="btn-ghost btn-md">Ghost</button>
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          <h3 className="text-heading-3 text-neutral-700 dark:text-neutral-300">Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6">
              <h4 className="text-heading-3 text-neutral-900 dark:text-neutral-100 mb-2">Basic Card</h4>
              <p className="text-body text-neutral-600 dark:text-neutral-400">A simple card with basic styling.</p>
            </div>
            <div className="card-hover p-6">
              <h4 className="text-heading-3 text-neutral-900 dark:text-neutral-100 mb-2">Hover Card</h4>
              <p className="text-body text-neutral-600 dark:text-neutral-400">A card with hover effects.</p>
            </div>
            <div className="card-interactive p-6">
              <h4 className="text-heading-3 text-neutral-900 dark:text-neutral-100 mb-2">Interactive Card</h4>
              <p className="text-body text-neutral-600 dark:text-neutral-400">A clickable card with interactions.</p>
            </div>
          </div>
        </div>

        {/* Form Elements */}
        <div className="space-y-4">
          <h3 className="text-heading-3 text-neutral-700 dark:text-neutral-300">Form Elements</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            <input className="input-base" placeholder="Default input" />
            <input className="input-success" placeholder="Success state" />
            <input className="input-error" placeholder="Error state" />
          </div>
        </div>

        {/* Badges */}
        <div className="space-y-4">
          <h3 className="text-heading-3 text-neutral-700 dark:text-neutral-300">Badges</h3>
          <div className="flex flex-wrap gap-3">
            <span className="badge-primary">Primary</span>
            <span className="badge-success">Success</span>
            <span className="badge-warning">Warning</span>
            <span className="badge-error">Error</span>
            <span className="badge-neutral">Neutral</span>
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-4">
          <h3 className="text-heading-3 text-neutral-700 dark:text-neutral-300">Alerts</h3>
          <div className="space-y-3 max-w-2xl">
            <div className="alert-info">
              <strong>Info:</strong> This is an informational message.
            </div>
            <div className="alert-success">
              <strong>Success:</strong> Operation completed successfully.
            </div>
            <div className="alert-warning">
              <strong>Warning:</strong> Please review your input.
            </div>
            <div className="alert-error">
              <strong>Error:</strong> Something went wrong.
            </div>
          </div>
        </div>
      </section>

      {/* Animations */}
      <section className="space-y-6">
        <h2 className="text-heading-1 text-neutral-900 dark:text-neutral-100">Animations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 animate-fade-in">
            <h4 className="text-heading-3 text-neutral-900 dark:text-neutral-100 mb-2">Fade In</h4>
            <p className="text-body text-neutral-600 dark:text-neutral-400">Smooth fade in animation.</p>
          </div>
          <div className="card p-6 animate-slide-up">
            <h4 className="text-heading-3 text-neutral-900 dark:text-neutral-100 mb-2">Slide Up</h4>
            <p className="text-body text-neutral-600 dark:text-neutral-400">Slides up from bottom.</p>
          </div>
          <div className="card p-6 animate-scale-in">
            <h4 className="text-heading-3 text-neutral-900 dark:text-neutral-100 mb-2">Scale In</h4>
            <p className="text-body text-neutral-600 dark:text-neutral-400">Scales in from center.</p>
          </div>
        </div>
      </section>

      {/* Interactive Elements */}
      <section className="space-y-6">
        <h2 className="text-heading-1 text-neutral-900 dark:text-neutral-100">Interactive Elements</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 interactive">
            <h4 className="text-heading-3 text-neutral-900 dark:text-neutral-100 mb-2">Interactive Element</h4>
            <p className="text-body text-neutral-600 dark:text-neutral-400">Hover over this card to see the interactive effect.</p>
          </div>
          <div className="card p-6">
            <h4 className="text-heading-3 text-neutral-900 dark:text-neutral-100 mb-2">Focus Example</h4>
            <button className="focus-ring-brand bg-brand text-white px-4 py-2 rounded-lg">
              Focus me with Tab
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pt-8 border-t border-neutral-200 dark:border-neutral-700">
        <p className="text-body-small text-neutral-500 dark:text-neutral-500">
          Design System implemented with comprehensive design tokens, utility classes, and component base styles.
        </p>
      </footer>
    </div>
  )
}

export default DesignSystemShowcase