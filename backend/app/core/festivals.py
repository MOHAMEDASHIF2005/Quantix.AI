from datetime import datetime, date

FESTIVALS = [
    {
        "name": "Raksha Bandhan",
        "date": "2026-08-28",
        "multipliers": {
            "Beauty": 1.3,
            "Electronics": 1.2,
            "Nutrition": 1.15,
            "General": 1.15
        }
    },
    {
        "name": "Diwali",
        "date": "2026-11-08",
        "multipliers": {
            "Electronics": 1.5,
            "Home & Living": 1.4,
            "Beauty": 1.3,
            "General": 1.2
        }
    },
    {
        "name": "Christmas",
        "date": "2026-12-25",
        "multipliers": {
            "Electronics": 1.4,
            "Home & Living": 1.3,
            "Nutrition": 1.1,
            "General": 1.2
        }
    },
    {
        "name": "Pongal",
        "date": "2027-01-14",
        "multipliers": {
            "General": 1.3,
            "Nutrition": 1.2
        }
    },
    {
        "name": "Ramadan/Eid",
        "date": "2027-03-10",
        "multipliers": {
            "Beauty": 1.4,
            "Electronics": 1.2,
            "General": 1.2
        }
    }
]

def get_upcoming_festivals(start_date: date, end_date: date):
    """Returns list of festivals that fall within the given range."""
    results = []
    for fest in FESTIVALS:
        fest_date = datetime.strptime(fest["date"], "%Y-%m-%d").date()
        if start_date <= fest_date <= end_date:
            results.append(fest)
    return results
