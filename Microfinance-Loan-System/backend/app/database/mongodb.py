from pymongo import MongoClient

MONGO_URL = "mongodb://localhost:27017"

client = MongoClient(MONGO_URL)

db = client["microfinance_system"]

users_collection = db["users"]

borrowers_collection = db["borrowers"]

lenders_collection = db["lenders"]

revenues_collection = db["revenues"]

borrower_lender_map_collection = db["borrower_lender_map"]

repayments_collection = db["repayments"]

print("MongoDB Connected Successfully")
