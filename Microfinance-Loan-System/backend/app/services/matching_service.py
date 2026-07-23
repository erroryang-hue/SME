import pandas as pd


# LOAD STATIC LENDER DATASET
lenders_df = pd.read_csv("datasets/lenders_dataset.csv")


# ─────────────────────────────────────────────────────────────────────────────
# GREEDY MATCHING ALGORITHM
#
# Strategy:
#   1. Filter lenders whose max_risk_allowed >= borrower's risk level
#      (risk hierarchy: LOW can only serve LOW; HIGH can serve all)
#   2. Compute a greedy score for each eligible lender:
#        score = w_rate  * (1 - norm_rate)         # lower rate  → higher score
#              + w_funds * norm_funds               # more funds  → higher score
#              + w_risk  * risk_compatibility_bonus # tighter fit → slight bonus
#   3. Sort descending by score (best lender first)
#   4. Greedily allocate: take as much as possible from each lender
#      until the full loan is covered or lenders are exhausted.
# ─────────────────────────────────────────────────────────────────────────────

# Weights for the composite greedy score (must sum to 1.0)
W_RATE  = 0.55   # interest rate is the most important factor
W_FUNDS = 0.30   # lenders with more available capital are preferred
W_RISK  = 0.15   # slight bonus for lenders who accept the exact risk tier

# Risk hierarchy: a lender who accepts "HIGH" risk can fund HIGH/MEDIUM/LOW borrowers
RISK_HIERARCHY = {
    "LOW":    ["LOW"],
    "MEDIUM": ["LOW", "MEDIUM"],
    "HIGH":   ["LOW", "MEDIUM", "HIGH"],
}

# Risk compatibility bonus: a lender accepting a tighter risk range is a better
# specialised fit (avoids over-exposure)
RISK_BONUS = {
    "exact":  1.0,   # lender's max_risk == borrower_risk
    "higher": 0.4,   # lender accepts a wider risk → still fine, smaller bonus
}


def _risk_bonus(lender_max_risk: str, borrower_risk: str) -> float:
    """Return a 0-1 risk compatibility bonus."""
    if lender_max_risk.upper() == borrower_risk.upper():
        return RISK_BONUS["exact"]
    return RISK_BONUS["higher"]


def _compute_greedy_scores(df: pd.DataFrame, borrower_risk: str) -> pd.DataFrame:
    """
    Add a 'greedy_score' column to the dataframe.
    Higher score = better lender to use first.
    """
    df = df.copy()

    rate_min  = df["interest_rate"].min()
    rate_max  = df["interest_rate"].max()
    funds_min = df["available_funds"].min()
    funds_max = df["available_funds"].max()

    rate_range  = rate_max  - rate_min  if rate_max  != rate_min  else 1
    funds_range = funds_max - funds_min if funds_max != funds_min else 1

    # Normalised components (0 → 1)
    df["norm_rate"]  = 1 - (df["interest_rate"] - rate_min)  / rate_range
    df["norm_funds"] = (df["available_funds"] - funds_min) / funds_range
    df["risk_bonus"] = df["max_risk_allowed"].apply(
        lambda r: _risk_bonus(r, borrower_risk)
    )

    df["greedy_score"] = (
        W_RATE  * df["norm_rate"]
        + W_FUNDS * df["norm_funds"]
        + W_RISK  * df["risk_bonus"]
    )

    return df


def match_lenders(loan_needed: float, borrower_risk: str) -> dict:
    """
    Greedy lender matching.

    Parameters
    ----------
    loan_needed    : total loan amount the borrower requires (₹)
    borrower_risk  : borrower's risk level – "LOW", "MEDIUM", or "HIGH"

    Returns
    -------
    dict with keys:
        loan_needed          – original loan amount
        remaining_unallocated – amount still unmatched after greedy pass
        matched_lenders       – list of {lender_name, allocated_amount,
                                          interest_rate, greedy_score,
                                          coverage_pct}
        algorithm            – description string
    """
    from app.database.mongodb import lenders_collection

    borrower_risk = borrower_risk.upper()

    # ── 1. Load live lenders from MongoDB ────────────────────────────────────
    registered_lenders = list(lenders_collection.find())
    db_lenders_list = []
    for rl in registered_lenders:
        db_lenders_list.append({
            "lender_name":     rl.get("lender_name"),
            "available_funds": float(rl.get("available_fund", 0)),
            "max_risk_allowed": rl.get("maximum_risk", "LOW").upper(),
            "interest_rate":   float(rl.get("interest_rate", 0)),
        })

    if db_lenders_list:
        db_df      = pd.DataFrame(db_lenders_list)
        combined_df = pd.concat([lenders_df, db_df], ignore_index=True)
    else:
        combined_df = lenders_df.copy()

    # Normalise column types
    combined_df["available_funds"] = combined_df["available_funds"].astype(float)
    combined_df["interest_rate"]   = combined_df["interest_rate"].astype(float)
    combined_df["max_risk_allowed"] = combined_df["max_risk_allowed"].str.upper()

    # ── 2. Filter eligible lenders ────────────────────────────────────────────
    # A lender is eligible if their accepted risk tiers include borrower_risk.
    eligible_df = combined_df[
        combined_df["max_risk_allowed"].apply(
            lambda r: borrower_risk in RISK_HIERARCHY.get(r, [])
        )
    ].copy()

    if eligible_df.empty:
        return {
            "loan_needed": loan_needed,
            "remaining_unallocated": int(loan_needed),
            "matched_lenders": [],
            "algorithm": "Greedy (multi-criteria) – no eligible lenders found",
        }

    # ── 3. Score & sort (best first) ─────────────────────────────────────────
    scored_df = _compute_greedy_scores(eligible_df, borrower_risk)
    scored_df = scored_df.sort_values("greedy_score", ascending=False).reset_index(drop=True)

    # ── 4. Greedy allocation ──────────────────────────────────────────────────
    matched_lenders  = []
    remaining_amount = float(loan_needed)

    for _, lender in scored_df.iterrows():
        if remaining_amount <= 0:
            break

        available = float(lender["available_funds"])
        if available <= 0:
            continue

        allocated = min(available, remaining_amount)
        coverage_pct = round((allocated / loan_needed) * 100, 1)

        matched_lenders.append({
            "lender_name":      lender["lender_name"],
            "allocated_amount": int(allocated),
            "interest_rate":    float(lender["interest_rate"]),
            "greedy_score":     round(float(lender["greedy_score"]), 4),
            "coverage_pct":     coverage_pct,
        })

        remaining_amount -= allocated

    return {
        "loan_needed":           int(loan_needed),
        "remaining_unallocated": max(0, int(remaining_amount)),
        "matched_lenders":       matched_lenders,
        "algorithm":             "Greedy (interest-rate + fund-coverage + risk-fit weighted scoring)",
    }