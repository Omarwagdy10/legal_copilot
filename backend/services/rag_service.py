import re

from sentence_transformers import SentenceTransformer

from services.contract_expansions import CONTRACT_EXPANSIONS
from services.contract_synonyms import SYNONYM_GROUPS
from services.contract_terms import CONTRACT_Terms


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


# ---------------------------------------------------------
# Normalize Arabic text
# ---------------------------------------------------------

def normalize_arabic(text):
    text = text.lower()

    # Remove Arabic diacritics
    text = re.sub(r"[\u064B-\u065F]", "", text)

    # Normalize Arabic letters
    text = text.replace("أ", "ا")
    text = text.replace("إ", "ا")
    text = text.replace("آ", "ا")
    text = text.replace("ى", "ي")

    return text


# ---------------------------------------------------------
# Query Expansion
# ---------------------------------------------------------

def expand_cross_lingual_query(query):
    """
    Expand common Arabic and English legal terms
    to improve keyword retrieval.

    Examples:

    English:
        salary
        leave
        termination

    Arabic:
        الراتب
        الإجازات
        انهاء العقد
    """

    query_lower = normalize_arabic(query)

    expansions = CONTRACT_EXPANSIONS

    expanded_terms = []

    # Longer phrases first
    sorted_expansions = sorted(
        expansions.items(),
        key=lambda item: len(item[0]),
        reverse=True
    )

    for term, expansion in sorted_expansions:

        if term in query_lower:
            expanded_terms.append(expansion)

    if expanded_terms:

        return (
            f"{query} "
            + " ".join(expanded_terms)
        )

    return query


# ---------------------------------------------------------
# Keyword Score
# ---------------------------------------------------------

def keyword_score(query, text):
    query = normalize_arabic(query)
    text = normalize_arabic(text)

    query_words = set(
        re.findall(r"\w+", query)
    )

    text_words = set(
        re.findall(r"\w+", text)
    )

    if not query_words:
        return 0.0

    # Arabic legal synonym groups
    synonym_groups = SYNONYM_GROUPS

    # Direct word matches
    direct_matches = query_words.intersection(
        text_words
    )

    score = len(direct_matches)

    # Check synonym groups
    for group in synonym_groups:

        query_has_group = bool(
            query_words.intersection(group)
        )

        text_has_group = bool(
            text_words.intersection(group)
        )

        if query_has_group and text_has_group:
            score += 2

    # Normalize score
    denominator = max(
        len(query_words) * 2,
        1
    )

    return min(
        score / denominator,
        1.0
    )

# ---------------------------------------------------------
# Hybrid Search
# ---------------------------------------------------------

def hybrid_search(
    collection,
    query,
    top_k=5,
    language=None,
    filename=None
):

    # Original question
    original_query = query

    # Expanded query for keyword search
    expanded_query = (
        expand_cross_lingual_query(
            query
        )
    )

    model = get_embedding_model()

    # ==========================================
    # 1. Dense Search
    # ==========================================

    # IMPORTANT:
    # Use original query for embeddings.
    query_embedding = model.encode(
        original_query
    )

    # ==========================================
    # Optional Language Filter
    # ==========================================

    # Optional metadata filters
    filters = []

    if language in {"ar", "en"}:
        filters.append({"language": language})

    if filename:
        filters.append({"filename": filename})

    if len(filters) == 1:
        where = filters[0]
    elif len(filters) > 1:
        where = {"$and": filters}
    else:
        where = None

    # ==========================================
    # 2. Dense Search
    # ==========================================

    dense_results = collection.query(
        query_embeddings=[
            query_embedding.tolist()
        ],
        n_results=top_k,
        where=where
    )

    dense_documents = (
        dense_results["documents"][0]
    )

    dense_ids = (
        dense_results["ids"][0]
    )

    dense_distances = (
        dense_results["distances"][0]
    )

    dense_metadata = (
        dense_results["metadatas"][0]
    )

    # ==========================================
    # 3. Get All Documents For Keyword Search
    # ==========================================

    all_data = collection.get(
        where=where
    )

    all_documents = (
        all_data.get(
            "documents",
            []
        )
    )

    all_ids = (
        all_data.get(
            "ids",
            []
        )
    )

    all_metadata = (
        all_data.get(
            "metadatas",
            []
        )
    )

    # ==========================================
    # 4. Combine Results
    # ==========================================

    results = {}

    # ------------------------------------------
    # Dense results
    # ------------------------------------------

    for i, doc_id in enumerate(
        dense_ids
    ):

        distance = (
            dense_distances[i]
        )

        dense_score = (
            1
            /
            (1 + distance)
        )

        results[doc_id] = {
            "id": doc_id,
            "text": dense_documents[i],
            "metadata": dense_metadata[i],
            "dense_score": dense_score,
            "keyword_score": 0.0,
        }

    # ------------------------------------------
    # Keyword results
    # ------------------------------------------

    for i, doc_id in enumerate(
        all_ids
    ):

        text = all_documents[i]

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
                "keyword_score": score,
            }

        else:

            results[
                doc_id
            ][
                "keyword_score"
            ] = score

    # ==========================================
    # 5. Fusion
    # ==========================================

    for item in results.values():

        fusion_score = (
            0.5 * item["dense_score"]
            +
            0.5 * item["keyword_score"]
        )

        # Strong keyword evidence can compensate
        # when semantic similarity is very low.
        if item["keyword_score"] >= 0.25:
            fusion_score = max(
                fusion_score,
                item["keyword_score"]
            )

        # IMPORTANT:
        # This must stay inside the loop so every result
        # receives its own fusion_score.
        item["fusion_score"] = fusion_score

    # ==========================================
    # 6. Sort
    # ==========================================

    sorted_results = sorted(
        results.values(),
        key=lambda x:
            x["fusion_score"],
        reverse=True
    )

    # ==========================================
    # 7. Return Results
    # ==========================================

    return [

        {
            "chunk_id": item["id"],

            "filename":
                item["metadata"].get(
                    "filename",
                    ""
                ),

            "chunk_index":
                item["metadata"].get(
                    "chunk_index",
                    0
                ),

            "section":
                item["metadata"].get(
                    "section",
                    ""
                ),

            "language":
                item["metadata"].get(
                    "language",
                    language_of(
                        item["text"]
                    )
                ),

            "text": item["text"],

            "dense_score":
                round(
                    item["dense_score"],
                    4
                ),

            "keyword_score":
                round(
                    item["keyword_score"],
                    4
                ),

            "fusion_score":
                round(
                    item["fusion_score"],
                    4
                ),
        }

        for item
        in sorted_results[:top_k]
    ]
