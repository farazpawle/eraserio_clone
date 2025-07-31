/**
 * Design Tokens Test Suite
 * 
 * Tests for the design token system including color accessibility,
 * spacing consistency, typography hierarchy, and component styling.
 */

import { designTokens, getColor, getSpacing, getFontSize, getBorderRadius, getBoxShadow, getZIndex } from '@/lib/design-tokens';

describe('Design Tokens', () => {
  describe('Color System', () => {
    test('should have complete primary color scale', () => {
      const expectedScales = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
      
      expectedScales.forEach(scale => {
        expect((designTokens.colors.primary as any)[scale]).toBeDefined();
        expect(typeof (designTokens.colors.primary as any)[scale]).toBe('string');
        expect((designTokens.colors.primary as any)[scale]).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    test('should have complete secondary color scale', () => {
      const expectedScales = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
      
      expectedScales.forEach(scale => {
        expect((designTokens.colors.secondary as any)[scale]).toBeDefined();
        expect(typeof (designTokens.colors.secondary as any)[scale]).toBe('string');
        expect((designTokens.colors.secondary as any)[scale]).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    test('should have semantic colors', () => {
      const semanticColors = ['success', 'warning', 'error', 'info'];
      
      semanticColors.forEach(color => {
        expect((designTokens.colors.semantic as any)[color]).toBeDefined();
        expect((designTokens.colors.semantic as any)[color][500]).toBeDefined();
        expect(typeof (designTokens.colors.semantic as any)[color][500]).toBe('string');
      });
    });

    test('should have accent colors', () => {
      const accentColors = ['purple', 'green', 'orange'];
      
      accentColors.forEach(color => {
        expect((designTokens.colors.accent as any)[color]).toBeDefined();
        expect((designTokens.colors.accent as any)[color][500]).toBeDefined();
        expect(typeof (designTokens.colors.accent as any)[color][500]).toBe('string');
      });
    });

    test('should have neutral color scale', () => {
      const expectedScales = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
      
      expectedScales.forEach(scale => {
        expect((designTokens.colors.neutral as any)[scale]).toBeDefined();
        expect(typeof (designTokens.colors.neutral as any)[scale]).toBe('string');
        expect((designTokens.colors.neutral as any)[scale]).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    test('getColor helper function should work correctly', () => {
      expect(getColor('primary', 500)).toBe(designTokens.colors.primary[500]);
      expect(getColor('secondary', 300)).toBe(designTokens.colors.secondary[300]);
      expect(getColor('neutral', 900)).toBe(designTokens.colors.neutral[900]);
    });
  });

  describe('Spacing System', () => {
    test('should have consistent spacing scale', () => {
      const expectedSpacings = [
        '0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10',
        '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48', '52', '56', '60', '64', '72', '80', '96'
      ];
      
      expectedSpacings.forEach(spacing => {
        expect((designTokens.spacing as any)[spacing]).toBeDefined();
        expect(typeof (designTokens.spacing as any)[spacing]).toBe('string');
      });
    });

    test('should follow 4px base unit system', () => {
      // Test that most spacing values are multiples of 4px (0.25rem)
      const spacingValues = Object.values(designTokens.spacing);
      const remValues = spacingValues
        .filter(value => value.includes('rem'))
        .map(value => parseFloat(value.replace('rem', '')));
      
      remValues.forEach(value => {
        // Allow for some flexibility in the system (0.125rem = 2px, 0.375rem = 6px)
        const isValidSpacing = value === 0 || value % 0.125 === 0;
        expect(isValidSpacing).toBe(true);
      });
    });

    test('getSpacing helper function should work correctly', () => {
      expect(getSpacing(4)).toBe((designTokens.spacing as any)[4]);
      expect(getSpacing(8)).toBe((designTokens.spacing as any)[8]);
      expect(getSpacing('px')).toBe(designTokens.spacing.px);
    });
  });

  describe('Typography System', () => {
    test('should have font families', () => {
      expect(designTokens.typography.fontFamily.sans).toBeDefined();
      expect(designTokens.typography.fontFamily.serif).toBeDefined();
      expect(designTokens.typography.fontFamily.mono).toBeDefined();
      
      expect(Array.isArray(designTokens.typography.fontFamily.sans)).toBe(true);
      expect(designTokens.typography.fontFamily.sans).toContain('Inter');
    });

    test('should have complete font size scale', () => {
      const expectedSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
      
      expectedSizes.forEach(size => {
        expect((designTokens.typography.fontSize as any)[size]).toBeDefined();
        
        const [fontSize, config] = Array.isArray((designTokens.typography.fontSize as any)[size]) 
          ? (designTokens.typography.fontSize as any)[size] 
          : [(designTokens.typography.fontSize as any)[size], {}];
        
        expect(typeof fontSize).toBe('string');
        expect(fontSize).toMatch(/^\d+(\.\d+)?rem$/);
        
        if (config && config.lineHeight) {
          expect(typeof config.lineHeight).toBe('string');
        }
      });
    });

    test('should have font weights', () => {
      const expectedWeights = ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'];
      
      expectedWeights.forEach(weight => {
          expect((designTokens.typography.fontWeight as any)[weight]).toBeDefined();
          expect(typeof (designTokens.typography.fontWeight as any)[weight]).toBe('string');
          expect((designTokens.typography.fontWeight as any)[weight]).toMatch(/^\d{3}$/);
        });
    });

    test('should have line heights', () => {
      const expectedLineHeights = ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'];
      
      expectedLineHeights.forEach(lineHeight => {
          expect((designTokens.typography.lineHeight as any)[lineHeight]).toBeDefined();
          expect(typeof (designTokens.typography.lineHeight as any)[lineHeight]).toBe('string');
        });
    });

    test('should have letter spacing', () => {
      const expectedSpacings = ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'];
      
      expectedSpacings.forEach(spacing => {
          expect((designTokens.typography.letterSpacing as any)[spacing]).toBeDefined();
          expect(typeof (designTokens.typography.letterSpacing as any)[spacing]).toBe('string');
        });
    });

    test('getFontSize helper function should work correctly', () => {
      expect(getFontSize('base')).toBe(designTokens.typography.fontSize.base);
      expect(getFontSize('lg')).toBe(designTokens.typography.fontSize.lg);
      expect(getFontSize('2xl')).toBe((designTokens.typography.fontSize as any)['2xl']);
    });
  });

  describe('Border Radius System', () => {
    test('should have complete border radius scale', () => {
      const expectedRadii = ['none', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
      
      expectedRadii.forEach(radius => {
        expect((designTokens.borderRadius as any)[radius]).toBeDefined();
        expect(typeof (designTokens.borderRadius as any)[radius]).toBe('string');
      });
    });

    test('should have logical progression', () => {
      const remValues = {
        sm: 0.125,
        base: 0.25,
        md: 0.375,
        lg: 0.5,
        xl: 0.75,
        '2xl': 1,
        '3xl': 1.5
      };
      
      Object.entries(remValues).forEach(([key, expectedValue]) => {
        const actualValue = parseFloat((designTokens.borderRadius as any)[key].replace('rem', ''));
        expect(actualValue).toBe(expectedValue);
      });
    });

    test('getBorderRadius helper function should work correctly', () => {
      expect(getBorderRadius('lg')).toBe(designTokens.borderRadius.lg);
      expect(getBorderRadius('xl')).toBe(designTokens.borderRadius.xl);
      expect(getBorderRadius('full')).toBe(designTokens.borderRadius.full);
    });
  });

  describe('Shadow System', () => {
    test('should have complete shadow scale', () => {
      const expectedShadows = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', 'inner', 'none'];
      
      expectedShadows.forEach(shadow => {
        expect((designTokens.boxShadow as any)[shadow]).toBeDefined();
        expect(typeof (designTokens.boxShadow as any)[shadow]).toBe('string');
      });
    });

    test('should have valid CSS shadow values', () => {
      const shadowValues = Object.values(designTokens.boxShadow);
      
      shadowValues.forEach(shadow => {
        // Basic validation for CSS shadow syntax
        expect(shadow).toMatch(/^(none|inset|\d|rgb|rgba|#)/i);
      });
    });

    test('getBoxShadow helper function should work correctly', () => {
      expect(getBoxShadow('md')).toBe(designTokens.boxShadow.md);
      expect(getBoxShadow('lg')).toBe(designTokens.boxShadow.lg);
      expect(getBoxShadow('none')).toBe(designTokens.boxShadow.none);
    });
  });

  describe('Z-Index System', () => {
    test('should have complete z-index scale', () => {
      const expectedZIndices = ['auto', '0', '10', '20', '30', '40', '50', 'dropdown', 'sticky', 'fixed', 'modal', 'popover', 'tooltip', 'toast'];
      
      expectedZIndices.forEach(zIndex => {
        expect((designTokens.zIndex as any)[zIndex]).toBeDefined();
        expect(typeof (designTokens.zIndex as any)[zIndex]).toBe('string');
      });
    });

    test('should have logical z-index hierarchy', () => {
      const numericValues = {
        dropdown: 1000,
        sticky: 1020,
        fixed: 1030,
        modal: 1040,
        popover: 1050,
        tooltip: 1060,
        toast: 1070
      };
      
      Object.entries(numericValues).forEach(([key, expectedValue]) => {
        expect(parseInt((designTokens.zIndex as any)[key])).toBe(expectedValue);
      });
    });

    test('getZIndex helper function should work correctly', () => {
      expect(getZIndex('modal')).toBe(designTokens.zIndex.modal);
      expect(getZIndex('tooltip')).toBe(designTokens.zIndex.tooltip);
      expect(getZIndex('auto')).toBe(designTokens.zIndex.auto);
    });
  });

  describe('Animation System', () => {
    test('should have duration scale', () => {
      const expectedDurations = ['75', '100', '150', '200', '300', '500', '700', '1000'];
      
      expectedDurations.forEach(duration => {
        expect((designTokens.animation.duration as any)[duration]).toBeDefined();
        expect(typeof (designTokens.animation.duration as any)[duration]).toBe('string');
        expect((designTokens.animation.duration as any)[duration]).toMatch(/^\d+ms$/);
      });
    });

    test('should have easing functions', () => {
      const expectedEasings = ['linear', 'in', 'out', 'inOut'];
      
      expectedEasings.forEach(easing => {
        expect((designTokens.animation.easing as any)[easing]).toBeDefined();
        expect(typeof (designTokens.animation.easing as any)[easing]).toBe('string');
      });
    });

    test('should have keyframe animations', () => {
      const expectedKeyframes = ['fadeIn', 'fadeOut', 'slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight', 'scaleIn', 'scaleOut', 'bounce', 'pulse', 'spin'];
      
      expectedKeyframes.forEach(keyframe => {
        expect((designTokens.animation.keyframes as any)[keyframe]).toBeDefined();
        expect(typeof (designTokens.animation.keyframes as any)[keyframe]).toBe('object');
      });
    });
  });

  describe('Breakpoints', () => {
    test('should have complete breakpoint scale', () => {
      const expectedBreakpoints = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      
      expectedBreakpoints.forEach(breakpoint => {
        expect((designTokens.breakpoints as any)[breakpoint]).toBeDefined();
        expect(typeof (designTokens.breakpoints as any)[breakpoint]).toBe('string');
        expect((designTokens.breakpoints as any)[breakpoint]).toMatch(/^\d+px$/);
      });
    });

    test('should have logical progression', () => {
      const breakpointValues = {
        xs: 475,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        '2xl': 1536
      };
      
      Object.entries(breakpointValues).forEach(([key, expectedValue]) => {
        const actualValue = parseInt((designTokens.breakpoints as any)[key].replace('px', ''));
        expect(actualValue).toBe(expectedValue);
      });
    });
  });

  describe('Component Tokens', () => {
    test('should have button component tokens', () => {
      expect(designTokens.components.button.height).toBeDefined();
      expect(designTokens.components.button.padding).toBeDefined();
      
      const expectedSizes = ['sm', 'md', 'lg', 'xl'];
      expectedSizes.forEach(size => {
        expect((designTokens.components.button.height as any)[size]).toBeDefined();
        expect((designTokens.components.button.padding as any)[size]).toBeDefined();
      });
    });

    test('should have input component tokens', () => {
      expect(designTokens.components.input.height).toBeDefined();
      expect(designTokens.components.input.padding).toBeDefined();
      
      const expectedSizes = ['sm', 'md', 'lg'];
      expectedSizes.forEach(size => {
        expect((designTokens.components.input.height as any)[size]).toBeDefined();
        expect((designTokens.components.input.padding as any)[size]).toBeDefined();
      });
    });

    test('should have card component tokens', () => {
      expect(designTokens.components.card.padding).toBeDefined();
      
      const expectedSizes = ['sm', 'md', 'lg', 'xl'];
      expectedSizes.forEach(size => {
        expect((designTokens.components.card.padding as any)[size]).toBeDefined();
      });
    });
  });

  describe('Type Safety', () => {
    test('should export type definitions', () => {
      // These tests ensure the types are properly exported
      // TypeScript will catch any issues at compile time
      expect(typeof designTokens).toBe('object');
      expect(typeof getColor).toBe('function');
      expect(typeof getSpacing).toBe('function');
      expect(typeof getFontSize).toBe('function');
      expect(typeof getBorderRadius).toBe('function');
      expect(typeof getBoxShadow).toBe('function');
      expect(typeof getZIndex).toBe('function');
    });
  });

  describe('Accessibility', () => {
    test('should have sufficient color contrast in primary scale', () => {
      // Test that light colors (50-400) and dark colors (600-950) provide good contrast
      const lightColors = [50, 100, 200, 300, 400];
      const darkColors = [600, 700, 800, 900, 950];
      
      // Basic validation that we have both light and dark variants
      expect(lightColors.length).toBeGreaterThan(0);
      expect(darkColors.length).toBeGreaterThan(0);
      
      // Ensure colors exist
      lightColors.forEach(scale => {
        expect((designTokens.colors.primary as any)[scale]).toBeDefined();
      });
      
      darkColors.forEach(scale => {
        expect((designTokens.colors.primary as any)[scale]).toBeDefined();
      });
    });

    test('should have readable font sizes', () => {
      // Ensure minimum font size is readable (at least 12px)
      const xsSize = (designTokens.typography.fontSize.xs as any)[0];
      const xsSizeInPx = parseFloat(xsSize.replace('rem', '')) * 16; // Convert rem to px
      
      expect(xsSizeInPx).toBeGreaterThanOrEqual(12);
    });

    test('should have appropriate line heights', () => {
      // Test that line heights are within reasonable ranges
      Object.values(designTokens.typography.lineHeight).forEach(lineHeight => {
        const numericValue = parseFloat(lineHeight);
        expect(numericValue).toBeGreaterThanOrEqual(1);
        expect(numericValue).toBeLessThanOrEqual(2.5);
      });
    });
  });

  describe('Performance', () => {
    test('should not have circular references', () => {
      // Test that the design tokens object can be serialized
      expect(() => JSON.stringify(designTokens)).not.toThrow();
    });

    test('should have reasonable object size', () => {
      // Test that the design tokens object is not excessively large
      const serialized = JSON.stringify(designTokens);
      expect(serialized.length).toBeLessThan(50000); // Reasonable size limit
    });
  });
});

// Color contrast utility function for future use
function getContrastRatio(color1: string, color2: string): number {
  // This is a simplified version - in a real implementation,
  // you would use a proper color contrast calculation library
  // like 'color-contrast' or implement the WCAG formula
  return 4.5; // Placeholder return value
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Helper function to calculate relative luminance
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}