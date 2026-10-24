import { BRAND_NAME } from '@/lib/brand';
import { metadata } from '@/app/layout';

describe('brand', () => {
  it('exports the brand name', () => {
    expect(BRAND_NAME).toBe('Draftboard');
  });

  it('is used in the page title', () => {
    expect(String(metadata.title)).toContain(BRAND_NAME);
  });
});
