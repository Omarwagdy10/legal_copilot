import logging
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError

from agents.tools import (
    extract_clauses_tool,
    assess_risks_tool,
    draft_memo_tool,
)


logger = logging.getLogger(__name__)


# ============================================================
# Agent 1: Clause Extractor
# ============================================================

class ClauseExtractorAgent:
    name = "Clause Extractor"

    # Tools explicitly allowed for this agent
    allowed_tools = {
        "extract_clauses_tool",
    }

    def run(self, text):
        return extract_clauses_tool(text)


# ============================================================
# Agent 2: Risk Assessor
# ============================================================

class RiskAssessorAgent:
    name = "Risk Assessor"

    # Tools explicitly allowed for this agent
    allowed_tools = {
        "assess_risks_tool",
    }

    def run(self, clauses):
        return assess_risks_tool(clauses)


# ============================================================
# Agent 3: Memo Drafter
# ============================================================

class MemoDrafterAgent:
    name = "Memo Drafter"

    # Tools explicitly allowed for this agent
    allowed_tools = {
        "draft_memo_tool",
    }

    def run(self, risks):
        return draft_memo_tool(risks)


# ============================================================
# Legal Review Orchestrator
# ============================================================

class LegalReviewOrchestrator:

    # Named orchestration pattern
    pattern = "pipeline"

    # Maximum attempts for each agent
    max_attempts = 3

    # Maximum time allowed for one attempt
    timeout_seconds = 60

    # Maximum number of pipeline steps
    max_pipeline_steps = 3

    # Agents used by the pipeline
    agents = [
        ClauseExtractorAgent(),
        RiskAssessorAgent(),
        MemoDrafterAgent(),
    ]

    # --------------------------------------------------------
    # Run one agent safely
    # --------------------------------------------------------

    def run_agent(self, agent, data):

        last_error = None

        # Security / excessive-agency check
        if not hasattr(agent, "allowed_tools"):
            raise RuntimeError(
                f"Agent '{agent.name}' has no tool allow-list."
            )

        if not agent.allowed_tools:
            raise RuntimeError(
                f"Agent '{agent.name}' has no allowed tools."
            )

        logger.info(
            "Starting agent: %s",
            agent.name
        )

        for attempt in range(self.max_attempts):

            try:

                executor = ThreadPoolExecutor(
                    max_workers=1
                )

                future = executor.submit(
                    agent.run,
                    data
                )

                try:

                    result = future.result(
                        timeout=self.timeout_seconds
                    )

                    logger.info(
                        "Agent '%s' completed successfully "
                        "on attempt %s.",
                        agent.name,
                        attempt + 1
                    )

                    return result

                finally:

                    # Do not wait after timeout.
                    executor.shutdown(
                        wait=False,
                        cancel_futures=True
                    )

            except TimeoutError:

                last_error = TimeoutError(
                    f"{agent.name} timed out after "
                    f"{self.timeout_seconds} seconds."
                )

                logger.warning(
                    "Agent '%s' timeout "
                    "(attempt %s/%s).",
                    agent.name,
                    attempt + 1,
                    self.max_attempts
                )

            except Exception as exc:

                last_error = exc

                logger.exception(
                    "Agent '%s' failed "
                    "(attempt %s/%s).",
                    agent.name,
                    attempt + 1,
                    self.max_attempts
                )

            # Retry with exponential backoff
            if attempt < self.max_attempts - 1:

                backoff_seconds = 2 ** attempt

                logger.info(
                    "Retrying agent '%s' after %s seconds.",
                    agent.name,
                    backoff_seconds
                )

                time.sleep(
                    backoff_seconds
                )

        raise RuntimeError(
            f"{agent.name} failed after "
            f"{self.max_attempts} attempts."
        ) from last_error

    # --------------------------------------------------------
    # Main pipeline
    # --------------------------------------------------------

    def run(self, text):

        # ----------------------------------------------------
        # Validate input
        # ----------------------------------------------------

        if not text or not text.strip():
            raise ValueError(
                "Contract text cannot be empty."
            )

        # ----------------------------------------------------
        # Pipeline breaker
        # ----------------------------------------------------

        if self.max_pipeline_steps != len(self.agents):

            raise RuntimeError(
                "Pipeline configuration is invalid."
            )

        # ====================================================
        # Step 1: Extract clauses
        # ====================================================

        clause_result = self.run_agent(
            self.agents[0],
            text
        )

        if not isinstance(clause_result, dict):

            raise RuntimeError(
                "Clause Extractor returned invalid data."
            )

        clauses = clause_result.get(
            "clauses",
            []
        )

        if not clauses:

            raise RuntimeError(
                "No clauses were extracted."
            )

        # ====================================================
        # Step 2: Prepare clauses
        # ====================================================

        clause_data = [

            {
                "index": i,
                "title": clause.get(
                    "title",
                    ""
                ),
                "text": clause.get(
                    "text",
                    ""
                ),
            }

            for i, clause in enumerate(clauses)
        ]

        # ====================================================
        # Step 3: Assess risks
        # ====================================================

        risk_result = self.run_agent(
            self.agents[1],
            clause_data
        )

        if not isinstance(risk_result, dict):

            raise RuntimeError(
                "Risk Assessor returned invalid data."
            )

        raw_risks = risk_result.get(
            "risks",
            []
        )

        risks = []

        # Guard against silent omission
        for i, clause in enumerate(clauses):

            if i < len(raw_risks):

                risk = raw_risks[i]

            else:

                risk = {
                    "risk_level": "Unknown",
                    "reason": "No risk result returned",
                    "evidence": clause.get(
                        "text",
                        ""
                    ),
                }

                logger.warning(
                    "Missing risk result for clause %s.",
                    i
                )

            risks.append(

                {
                    "title": clause.get(
                        "title",
                        ""
                    ),

                    "text": clause.get(
                        "text",
                        ""
                    ),

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
                }
            )

        # ====================================================
        # Step 4: Draft memo
        # ====================================================

        memo = self.run_agent(
            self.agents[2],
            risks
        )

        if not memo:

            raise RuntimeError(
                "Memo Drafter returned an empty memo."
            )

        # ====================================================
        # Step 5: Final result
        # ====================================================

        return {

            "pattern": self.pattern,

            "clauses": clauses,

            "risks": risks,

            "memo": memo,

            "agents": [
                agent.name
                for agent in self.agents
            ],
        }