import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError

from agents.tools import (
    extract_clauses_tool,
    assess_risks_tool,
    draft_memo_tool,
)


class ClauseExtractorAgent:
    name = "Clause Extractor"

    def run(self, text):
        return extract_clauses_tool(text)


class RiskAssessorAgent:
    name = "Risk Assessor"

    def run(self, clauses):
        return assess_risks_tool(clauses)


class MemoDrafterAgent:
    name = "Memo Drafter"

    def run(self, risks):
        return draft_memo_tool(risks)


class LegalReviewOrchestrator:

    # Pipeline Pattern
    pattern = "pipeline"

    # Maximum attempts for each agent
    max_attempts = 3

    # Maximum time allowed for one attempt
    timeout_seconds = 60

    agents = [
        ClauseExtractorAgent(),
        RiskAssessorAgent(),
        MemoDrafterAgent(),
    ]

    def run_agent(self, agent, data):
        last_error = None

        for attempt in range(self.max_attempts):

            try:
                with ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(agent.run, data)

                    # Wait at most 60 seconds
                    return future.result(
                        timeout=self.timeout_seconds
                    )

            except TimeoutError:
                last_error = TimeoutError(
                    f"{agent.name} timed out after "
                    f"{self.timeout_seconds} seconds."
                )

                print(
                    f"{agent.name} timeout "
                    f"(attempt {attempt + 1}/{self.max_attempts})"
                )

            except Exception as exc:
                last_error = exc

                print(
                    f"{agent.name} failed "
                    f"(attempt {attempt + 1}/{self.max_attempts}): {exc}"
                )

            # Retry with backoff
            if attempt < self.max_attempts - 1:
                time.sleep(2 ** attempt)

        raise RuntimeError(
            f"{agent.name} failed after "
            f"{self.max_attempts} attempts."
        ) from last_error

    def run(self, text):

        # 1. Extract clauses
        clause_result = self.run_agent(
            self.agents[0],
            text
        )

        clauses = clause_result.get("clauses", [])

        if not clauses:
            raise RuntimeError(
                "No clauses were extracted."
            )

        # 2. Prepare clauses
        clause_data = [
            {
                "index": i,
                "title": clause.get("title", ""),
                "text": clause.get("text", ""),
            }
            for i, clause in enumerate(clauses)
        ]

        # 3. Assess risks
        risk_result = self.run_agent(
            self.agents[1],
            clause_data
        )

        raw_risks = risk_result.get("risks", [])

        risks = []

        for i, clause in enumerate(clauses):

            risk = (
                raw_risks[i]
                if i < len(raw_risks)
                else {
                    "risk_level": "Unknown",
                    "reason": "No risk result returned",
                    "evidence": clause.get("text", ""),
                }
            )

            risks.append({
                "title": clause.get("title", ""),
                "text": clause.get("text", ""),
                "risk": {
                    "risk_level": risk.get(
                        "risk_level",
                        "Unknown"
                    ),
                    "reason": risk.get(
                        "reason",
                        ""
                    ),
                    "evidence": risk.get(
                        "evidence",
                        ""
                    ),
                }
            })

        # 4. Draft memo
        memo = self.run_agent(
            self.agents[2],
            risks
        )

        if not memo:
            raise RuntimeError(
                "Memo Drafter returned an empty memo."
            )

        # 5. Final result
        return {
            "clauses": clauses,
            "risks": risks,
            "memo": memo,
        }