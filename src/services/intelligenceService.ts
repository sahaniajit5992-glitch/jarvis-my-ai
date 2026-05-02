
/**
 * Intelligence Service for Kyros
 * Handles advanced information retrieval and AI enhancement
 */

export async function fetchWikipediaSummary(topic: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/intelligence/wikipedia/${encodeURIComponent(topic)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.extract || null;
  } catch (error) {
    console.error("Wikipedia fetch failed", error);
    return null;
  }
}

export async function fetchStockQuote(symbol: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/intelligence/stock/${symbol.toUpperCase()}`);
    if (!response.ok) return null;
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    
    const price = result.meta?.regularMarketPrice;
    const change = result.meta?.regularMarketChangePercent;
    
    if (typeof price !== 'number' || typeof change !== 'number') {
      return `${symbol.toUpperCase()}: Data signature incomplete, sir.`;
    }

    return `${symbol.toUpperCase()}: $${price.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%)`;
  } catch (error) {
    console.error("Stock fetch failed", error);
    return null;
  }
}

export async function fetchNewsBrief(topic: string): Promise<string | null> {
  try {
    // Using DuckDuckGo's API for basic news/summaries (free, no key)
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(topic + " news")}&format=json&no_html=1`);
    const data = await response.json();
    
    if (data.AbstractText) return data.AbstractText;
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      return data.RelatedTopics.slice(0, 3).map((t: any) => t.Text).join(" | ");
    }
    return null;
  } catch (error) {
    console.error("News fetch failed", error);
    return null;
  }
}

export function getPollinationsUrl(prompt: string): string {
  // Free image generation via Pollinations.ai
  const enhancedPrompt = `${prompt}, highly detailed, cinematic lighting, professional digital art, 8k resolution`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&model=flux`;
}
