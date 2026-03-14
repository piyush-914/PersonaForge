import * as cheerio from 'cheerio';
import { z } from 'zod';

export const visitUrlSchema = z.object({
  url: z.string().url(),
});

export type VisitUrlArgs = z.infer<typeof visitUrlSchema>;

export async function visitUrl(args: VisitUrlArgs) {
  const { url } = args;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, and other non-content tags
    $('script, style, nav, footer, header').remove();

    // Get text content
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    // Limit to 2000 characters to avoid context overflow
    return text.substring(0, 2000) + (text.length > 2000 ? '...' : '');
  } catch (error: any) {
    return `Error visiting URL: ${error.message}`;
  }
}
