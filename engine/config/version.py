import subprocess
from pathlib import Path

VERSION_MAJOR = 2
VERSION_MINOR = 2
VERSION_PATCH = 0

def get_git_build_count() -> int:
    try:
        repo_dir = Path(__file__).resolve().parent.parent.parent
        out = subprocess.check_output(
            ["git", "rev-list", "--count", "HEAD"],
            cwd=repo_dir,
            stderr=subprocess.DEVNULL,
            timeout=2.0
        )
        return int(out.decode().strip())
    except Exception:
        return 54

def get_app_version() -> str:
    """
    Returns the dynamic 9-digit software version formatted as:
    000.000.000 (Major.Minor.Build)
    """
    build = get_git_build_count()
    return f"{VERSION_MAJOR:03d}.{VERSION_MINOR:03d}.{build:03d}"

APP_VERSION = get_app_version()
