import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from bs4 import BeautifulSoup
from requests.packages.urllib3.exceptions import InsecureRequestWarning

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

def crawlUrls(
    sourceUrls,
    maxWorkers=5,
    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    timeout=10,
    verify_ssl=True,
):
    def fetchAndCleanUrl(url):
        headers = {"User-Agent": user_agent}
        response = requests.get(url, headers=headers, timeout=timeout, verify=verify_ssl)
        response.raise_for_status()
        response.encoding = response.apparent_encoding or "utf-8"
        soup = BeautifulSoup(response.content, "html.parser")
        for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
            element.decompose()
        mainContent = soup.find("main") or soup.find("article")
        if mainContent:
            text = mainContent.get_text(separator=" ", strip=True)
        else:
            paragraphs = soup.find_all("p")
            text = " ".join(p.get_text(strip=True) for p in paragraphs) if paragraphs else ""
        return re.sub(r"\s+", " ", text).strip()

    fetchedContents = []
    with ThreadPoolExecutor(max_workers=maxWorkers) as executor:
        futures = [executor.submit(fetchAndCleanUrl, url) for url in sourceUrls]
        for future in as_completed(futures):
            try:
                content = future.result()
                if content:
                    fetchedContents.append(content)
            except Exception:
                pass # Ignore failed crawls
    return fetchedContents

if __name__ == "__main__":
    urls = ["https://example.com"]
    page_contents = crawlUrls(urls)
    for i, content in enumerate(page_contents, 1):
        print(i, content)
