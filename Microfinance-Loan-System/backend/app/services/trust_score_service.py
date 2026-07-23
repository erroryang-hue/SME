def calculate_trust_score(
    risk_level,
    defaults,
    msme_registered,
    predicted_revenue,
    monthly_expense
):

    score = 100

    # Risk level penalty
    if risk_level == "HIGH":
        score -= 40
    elif risk_level == "MEDIUM":
        score -= 20

    # Previous defaults penalty
    if defaults:
        score -= 25

    # MSME bonus
    if msme_registered:
        score += 10

    # Expense ratio penalty
    if predicted_revenue > 0:
        expense_ratio = monthly_expense / predicted_revenue

        if expense_ratio > 0.80:
            score -= 20
        elif expense_ratio > 0.60:
            score -= 10

    score = max(0, min(100, score))

    if score >= 80:
        trust_level = "EXCELLENT"
    elif score >= 60:
        trust_level = "GOOD"
    elif score >= 40:
        trust_level = "MODERATE"
    else:
        trust_level = "POOR"

    return {
        "score": score,
        "trust_score": score,
        "trust_level": trust_level
    }
    