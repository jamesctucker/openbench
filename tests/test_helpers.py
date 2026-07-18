"""Shared test utilities — import is stable because module name doesn't collide with conftest."""

import importlib.util
import sys


def load_module(name, filepath):
    """Load a Python module even if the filename contains hyphens."""
    spec = importlib.util.spec_from_file_location(name, filepath)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load module from {filepath}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module
