from ddgs import DDGS

def searchWeb(
    query: str,
    max_results: int = None,
    region: str = "en-in",
    safesearch: str = "off",
    timelimit: str = None,
):
    with DDGS(timeout=10) as ddgs:
        sources = list(
            ddgs.text(
                query=query,
                max_results=max_results,
                region=region,
                safesearch=safesearch,
                timelimit=timelimit,
            )
        )
    return sources

if __name__ == "__main__":
    query = "latest space news"
    results = searchWeb(query)
    for i, result in enumerate(results, 1):
        print(i, result)
