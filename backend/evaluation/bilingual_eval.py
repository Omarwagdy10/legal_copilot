import sys
from pathlib import Path

# Allow importing backend services
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

import chromadb

from services.rag_service import hybrid_search


# -----------------------------------------
# ChromaDB
# -----------------------------------------

chroma_client = chromadb.PersistentClient(
    path=str(BASE_DIR / "chroma_db")
)

collection = chroma_client.get_or_create_collection(
    name="legal_documents"
)


# -----------------------------------------
# Test cases
# -----------------------------------------

TEST_CASES = [

    # Arabic retrieval
    {
        "language": "ar",
        "query": "ما هي مدة العقد؟",
        "expected_keywords": [
            "العقد",
            "مدة"
        ]
    },

    {
        "language": "ar",
        "query": "ما هي شروط إنهاء العقد؟",
        "expected_keywords": [
            "إنهاء",
            "العقد"
        ]
    },

    # English retrieval
    {
        "language": "en",
        "query": "What is the contract duration?",
        "expected_keywords": [
            "contract",
            "duration"
        ]
    },

    {
        "language": "en",
        "query": "What are the termination conditions?",
        "expected_keywords": [
            "termination",
            "contract"
        ]
    },

    # Cross-lingual:
    # Arabic question against English content
    {
        "language": "cross",
        "query": "ما هي شروط إنهاء العقد؟",
        "expected_keywords": [
            "termination",
            "contract"
        ]
    },
]


def contains_expected_content(results, keywords):
    """
    Check whether retrieved chunks contain
    the expected keywords.
    """

    text = " ".join(
        result["text"].lower()
        for result in results
    )

    matches = 0

    for keyword in keywords:
        if keyword.lower() in text:
            matches += 1

    return matches >= len(keywords) / 2


def run_evaluation():

    arabic_total = 0
    arabic_hits = 0

    english_total = 0
    english_hits = 0

    cross_total = 0
    cross_hits = 0

    print("\n=== Bilingual Retrieval Evaluation ===\n")

    for case in TEST_CASES:

        results = hybrid_search(
            collection,
            case["query"],
            top_k=5
        )

        hit = contains_expected_content(
            results,
            case["expected_keywords"]
        )

        status = "PASS" if hit else "FAIL"

        print(
            f"[{status}] "
            f"{case['language']} | "
            f"{case['query']}"
        )

        if case["language"] == "ar":
            arabic_total += 1

            if hit:
                arabic_hits += 1

        elif case["language"] == "en":
            english_total += 1

            if hit:
                english_hits += 1

        else:
            cross_total += 1

            if hit:
                cross_hits += 1

    print("\n-----------------------------")

    arabic_rate = (
        arabic_hits / arabic_total * 100
        if arabic_total
        else 0
    )

    english_rate = (
        english_hits / english_total * 100
        if english_total
        else 0
    )

    cross_rate = (
        cross_hits / cross_total * 100
        if cross_total
        else 0
    )

    print(
        f"Arabic Hit Rate      : {arabic_rate:.2f}%"
    )

    print(
        f"English Hit Rate     : {english_rate:.2f}%"
    )

    print(
        f"Cross-Lingual Rate   : {cross_rate:.2f}%"
    )

    print("-----------------------------\n")


if __name__ == "__main__":
    run_evaluation()    