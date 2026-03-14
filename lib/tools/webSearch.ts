import { z } from 'zod';
import { search, SafeSearchType } from 'duck-duck-scrape';

export const webSearchSchema = z.object({
  query: z.string(),
});

export type WebSearchArgs = z.infer<typeof webSearchSchema>;

export async function webSearch(args: WebSearchArgs, _apiKeys?: Record<string, string>) {
  const { query } = args;

  try {
    const searchResults = await search(query, {
      safeSearch: SafeSearchType.STRICT,
    });

    const results = searchResults.results.slice(0, 5).map((r: any) => ({
      title: r.title,
      link: r.url,
      snippet: r.description,
    }));

    if (results.length === 0) {
      return "No results found.";
    }

    return results.map((r: any) => `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}\n`).join('\n---\n');
  } catch (error: any) {
    return `Error performing web search: ${error.message}`;
  }
}
