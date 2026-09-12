from services.rag_service import keyword_score, dense_score, language_of

def test_keyword_score():
    assert keyword_score('termination notice','Termination notice must be clear') > 0

def test_dense_score_monotonic():
    assert dense_score(0.1) > dense_score(1.0)

def test_arabic_language_detection():
    assert language_of('هذه فقرة عربية') == 'ar'
    assert language_of('This is English') == 'en'
