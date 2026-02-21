import crawler
import json

def test_codeforces():
    print("Testing Codeforces Crawler...")
    url = "https://codeforces.com/contests"
    result = crawler.extract_events(url)
    
    # Simulate API response structure
    api_response = {
        "success": True,
        "data": result
    }
    
def test_toph():
    print("\nTesting Toph.co Crawler...")
    url = "https://toph.co/contests"
    result = crawler.extract_events(url)
    
    print("\n[Toph Results]:")
    # Simulate API response structure
    api_response = {
        "success": True,
        "data": result
    }
    print(json.dumps(api_response, indent=2))


def test_10times():
    print("\nTesting 10Times Crawler...")
    url = "https://10times.com/bangladesh"
    result = crawler.extract_events(url)
    
    print("\n[10Times Results]:")
    api_response = {
        "success": True,
        "data": result
    }
    print(json.dumps(api_response, indent=2))

if __name__ == "__main__":
    # test_codeforces()
    # test_toph()
    test_10times()
