"""Host pytest is NOT a security sandbox. Explicit approval is mandatory."""
import os
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
def evaluate(workspace, tests, output, approved=False, timeout=30):
    result=dict(evaluation_status="blocked_isolation",test_passed=None,test_total=None,test_pass_rate=None,task_success=None)
    if not approved: return result
    output=Path(output); output.mkdir(parents=True,exist_ok=True)
    env={k:v for k,v in os.environ.items() if not any(s in k.upper() for s in ["TOKEN","SECRET","API_KEY","PASSWORD"])}
    env.update(CODEDEPTH_CANDIDATE=str(Path(workspace).resolve()),PYTEST_DISABLE_PLUGIN_AUTOLOAD="1")
    cmd=[sys.executable,"-I","-m","pytest",str(Path(tests).resolve()),"-q","-p","no:cacheprovider",f"--junitxml={output.resolve() / 'junit.xml'}"]
    try:
        p=subprocess.run(cmd,cwd=output,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=timeout)
        (output/"pytest.log").write_bytes(p.stdout)
        tree=ET.parse(output/"junit.xml"); cases=list(tree.iter("testcase")); total=len(cases)
        passed=sum(not any(c.find(x) is not None for x in ["failure","error","skipped"]) for c in cases)
        result.update(evaluation_status="completed" if p.returncode in (0,1) else "error",test_passed=passed,test_total=total,test_pass_rate=passed/total if total else None,task_success=p.returncode==0 and total>0 and passed==total,pytest_exit_code=p.returncode)
    except subprocess.TimeoutExpired as e:
        (output/"pytest.log").write_bytes(e.stdout or b""); result["evaluation_status"]="timeout"
    except Exception as e: result.update(evaluation_status="error",error=str(e))
    return result
