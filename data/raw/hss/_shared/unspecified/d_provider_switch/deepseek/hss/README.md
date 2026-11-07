HSS沿用原20道图片题，四个领域各5题。只测DeepSeek high，每题一次，共20份回答、20次主评和2次复评。裁判固定为gpt-6.1-sol/high。候选只看问题和原图，参考答案及官方rubric只提供给裁判。

得分为满足评分项的比例乘10，全部评分项满足才算整题通过。每次评分关联具体回答的request_id、attempt_id和answer_hash。原图及实际图片请求证据、耗时、token分别保存。

当前尚未启动。新API返回余额不足，真实模型目录、high参数和图片能力仍待验证。experiment_config.json中的deepseek-flash只是前轮使用过的待确认别名，不代表该API已支持，也不会自动替换成其它模型。

上两级work/provider_readiness.json必须记录provider_id=edom37、status=passed，models中包含完全对应的model_id、effort及validated=true。候选还必须image_supported=true。未验证时脚本在正式调用前停止，不将不支持图片记作模型零分。

模型配置集中在experiment_config.json，验证后、prepare前更新。prepare冻结题目、模型、评分代码、共享客户端及能力校验代码的hash。旧实验结果不覆盖。实际framework、provider revision、选定与实际思考参数分别记录，API切换的影响需要单独注明。

验证通过后运行：python script/run_experiment.py --stage prepare，再运行python script/run_experiment.py --stage all --workers 1。可先用--only <task_id>__deepseek_high跑一题，成功结果会复用。不要在能力验证通过前启动正式批次。
