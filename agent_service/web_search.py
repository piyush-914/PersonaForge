import warnings
warnings.filterwarnings("ignore", category=ResourceWarning)

from strands import tool
from ddgs import DDGS
from ddgs.exceptions import DDGSException, RatelimitException, TimeoutException

@tool
def websearch(
    keywords: str,
    region: str = "us-en",
    max_results: int | None = 5
) -> str:
    """Search the web and return summarized results with sources."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(keywords, region=region, max_results=max_results))

            if not results:
                return "No relevant web results found."

            formatted = []
            for r in results:
                formatted.append(
                    f"- {r.get('title')}\n"
                    f"  {r.get('body')}\n"
                    f"  Source: {r.get('href')}"
                )

            return "\n\n".join(formatted)

    except RatelimitException:
        return "Rate limit reached. Please try again later."
    except TimeoutException:
        return "Web search timed out."
    except Exception as e:
        return f"DDGS error: {e}"
