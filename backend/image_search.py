import sys
from duckduckgo_search import DDGS
import json
import warnings
warnings.filterwarnings('ignore')

def fetch_images(query, num_results=5):
    try:
        results = DDGS().images(
            keywords=query + " -sketch -drawing -vector -icon -transparent",
            region="wt-wt",
            safesearch="off",
            size="Medium",
            layout="Square",
            max_results=num_results,
        )
        return results
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return []

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = sys.argv[1]
        res = fetch_images(query)
        print(json.dumps(res, indent=2))
