from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from collections.abc import Sequence
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = PROJECT_ROOT / "frontend"


def require_executable(*names: str) -> str:
    for name in names:
        executable = shutil.which(name)
        if executable:
            return executable
    raise SystemExit(f"Required executable not found: {', '.join(names)}")


def run(command: Sequence[str], *, cwd: Path = PROJECT_ROOT) -> None:
    print(f"+ {subprocess.list2cmdline(list(command))}", flush=True)
    subprocess.run(list(command), cwd=cwd, check=True, shell=False)


def docker_command(*arguments: str) -> list[str]:
    return [require_executable("docker"), "compose", *arguments]


def npm_command(*arguments: str) -> list[str]:
    return [require_executable("npm.cmd", "npm"), *arguments]


def doctor() -> None:
    run([sys.executable, "--version"])
    run([require_executable("git"), "--version"])
    run(npm_command("--version"))
    run(docker_command("version"))


def status() -> None:
    run([require_executable("git"), "status", "--short", "--branch"])
    run(docker_command("ps"))


def backend_test() -> None:
    run(docker_command("exec", "-T", "backend", "python", "-m", "pytest", "-q"))


def frontend_check() -> None:
    run(npm_command("run", "lint"), cwd=FRONTEND_ROOT)
    run(npm_command("test", "--", "--run"), cwd=FRONTEND_ROOT)
    run(npm_command("run", "build"), cwd=FRONTEND_ROOT)


def check() -> None:
    backend_test()
    frontend_check()


def stack_up() -> None:
    run(docker_command("up", "-d", "--build"))


def stack_start() -> None:
    run(docker_command("up", "-d"))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Cross-platform development task runner")
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command in (
        "doctor",
        "status",
        "backend-test",
        "frontend-check",
        "check",
        "start",
        "up",
    ):
        subparsers.add_parser(command)
    return parser


def main() -> None:
    arguments = build_parser().parse_args()
    commands = {
        "backend-test": backend_test,
        "check": check,
        "doctor": doctor,
        "frontend-check": frontend_check,
        "start": stack_start,
        "status": status,
        "up": stack_up,
    }
    commands[arguments.command]()


if __name__ == "__main__":
    main()
