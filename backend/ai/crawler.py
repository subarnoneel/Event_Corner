import requests
from curl_cffi import requests as cffi_requests
from bs4 import BeautifulSoup
from datetime import datetime
import logging
import ollama
import json
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_page(url: str) -> str:
    """
    Fetches the HTML content of a given URL.
    """
    try:
        # Improved headers not strictly needed with impersonate, but good practice
        session = cffi_requests.Session()
        response = session.get(url, impersonate="chrome", timeout=20)
        response.raise_for_status()
        return response.text
    except Exception as e:
        logger.error(f"Error fetching {url}: {e}")
        return None

def parse_codeforces_api():
    """
    Fetches contests from Codeforces API.
    """
    api_url = "https://codeforces.com/api/contest.list?gym=false"
    try:
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data['status'] != 'OK':
            logger.error(f"Codeforces API error: {data.get('comment')}")
            return []
            
        events = []
        for contest in data['result']:
            # only upcoming contests (BEFORE) or recently started (CODING)
            if contest['phase'] == 'BEFORE': 
                start_ts = contest.get('startTimeSeconds')
                duration_sec = contest.get('durationSeconds')
                
                # Convert timestamp to human readable string (or ISO)
                start_dt = datetime.fromtimestamp(start_ts) if start_ts else datetime.now()
                # Format: 2025-01-24 17:35:00
                start_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')
                
                # Duration in human readable format
                duration_hours = duration_sec // 3600
                duration_mins = (duration_sec % 3600) // 60
                duration_str = f"{duration_hours}h {duration_mins}m"
                
                events.append({
                    "title": contest['name'],
                    "start_time": start_str,
                    "duration": duration_str,
                    "platform": "Codeforces",
                    "description": f"Codeforces Round: {contest['name']}. Type: {contest.get('type')}",
                    "url": "https://codeforces.com/contests/" + str(contest['id'])
                })
        
        # Sort by start time (soonest first)
        events.sort(key=lambda x: x['start_time'])
        return events
        
    except Exception as e:
        logger.error(f"Error fetching Codeforces API: {e}")
        return []

def parse_toph_api():
    """
    Fetches contests from Toph.co API (unofficial/public JSON).
    """
    api_url = "https://toph.co/contests.json"
    try:
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Toph JSON structure is usually a list of contest objects
        # or dict with 'contests' key. Let's handle list based on docs/observation.
        # Structure: [{"name": "...", "timestamp": ..., "duration": ..., "url": "..."}]
        
        events = []
        now_ts = datetime.now().timestamp()
        
        # If it returns a dict with 'contests' (common pattern), use that
        contest_list = data.get('contests', []) if isinstance(data, dict) else data
        
        if not contest_list:
             logger.warning("No contests found/parsed from Toph API.")
        
        for contest in contest_list:
            # Check for necessary fields (Toph API uses 'title', 'startsAt')
            if 'title' not in contest or 'startsAt' not in contest:
                continue
            
            # Parse start time
            # Format often: "2025-02-14T09:00:00Z" or similar
            start_str_raw = contest['startsAt']
            try:
                # Use dateutil for robust parsing if available, else standard fromisoformat
                # We added python-dateutil to requirements but didn't import it.
                # Let's try standard ISO first, replacing Z with +00:00
                start_dt = datetime.fromisoformat(start_str_raw.replace('Z', '+00:00'))
            except:
                continue

            # Check if event is too old (older than 24h)
            if start_dt.timestamp() < now_ts - 86400:
                continue
                
            start_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')
            
            # Duration handling
            # Toph often provides human readable duration string or seconds
            # Field might be 'duration' (string like "3h") or missing
            duration_str = contest.get('duration', 'N/A')
            
            # Construct URL if relative
            # Toph API usually provides 'url' or 'slug'
            link = contest.get('url', '')
            if not link and 'slug' in contest:
                 link = f"/c/{contest['slug']}"
                 
            if link and not link.startswith('http'):
                link = "https://toph.co" + link
                
            events.append({
                "title": contest['title'],
                "start_time": start_str,
                "duration": duration_str,
                "platform": "Toph.co",
                "description": f"Toph Contest: {contest['title']}.",
                "url": link
            })
            
        events.sort(key=lambda x: x['start_time'])
        return events

    except Exception as e:
        logger.error(f"Error fetching Toph API: {e}")
        return []

def parse_with_llm(html_content: str, url: str):
    """
    Uses Ollama (llama3.2) to extract events from raw HTML/Text.
    """
    try:
        # 1. Clean up HTML to reduce token usage (remove scripts, styles)
        soup = BeautifulSoup(html_content, 'lxml')
        for script in soup(["script", "style", "svg", "head", "footer", "nav"]):
            script.extract()
        
        # Get text content with some structure
        text_content = soup.get_text(separator=' | ', strip=True)[:6000] # Limit context size
        
        prompt = f"""
        Extract detailed event information from the following website content from: {url}
        
        Return a JSON object with a key "events" containing a list of events.
        Each event object MUST have:
        - title: string
        - start_time: string (YYYY-MM-DD HH:MM:SS format, assume future dates if year missing)
        - duration: string (e.g., "2 hours", "3 days") or "N/A"
        - platform: string (the website name or venue)
        - description: string (short summary)
        - url: string (link to event, fully qualified URL)

        Website Content:
        {text_content}
        
        Return ONLY valid JSON. If no events found, return {{"events": []}}.
        """
        
        response = ollama.chat(model='llama3.2', messages=[
            {'role': 'system', 'content': 'You are a helpful data extraction assistant that outputs ONLY valid JSON.'},
            {'role': 'user', 'content': prompt},
        ], format='json')
        
        content = response['message']['content']
        data = json.loads(content)
        return data.get('events', [])
        
    except Exception as e:
        logger.error(f"LLM Parsing failed: {e}")
        return []

def extract_events(url: str):
    """
    Main entry point to crawl and extract events from a URL.
    """
    # Special handling for Codeforces using API
    if "codeforces.com" in url:
        return {"events": parse_codeforces_api()}
        
    # Special handling for Toph.co
    if "toph.co" in url:
        return {"events": parse_toph_api()}
    
    html = fetch_page(url)
    if not html:
        return {"error": "Failed to fetch page"}
    
    # Generic LLM Crawler
    logger.info(f"Using generic LLM crawler for {url}")
    events = parse_with_llm(html, url)
    
    if not events:
        # Fallback metadata if LLM fails
        soup = BeautifulSoup(html, 'lxml')
        title = soup.title.text.strip() if soup.title else "No Title"
        return {
            "warning": "No events found by LLM. Returning page metadata.",
            "title": title,
            "content_snippet": soup.text[:500].strip(),
            "events": []
        }
        
    return {"events": events}
