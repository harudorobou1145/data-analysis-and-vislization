import importlib.util
import os
from pathlib import Path
import pytest
spec = importlib.util.spec_from_file_location("candidate", Path(os.environ["CODEDEPTH_CANDIDATE"])/"solution.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
@pytest.mark.parametrize("values,expected", [([1,2,3],2),([],0),([-6,-2],-4),([0.1,0.2],0.15),([7],7)])
def test_average(values, expected):
    assert m.average(values) == pytest.approx(expected)
