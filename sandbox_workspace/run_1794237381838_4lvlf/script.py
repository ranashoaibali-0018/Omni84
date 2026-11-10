# Autonomous B2B Lead Qualifier
import json

def qualify_lead(company_name, industry, revenue_est, headcount):
    """Calculates lead fit score between 0 and 100"""
    score = 50
    if industry.lower() in ['saas', 'fintech', 'ai', 'healthtech']:
        score += 25
    if headcount > 50:
        score += 15
    if revenue_est > 1_000_000:
        score += 10
    
    tier = "Tier 1 (High Priority)" if score >= 80 else "Tier 2 (Standard)" if score >= 60 else "Tier 3"
    return {"company": company_name, "score": score, "tier": tier}

# Example execution
prospects = [
    qualify_lead("CloudScale AI", "AI", 5000000, 120),
    qualify_lead("Local Bakery", "Retail", 200000, 8),
    qualify_lead("FinEdge Systems", "FinTech", 12000000, 250)
]
print(json.dumps(prospects, indent=2))
