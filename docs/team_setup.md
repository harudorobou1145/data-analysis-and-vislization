# 四人协作与队友环境配置

## 仓库边界
以codedepth本身作为仓库根目录。代码、tasks、独立evaluation测试、tests、文档、依赖清单可提交；.venv、缓存、全部实验结果（包括根results/runs.csv）和课程PDF渲染不提交。根目录的课程原始PDF不在此仓库内，不自动上传。当前没有初始化Git，也没有推送远程。
原始日志含提示词、命令、绝对路径及潜在个人信息；课程要求不公开原始对话。私有仓库也不要提交认证文件/密钥；研究数据采用独立受控备份。后续只将人工审核的匿名化派生数据放在例如data/processed/，同时附字典和来源说明。不要用git add -f把results放回仓库。
Git忽略不保护已跟踪文件；如果之后误提交密钥，需撤销/轮换密钥并清理历史，不能只删除当前文件。

## 维护者首次上传（手动，在codedepth目录）
在GitHub/Gitee等创建空的私有仓库并邀请3位队友，不预先创建README以免首次推送冲突。把下面REMOTE_URL替换为真实仓库地址，不包含凭据。
```powershell
git init
git branch -M main
git add .
git status --short
git diff --cached --stat
# 确认没有.venv、results下的实验文件、auth.json、个人配置、密钥和原始对话
git commit -m "Prepare CodeDepth pilot experiment framework"
git remote add origin REMOTE_URL
git push -u origin main
```
若Git提示缺少提交者身份，请自行配置姓名/邮箱；不要共享账号令牌。上传前逐项审阅暂存文件，本文不是密钥扫描认证。队友克隆仓库能看到验收代码，但运行智能体仍需独立隔离，仓库公开/私有不能代替隐藏测试的运行时读隔离。

## 队友首次配置（Windows PowerShell）
```powershell
git clone REMOTE_URL
cd codedepth  # 若仓库名称不同，进入实际克隆目录
python --version
codex --version
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
.\.venv\Scripts\python.exe -m pytest tests -q
```
本次已验证Python3.14.7、Codex CLI0.166.0、pytest9.2.0（最初检查CLI为0.152.0）；其他系统/版本未验证。建议统一上述Python/CLI版本，至少记录差异。队友需自行安装Git/Python/Node及Codex CLI，使用各自获授权账号登录并完成本机Windows沙箱初始化；仓库不携带这些系统配置或账号额度。具体CLI安装和登录使用官方文档；不能把维护者.codex目录或.venv复制过去。
本地测试只运行开发者可信代码和模拟CLI，不调用模型。预期10项通过。

## 模型/权限核对与预演
在CLI通过/status、/debug-config核实实际模型ID、low/high支持、provider和沙箱。一次本机成功不保证其他账号也有相同模型权限。使用elevated的机器须已经完成对应初始化；不同操作系统不要照抄Windows参数。
```powershell
$Model = Read-Host "输入该账号可用且全组统一的模型ID"
.\.venv\Scripts\python.exe runner/run_experiment.py --task T001 --effort low --repeat 1 --model $Model --http-only --windows-sandbox elevated
```
预期preview=true，不调用模型。真实调用消耗执行者自己的账号额度；确认隐藏测试不可读、独立运行目录及资源隔离条件，并明确同意执行后才加真实开关：
```powershell
.\.venv\Scripts\python.exe runner/run_experiment.py --task T001 --effort low --repeat 1 --model $Model --http-only --windows-sandbox elevated --timeout 300 --execute --isolation-confirmed --allow-host-evaluation
```
Low成功后再改effort为high，其他参数相同。isolation-confirmed只声明已验证隔离，不创建隔离。保持默认workspace-write，不使用绕过沙箱选项。results/runs.csv在真实运行后自动生成，未运行前没有此文件属正常。

## 正式采集的团队约定
推荐正式对照集中在同一台实验机执行；队友本地用于开发与框架试验。不同电脑的CPU、网络、Python、CLI、账号额度可能混淆耗时/表现差异。若分布式采集，先扩展machine_id、operator_id、batch_id、commit_sha、环境指纹及执行顺序记录，再平衡各机器上的全部强度，分析时控制批次，不能一人只跑一种强度。现有config.json记录Python/CLI/请求参数和初始hash，但没有自动记录全部机器/账号/提交信息。
所有实验固定同一代码提交、模型、任务和权限；不把环境阻断作模型能力结论。重复序号只在单条命令内唯一，跨机器用run_id关联。同一结果目录禁止多调度器同时写汇总CSV；每人本地结果独立保存，后续按run_id合并/查重，当前没有实现团队自动合并。
建议4人分别负责任务及验收、采集与解析、分析与清洗、交互系统和案例叙事，互相复核。使用个人分支，经审查合并main；采集期间冻结任务/验收版本。修复、测试和文档变更不能静默混入同一正式批次。
