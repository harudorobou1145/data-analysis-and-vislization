import { Box, Typography } from '@mui/material';
import { ArrowRight, ChartNoAxesCombined, ClipboardList, Database, Layers3, ShieldCheck } from 'lucide-react';

const questions = [
  ['推理档位', '同一道题上，Sol 的 Low、High、Ultra 在任务表现上有何差异？'],
  ['模型差异', '固定 High 档，同题比较 Sol、Luna 与 DeepSeek Flash，哪些差异随任务类型而变化？'],
  ['交互与修复', '代码首轮失败后，经历几轮修复才首次通过？环境交互中，动作和失败反馈如何分布？'],
  ['提示策略', 'TOP-Bench 的原始提示、TNM、CBD 如何改变同题的完成和泄漏结果？'],
];

const stages = [
  { title: '实验设计', icon: ClipboardList, text: '先确定研究问题、共同题目、对照条件和评分规则。开放回答按各自量表评分，代码按测试判定，环境任务按目标是否完成判定。' },
  { title: '采集与归档', icon: Database, text: '先从任务清单取题号，按模型和推理档位分别运行。归档时用运行号关联同一次作答、评测结果与可用的请求或动作日志；耗时和 Token 来自请求记录及接口用量，并非从答案长度估算。模型版本、温度和系统提示以批次实际记录为准，未记录的不推断。原始归档和派生数据分开保存，清洗不覆盖原件。' },
  { title: '整合与清洗', icon: Layers3, text: '开放问答与 HSS 从逐行 JSON 结果读取，HumanEval+ 与 ALFWorld 从运行记录 JSON 读取。两类来源分别把 elapsed_seconds 和 duration_seconds 对齐为 seconds；题号统一为字符串，用于同一数据集内的同题比较。正式主图按实验阶段筛选，缺失数值保留为 null；重复运行和重复记录按下方规则区分。' },
  { title: '脱敏与发布', icon: ShieldCheck, text: '原始对话、系统提示、工具输出、日志路径和凭据不进入前端数据。发布前检查身份信息与敏感字段，仪表盘只使用白名单内的结构化指标，不公开原始结果包。' },
  { title: '分类与分析', icon: ChartNoAxesCombined, text: '动作类别、修复状态等由事件和评测记录派生，保留失败和中断案例。先汇总同题重复评分，再按题等权比较；HSS 与 WildBench 的资源与评分关系只在同题内分析，不作因果解释。' },
];

const stageOutputs = ['实验条件与评分规则', '原始作答与请求日志', '对齐后的结构化记录', '白名单指标', '同题比较与失败分类'];

const sourceExample = {
  task_id: 'EP000', model: 'gpt-6.1-sol', phase: 'initial', reasoning_effort: 'max',
  task_success: true, base_status: 'pass', plus_status: 'pass', total_tokens: 31045, reasoning_tokens: 886,
};
const publishedExample = {
  dataset: 'humanevalplus', task: 'EP000', model: 'gpt-6.1-sol', phase: 'initial',
  effort: 'ultra', rawEffort: 'max', score: 100, baseStatus: 'pass', plusStatus: 'pass', total: 31045, reasoning: 886,
};

const cleaningCases = [
  ['缺失或无效数值', '“没记录”不等于 0。数值字段只接受有限的非负数字，例如字符串 "120" 或负数 -1 都转为 null；有效的数字 0 则保留。'],
  ['未评测与明确失败', '以代码任务为例，task_success 为 false 时 score 为 0；没有布尔型评测结果时 score 为 null，不按失败计算。'],
  ['重复与阶段隔离', '导出按来源、来源条目和运行号校验唯一标识；撞号会报错，不静默覆盖。运行号不同的同题重复作答可以保留，比较时先做同题汇总；修复链独立展示。'],
];

function RecordExample() {
  const codeStyle = { m: 0, mt: 1, p: 1.5, minWidth: 0, bgcolor: '#f3f6f8', color: '#24394b', borderRadius: '8px', fontSize: '.8125rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const;
  return <section aria-labelledby="guide-record" data-chart-section="guide-record" tabIndex={-1}>
    <h2 id="guide-record">一条记录如何进入仪表盘</h2>
    <Typography component="p" variant="body2">以 HumanEval+ 的 EP000 为例。两侧 JSON 是同一次正式首轮运行的字段节选：左侧来自已归档的运行索引，不是 API 原始响应；右侧来自仪表盘的公开指标。</Typography>
    <Box component="figure" aria-labelledby="guide-record-caption" sx={{ mx: 0, my: 2, borderBlock: '1px solid #dce4ec', py: 2 }}>
      <Typography component="figcaption" id="guide-record-caption" variant="subtitle2" sx={{ mb: 2 }}>图 02 · 同一条运行记录的字段对照</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 240px) minmax(0, 1fr)' }, gap: 2 }}>
        <Box><Typography component="h3" variant="subtitle1">01 · 采集后的运行记录</Typography><Box component="pre" sx={codeStyle}><code>{JSON.stringify(sourceExample, null, 2)}</code></Box></Box>
        <Box sx={{ minWidth: 0, borderLeft: '2px solid #acd8c4', pl: 1.5 }}>
          <Typography component="h3" variant="subtitle1">02 · 对齐与清洗</Typography>
          <Box component="ul" sx={{ my: 1, pl: 2.25, display: 'grid', gap: 1, fontSize: '.875rem', overflowWrap: 'anywhere' }}>
            <li><code>task_id → task</code>：题号统一为字符串，用于跨条件配对。</li>
            <li><code>max → ultra</code>：只对指定的 Sol 正式首轮批次映射，原值保留在 <code>rawEffort</code>。</li>
            <li><code>true → 100</code>：把成功状态转换为百分制指标，同时保留 Base 和 Plus 判定。</li>
            <li><code>total_tokens → total</code>：保留原始总量，不再加一次推理 Token。</li>
          </Box>
        </Box>
        <Box><Typography component="h3" variant="subtitle1">03 · 前端指标</Typography><Box component="pre" sx={codeStyle}><code>{JSON.stringify(publishedExample, null, 2)}</code></Box></Box>
      </Box>
    </Box>

    <Typography component="h3" variant="subtitle1">哪些记录进入正式主图？</Typography>
    <Typography component="p" variant="body2">开放问答与 HSS 使用 <code>formal</code>；HumanEval+ 和 ALFWorld 使用 <code>initial</code>。因此 EP000 进入 HumanEval+ 首轮比较。历史预实验与修复记录不混入正式主图，TOP-Bench 按提示策略单独统计。</Typography>
    <Box component="dl" sx={{ m: 0, mt: 2, '& > div': { py: 1.25, borderTop: '1px solid', borderColor: 'divider' }, '& dt': { fontWeight: 700 }, '& dd': { m: 0, mt: 0.5, color: 'text.secondary', lineHeight: 1.7 } }}>
      {cleaningCases.map(([label, rule]) => <div key={label}><dt>{label}</dt><dd>{rule}</dd></div>)}
    </Box>
  </section>;
}

const fields = [
  ['题目与条件', '数据集、题号、模型和档位来自任务清单及运行元数据。同题比较使用题号对齐；只对指定的 Sol 批次将 max 展示为 Ultra，保留原标签。'],
  ['评分与通过状态', '来自裁判、测试或环境结果。缺少评分不等于失败；有明确未通过记录才计为未通过。不同数据集不合成为总分。'],
  ['耗时与 Token', '来自请求记录和接口用量回报。未记录则留空；输出 Token 已含推理 Token，不重复相加。'],
  ['修复与动作', '首次通过、耗尽、中断及动作分类来自评测或事件日志的后处理，不是原始采集字段，也不与首轮得分混算。'],
];

export function TaskGuide() {
  return <Box sx={{ '& section': { mb: 4 }, '& h2': { mb: 1.5 }, '& h3': { m: 0 }, '& p': { mt: 0.5, mb: 0, color: 'text.secondary', lineHeight: 1.75 } }}>
    <div className="page-heading"><div><div className="eyebrow">RESEARCH METHOD</div><h1>任务说明</h1><p>从研究问题、原始记录到可比较指标的处理流程</p></div></div>

    <figure className="guide-pipeline" aria-labelledby="guide-pipeline-caption" data-chart-section="guide-pipeline" tabIndex={-1}>
      <figcaption id="guide-pipeline-caption"><span>图 01</span> 数据处理流程与阶段产物</figcaption>
      <ol role="list">
        {stages.map(({ title, icon: Icon }, index) => <li key={title}>
          <div className="guide-pipeline-marker"><div className="dataset-icon"><Icon size={19} aria-hidden="true" /></div><span>{String(index + 1).padStart(2, '0')}</span></div>
          <div><strong>{title}</strong><span className="guide-pipeline-output">{stageOutputs[index]}</span></div>
          {index < stages.length - 1 && <ArrowRight className="guide-pipeline-arrow" size={16} aria-hidden="true" />}
        </li>)}
      </ol>
    </figure>

    <section aria-labelledby="guide-questions" data-chart-section="guide-questions" tabIndex={-1}>
      <h2 id="guide-questions">研究问题</h2>
      <Box component="ol" sx={{ m: 0, pl: 3, display: 'grid', gap: 1.5 }}>
        {questions.map(([title, question]) => <li key={title}><strong>{title}</strong><Typography component="p" variant="body2">{question}</Typography></li>)}
      </Box>
    </section>

    <section aria-labelledby="guide-workflow" data-chart-section="guide-workflow" tabIndex={-1}>
      <h2 id="guide-workflow">各阶段处理规则</h2>
      <Box component="ol" sx={{ m: 0, pl: 3, display: 'grid', gap: 1.5 }}>
        {stages.map(({ title, text }) => <li key={title}>
          <Typography component="h3" variant="subtitle1">{title}</Typography><Typography component="p" variant="body2">{text}</Typography>
        </li>)}
      </Box>
    </section>

    <RecordExample />

    <section aria-labelledby="guide-fields" data-chart-section="guide-fields" tabIndex={-1}>
      <h2 id="guide-fields">字段来源与处理示例</h2>
      <Box component="dl" sx={{ m: 0, '& > div': { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '9rem minmax(0, 1fr)' }, gap: { xs: 0.5, sm: 2 }, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }, '& dt': { fontWeight: 700 }, '& dd': { m: 0, color: 'text.secondary', lineHeight: 1.75 } }}>
        {fields.map(([label, rule]) => <div key={label}><dt>{label}</dt><dd>{rule}</dd></div>)}
      </Box>
    </section>

    <div className="method-note"><ShieldCheck size={19} aria-hidden="true" /><div><strong>实验边界</strong><p>现有 HSS 结果是在图片题上比较条件，不是有图／无图对照；CrossMath 尚未采集，不计入现有结果。</p></div></div>
  </Box>;
}