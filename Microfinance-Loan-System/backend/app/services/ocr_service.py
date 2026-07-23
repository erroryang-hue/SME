import pdfplumber
import re
import os


UPLOAD_FOLDER = "uploads"


def extract_expenses_from_pdf(filename):

    file_path = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    extracted_text = ""

    # READ PDF

    with pdfplumber.open(file_path) as pdf:

        for page in pdf.pages:

            text = page.extract_text()

            if text:

                extracted_text += text + "\n"

    # FIND NUMBERS

    amounts = re.findall(
        r'\b\d+\b',
        extracted_text
    )

    expense_transactions = []

    total_expense = 0

    for amount in amounts:

        value = int(amount)

        # FILTER SMALL RANDOM VALUES

        if value > 1000 and value < 1000000:

            expense_transactions.append(value)

            total_expense += value

    return {

        "total_expense":
        total_expense,

        "expense_transactions":
        expense_transactions[:20]
    }
    