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
    return "ar" if arabic_chars else "en"


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

    return len(matches) / len(query_words)


def hybrid_search(collection, query, top_k=5, language=None):

    model = get_embedding_model()
    query_embedding = model.encode(query)

    # -----------------------------
    # Optional metadata filter
    # -----------------------------

    where = None

    if language in {"ar", "en"}:
        where = {
            "language": language
        }

    # -----------------------------
    # 1. Dense Search
    # -----------------------------

    dense_results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=top_k,
        where=where
    )

    dense_documents = dense_results["documents"][0]
    dense_ids = dense_results["ids"][0]
    dense_distances = dense_results["distances"][0]
    dense_metadata = dense_results["metadatas"][0]

    # -----------------------------
    # 2. Keyword Search
    # -----------------------------

    all_data = collection.get(
        where=where
    )

    all_documents = all_data.get("documents", [])
    all_ids = all_data.get("ids", [])
    all_metadata = all_data.get("metadatas", [])

    # -----------------------------
    # 3. Combine scores
    # -----------------------------

    results = {}

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

    for i, doc_id in enumerate(all_ids):

        text = all_documents[i]

        score = keyword_score(
            query,
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

    # -----------------------------
    # 4. Fusion
    # -----------------------------

    for item in results.values():

        item["fusion_score"] = (
            0.7 * item["dense_score"]
            +
            0.3 * item["keyword_score"]
        )

    # -----------------------------
    # 5. Sort
    # -----------------------------

    sorted_results = sorted(
        results.values(),
        key=lambda x: x["fusion_score"],
        reverse=True
    )

    # -----------------------------
    # 6. Final results
    # -----------------------------

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