import sys
import os

# Mocking the detect_intent function from ai_server for isolated testing
def detect_intent(message: str, user_role: str = "participant") -> str:
    """Detect user intent from query, restricted by role"""
    message_lower = message.lower()
    
    event_keywords = ["find event", "search event", "event near", "what events", "upcoming events", "show events", "browse"]
    creation_keywords = ["create event", "add event", "host event", "organize event", "new event", "setup event"]
    account_keywords = ["profile", "account", "password", "email", "registration", "logout", "login"]
    admin_keywords = ["manage", "verify", "approve", "reject", "role", "permission", "user", "institution"]
    
    # Check for admin intent (only for admins/super_admins)
    if user_role in ["admin", "super_admin"]:
        for keyword in admin_keywords:
            if keyword in message_lower:
                return "admin"
    
    for keyword in event_keywords:
        if keyword in message_lower:
            return "event_search"
    
    for keyword in creation_keywords:
        if keyword in message_lower:
            return "event_creation"
    
    for keyword in account_keywords:
        if keyword in message_lower:
            return "account"
    
    return "general"

def test_intents():
    test_cases = [
        ("How to manage institutions?", "institution", "general"), # Should NOT be admin for institution
        ("How to manage institutions?", "admin", "admin"),       # Should be admin for admin
        ("How to verify user?", "super_admin", "admin"),        # Should be admin for super_admin
        ("How to verify user?", "participant", "general"),     # Should NOT be admin for participant
        ("Find me a concert", "participant", "event_search"),
        ("Create a meeting", "organizer", "event_creation"),
        ("Change my password", "institution", "account"),
    ]
    
    passed = 0
    for msg, role, expected in test_cases:
        actual = detect_intent(msg, role)
        if actual == expected:
            print(f"✅ PASS: Message='{msg}', Role='{role}' -> Intent='{actual}'")
            passed += 1
        else:
            print(f"❌ FAIL: Message='{msg}', Role='{role}' -> Expected='{expected}', Actual='{actual}'")
    
    print(f"\nSummary: {passed}/{len(test_cases)} tests passed.")

if __name__ == "__main__":
    test_intents()
