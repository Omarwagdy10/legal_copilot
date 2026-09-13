import re

from sentence_transformers import SentenceTransformer


MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

_embedding_model = None


def get_embedding_model():
    global _embedding_model

    if _embedding_model is None:
        _embedding_model = SentenceTransformer(MODEL_NAME)

    return _embedding_model


def language_of(text):
    arabic_chars = re.findall(r"[\u0600-\u06FF]", text)

    if arabic_chars:
        return "ar"

    return "en"


def expand_cross_lingual_query(query):
    """
    Add Arabic legal terms to common English queries.

    This helps keyword retrieval when:
    - the user asks in English
    - the document is written in Arabic
    """

    query_lower = query.lower()

    expansions = {
        "leave": "الإجازات الإجازة السنوية المرضية الرسمية",
        "vacation": "الإجازات الإجازة السنوية",
        "sick leave": "الإجازات المرضية",
        "annual leave": "الإجازات السنوية",
        "official leave": "الإجازات الرسمية",

        "salary": "الراتب الأجر",
        "pay": "الراتب الأجر",

        "probation": "فترة الاختبار",
        "trial period": "فترة الاختبار",

        "termination": "إنهاء العقد إنهاء",
        "terminate": "إنهاء العقد إنهاء",

        "notice": "الإخطار إشعار",
        "notice period": "مدة الإخطار فترة الإخطار",

        "confidentiality": "السرية حماية المعلومات",
        "confidential information": "المعلومات السرية حماية المعلومات",

        "intellectual property": "الملكية الفكرية",

        "working hours": "ساعات العمل",
        "work hours": "ساعات العمل",

        "workplace": "مكان العمل مقر العمل",
        "work location": "مكان العمل مقر العمل",

        "remote work": "العمل عن بعد العمل عن بُعد",

        "employee": "الموظف الطرف الثاني",
        "employer": "صاحب العمل الطرف الأول",

        "contract": "العقد",
        "agreement": "العقد الاتفاق",

        "dispute": "النزاع النزاعات",
        "disputes": "النزاع النزاعات",

        "benefits": "المزايا الحوافز المكافآت",
        "bonus": "الحوافز المكافآت",
        "bonuses": "الحوافز المكافآت",
    }

    arabic_terms = []

    for english_term, arabic_terms_text in expansions.items():

        if english_term in query_lower:
            arabic_terms.append(arabic_terms_text)

    if arabic_terms:
        return f"{query} {' '.join(arabic_terms)}"

    return query


def keyword_score(query, text):
    query_words = set(
        re.findall(r"\w+", query.lower())
    )

    text_words = set(
        re.findall(r"\w+", text.lower())
    )

    if not query_words:
        return 0.0

    matches = query_words.intersection(text_words)

    # Basic keyword score
    base_score = len(matches) / len(query_words)

    # Important legal terms get additional weight
    important_terms = {
        "الإجازات",
        "الإجازة",
        "السنوية",
        "المرضية",
        "الرسمية",
        "الموظف",
        "الراتب",
        "العقد",
        "إنهاء",
        "السرية",
        "الملكية",
        "الفكرية",
    }

    important_matches = matches.intersection(
        important_terms
    )

    bonus = 0.05 * len(important_matches)

    return min(
        base_score + bonus,
        1.0
    )


def hybrid_search(
    collection,
    query,
    top_k=5,
    language=None
):
    # Keep the original user question
    original_query = query

    # Add Arabic terms for keyword retrieval
    expanded_query = expand_cross_lingual_query(query)

    model = get_embedding_model()

    # ---------------------------------------
    # 1. Dense Search
    # ---------------------------------------
    # IMPORTANT:
    # Use the original question for the embedding model.
    # This preserves the multilingual semantic meaning.
    query_embedding = model.encode(original_query)

    # ---------------------------------------
    # Optional metadata filter
    # ---------------------------------------

    where = None

    if language in {"ar", "en"}:
        where = {
            "language": language
        }

    # ---------------------------------------
    # 2. Dense Search from ChromaDB
    # ---------------------------------------

    dense_results = collection.query(
        query_embeddings=[
            query_embedding.tolist()
        ],
        n_results=top_k,
        where=where
    )

    dense_documents = dense_results["documents"][0]
    dense_ids = dense_results["ids"][0]
    dense_distances = dense_results["distances"][0]
    dense_metadata = dense_results["metadatas"][0]

    # ---------------------------------------
    # 3. Keyword Search
    # ---------------------------------------

    all_data = collection.get(
        where=where
    )

    all_documents = all_data.get(
        "documents",
        []
    )

    all_ids = all_data.get(
        "ids",
        []
    )

    all_metadata = all_data.get(
        "metadatas",
        []
    )

    # ---------------------------------------
    # 4. Combine Dense + Keyword Results
    # ---------------------------------------

    results = {}

    # Add dense search results
    for i, doc_id in enumerate(dense_ids):

        distance = dense_distances[i]

        dense_score = 1 / (1 + distance)

        results[doc_id] = {
            "id": doc_id,
            "text": dense_documents[i],
            "metadata": dense_metadata[i],
            "dense_score": dense_score,
            "keyword_score": 0.0
        }

    # Add keyword scores
    for i, doc_id in enumerate(all_ids):

        text = all_documents[i]

        # Use expanded query for keyword matching.
        # This helps English -> Arabic retrieval.
        score = keyword_score(
            expanded_query,
            text
        )

        if doc_id not in results:

            results[doc_id] = {
                "id": doc_id,
                "text": text,
                "metadata": all_metadata[i],
                "dense_score": 0.0,
                "keyword_score": score
            }

        else:

            results[doc_id]["keyword_score"] = score

    # ---------------------------------------
    # 5. Fusion
    # ---------------------------------------

    for item in results.values():

        # Cross-lingual retrieval:
        # give equal importance to semantic
        # and keyword evidence.
        item["fusion_score"] = (
            0.5 * item["dense_score"]
            +
            0.5 * item["keyword_score"]
        )

    # ---------------------------------------
    # 6. Sort
    # ---------------------------------------

    sorted_results = sorted(
        results.values(),
        key=lambda x: x["fusion_score"],
        reverse=True
    )

    # ---------------------------------------
    # 7. Return Final Results
    # ---------------------------------------

    return [
        {
            "chunk_id": item["id"],

            "filename": item["metadata"].get(
                "filename",
                ""
            ),

            "chunk_index": item["metadata"].get(
                "chunk_index",
                0
            ),

            "section": item["metadata"].get(
                "section",
                ""
            ),

            "language": item["metadata"].get(
                "language",
                language_of(item["text"])
            ),

            "text": item["text"],

            "dense_score": round(
                item["dense_score"],
                4
            ),

            "keyword_score": round(
                item["keyword_score"],
                4
            ),

            "fusion_score": round(
                item["fusion_score"],
                4
            )
        }
        for item in sorted_results[:top_k]
    ]