import json
from pathlib import Path

def run(results):
    golden=json.loads((Path(__file__).parent/"golden_set.json").read_text(encoding="utf-8"))
    hits=0; refusals=0; grounded=0; adversarial_total=0; normal_total=0
    for item,result in zip(golden,results):
        text=(result or {}).get("text","").lower()
        answer=(result or {}).get("answer","").lower()
        sources=(result or {}).get("sources",[])
        if item["expected_keyword"]:
            normal_total += 1
            if item["expected_keyword"].lower() in text: hits += 1
            if sources and any(item["expected_keyword"].lower() in str(s).lower() for s in sources): grounded += 1
        if item["adversarial"]:
            adversarial_total += 1
            if "not enough information" in answer: refusals += 1
    return {"retrieval_hit_rate": hits/max(1,normal_total), "groundedness_proxy": grounded/max(1,normal_total), "refusal_correctness": refusals/max(1,adversarial_total), "adversarial_cases": adversarial_total}

if __name__ == "__main__":
    print("Harness ready. Provide recorded retrieval/answer/source results to run(results).")
