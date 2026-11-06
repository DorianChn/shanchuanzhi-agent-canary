"""Thin first-party adapter that runs the pinned AgentDojo benchmark via the local bridge."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import openai
from agentdojo.agent_pipeline.agent_pipeline import AgentPipeline, PipelineConfig
from agentdojo.agent_pipeline.llms.openai_llm import OpenAILLM
from agentdojo.attacks.attack_registry import load_attack
from agentdojo.benchmark import benchmark_suite_with_injections
from agentdojo.logging import OutputLogger
from agentdojo.models import MODEL_NAMES
from agentdojo.task_suite.load_suites import get_suite


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--suite", required=True)
    parser.add_argument("--user-task", required=True)
    parser.add_argument("--injection-task", required=True)
    parser.add_argument("--attack", required=True)
    parser.add_argument("--defense", required=True)
    parser.add_argument("--benchmark-version", default="v1.2.2")
    parser.add_argument("--logdir", required=True, type=Path)
    parser.add_argument("--metrics", required=True, type=Path)
    return parser.parse_args()


def result_rows(values: dict) -> list[dict]:
    return [
        {"userTaskId": key[0], "injectionTaskId": key[1], "success": bool(value)}
        for key, value in values.items()
    ]


def main() -> None:
    args = parse_args()
    base_url = os.environ.get("AGENTDOJO_BRIDGE_URL", "")
    token = os.environ.get("AGENTDOJO_BRIDGE_TOKEN", "")
    model_id = os.environ.get("AGENTDOJO_MODEL_ID", "")
    if not (base_url.startswith("http://127.0.0.1:") and token and model_id):
        raise RuntimeError("AGENTDOJO_LOCAL_BRIDGE_CONFIGURATION_REQUIRED")

    # AgentDojo's upstream OpenAILLM uses the standard Chat Completions client.
    # The API key here is only a per-run loopback token; cloud credentials stay in Node.
    client = openai.OpenAI(api_key=token, base_url=base_url)
    llm = OpenAILLM(client, model_id, temperature=0.0)
    llm.name = model_id

    # The upstream tool_knowledge attack personalizes a phrase with MODEL_NAMES.
    # Register an explicit neutral label for arbitrary provider model IDs rather than
    # mislabeling a domestic or third-party model as one of AgentDojo's legacy models.
    MODEL_NAMES[model_id] = "the configured target model"

    pipeline = AgentPipeline.from_config(
        PipelineConfig(
            llm=llm,
            model_id=None,
            defense=args.defense,
            system_message_name=None,
            system_message=None,
        )
    )
    suite = get_suite(args.benchmark_version, args.suite)
    attack = load_attack(args.attack, suite, pipeline)
    args.logdir.mkdir(parents=True, exist_ok=True)
    args.metrics.parent.mkdir(parents=True, exist_ok=True)

    with OutputLogger(str(args.logdir)):
        results = benchmark_suite_with_injections(
            pipeline,
            suite,
            attack,
            logdir=args.logdir,
            force_rerun=True,
            user_tasks=[args.user_task],
            injection_tasks=[args.injection_task],
            benchmark_version=args.benchmark_version,
        )

    summary = {
        "suite": args.suite,
        "benchmarkVersion": args.benchmark_version,
        "attack": args.attack,
        "defense": args.defense,
        "pipelineName": pipeline.name,
        "cleanUtility": [
            {"injectionTaskId": key, "success": bool(value)}
            for key, value in results["injection_tasks_utility_results"].items()
        ],
        "utilityUnderAttack": result_rows(results["utility_results"]),
        "security": result_rows(results["security_results"]),
    }
    args.metrics.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
