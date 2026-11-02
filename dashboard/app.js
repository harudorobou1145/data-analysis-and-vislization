/*
 * CodeDepth · EvalPlus 仪表盘逻辑。数据来自 window.CODEDEPTH_DATA（dashboard/data.js）。
 * 四视图 + 联动：矩阵 → 点题 → 修复轨迹 → 点轮 → 工具与代码。
 */
(function () {
  "use strict";

  var DATA = window.CODEDEPTH_DATA || { kind: "real", paired: [], repair_rounds: [], repair_groups: [], repair_groups_orig: [], tool_actions: [], candidates: {}, specs: {}, meta: {} };

  var THEMES = {
    light: {
      surface: "#fcfcfb", text1: "#0b0b0b", text2: "#52514e", muted: "#898781",
      grid: "#e1e0d9", axis: "#c3c2b7",
      series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"],
      seq: ["#86b6ef", "#2a78d6", "#104281"],
      seqHeat: ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#2a78d6", "#184f95", "#0d366b"],
    },
    dark: {
      surface: "#1a1a19", text1: "#f0efec", text2: "#c3c2b7", muted: "#898781",
      grid: "#2c2c2a", axis: "#383835",
      series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"],
      seq: ["#184f95", "#3987e5", "#6da7ec"],
      seqHeat: ["#0d366b", "#184f95", "#2a78d6", "#3987e5", "#6da7ec", "#9ec5f4", "#cde2fb"],
    },
  };
  // 状态色固定，不随主题换（palette.md：status 永不主题化）
  var STATUS = {
    pass: { label: "通过（base+plus）", color: "#0ca30c" },
    plus_fail: { label: "base 通过 / plus 失败", color: "#fab219" },
    fail: { label: "base+plus 均失败", color: "#d03b3b" },
    timeout: { label: "超时", color: "#ec835a" },
    interrupted: { label: "接口中断（未评测）", color: "#898781" },
    unknown: { label: "缺失/未知", color: "#898781" },
  };
  var CAT = {
    file_read: { label: "读文件", color: "#2a78d6" },
    file_write: { label: "写文件", color: "#1baf7a" },
    command_execution: { label: "命令", color: "#eb6834" },
    other: { label: "其他", color: "#898781" },
  };

  var EFFORTS = ["low", "medium", "high", "max"];
  var EFFORT_LABEL = { low: "低", medium: "中", high: "高", max: "Max" };
  var CASE_TASKS = ["EP015", "EP032", "EP099", "EP122", "EP132"];
  var SUBJ_EFFORTS = ["low", "high", "ultra"];
  var SUBJ_LABEL = { low: "Low", high: "High", ultra: "Ultra" };
  var SUBJ_TYPE_LABEL = { writing: "写作表达", analysis: "分析论证", planning: "方案设计" };

  var state = { exp: "coding", metric: "status", onlyFailed: false, compare: "mh", task: null, run: null, tab: "tab-primary" };
  var charts = {};
  var renderedRepair = false, renderedSubj = false;
  var pairedByTask = {};

  function isDark() { return document.documentElement.getAttribute("data-theme") === "dark"; }
  function pal() { return isDark() ? THEMES.dark : THEMES.light; }
  function fmt(n) { return (n == null || isNaN(n)) ? "—" : Number(n).toLocaleString("en-US"); }
  function fmt1(n) { return (n == null || isNaN(n)) ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 1 }); }
  function taskNum(id) { return parseInt(String(id).replace(/\D/g, ""), 10) || 0; }

  function outcome(r) {
    if (r.execution_status === "timeout") return "timeout";
    if (r.execution_status === "cli_failed") return "interrupted";
    if (r.task_success === true) return "pass";
    if (r.task_success === false) return r.base_status === "pass" ? "plus_fail" : "fail";
    return "unknown";
  }
  function isFailedTask(tid) {
    var rec = pairedByTask[tid];
    return EFFORTS.some(function (e) { return rec && rec[e] && rec[e].task_success === false; });
  }
  function sortedTasks() {
    return DATA.paired.map(function (p) { return p.task_id; }).sort(function (a, b) { return taskNum(a) - taskNum(b); });
  }
  function setText(id, v) { document.getElementById(id).textContent = v; }

  function chart(id) {
    if (!charts[id]) {
      var el = document.getElementById(id);
      if (!el) { charts[id] = { setOption: function () {}, resize: function () {}, off: function () {}, on: function () {} }; return charts[id]; }
      charts[id] = echarts.init(el);
    }
    return charts[id];
  }
  function axisValue(p) {
    return { type: "value", splitLine: { lineStyle: { color: p.grid, width: 1 } }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: p.text2, fontSize: 11 } };
  }
  function axisCategory(p) {
    return { type: "category", axisLine: { lineStyle: { color: p.axis } }, axisTick: { show: false }, axisLabel: { color: p.text2, fontSize: 11 } };
  }

  function buildIndex() {
    pairedByTask = {};
    DATA.paired.forEach(function (p) { pairedByTask[p.task_id] = p; });
  }

  // ---------- 渲染 ----------
  function renderAll() {
    buildIndex();
    renderBanner();
    renderMatrix();
    renderDiffBox();
    renderDiffScatter();
    if (renderedRepair) renderRepair();
    updateSelbar();
    renderToolAndCode();
    if (renderedSubj) renderSubjective();
  }

  function renderBanner() {
    var b = document.getElementById("dataBanner");
    if (DATA.kind === "real") {
      b.className = "banner";
      b.innerHTML = "<strong>真实数据</strong> · EvalPlus 主实验 " + (DATA.meta ? DATA.meta.primary_tasks : "?") +
        " 题 × 3 档，修复 " + (DATA.meta ? DATA.meta.repair_rounds : "?") + " 轮。" +
        " reasoning_effort 为请求档位、未经独立验证；相关≠因果。";
    } else {
      b.className = "banner synthetic";
      b.innerHTML = "<strong>合成演示数据</strong> · 非研究结果。";
    }
  }

  function metricLabel(m) {
    return { output_tokens: "输出 Token", total_tokens: "总 Token", duration_seconds: "耗时(s)" }[m] || m;
  }

  function renderMatrix() {
    var p = pal();
    var tasks = sortedTasks();
    if (state.onlyFailed) tasks = tasks.filter(isFailedTask);
    var metric = state.metric;
    var yData = tasks;
    var data = [];
    var maxVal = 0, hasNum = false;
    tasks.forEach(function (tid, yi) {
      var rec = pairedByTask[tid];
      EFFORTS.forEach(function (e, xi) {
        var r = rec[e];
        var out = outcome(r);
        var item = { value: [xi, yi, 0], task_id: tid, effort: e, run_id: r.run_id, outcome: out, r: r };
        if (metric === "status") {
          item.itemStyle = { color: STATUS[out].color };
        } else {
          var v = r[metric];
          item.value[2] = (v == null ? 0 : v);
          if (v != null) { maxVal = Math.max(maxVal, v); hasNum = true; }
        }
        data.push(item);
      });
    });

    var option = {
      backgroundColor: "transparent",
      textStyle: { color: p.text2 },
      tooltip: {
        trigger: "item",
        formatter: function (pr) {
          var d = pr.data; if (!d || !d.r) return "";
          var r = d.r;
          return "<strong>" + d.task_id + " · " + EFFORT_LABEL[d.effort] + "</strong>（" + d.run_id + "）<br/>" +
            "结果：" + STATUS[d.outcome].label +
            "<br/>耗时 " + fmt1(r.duration_seconds) + " s · 输出 " + fmt(r.output_tokens) + " · 总 " + fmt(r.total_tokens) +
            "<br/>工具 " + fmt(r.tool_call_count) + " 次 · 自测 " + fmt(r.test_execution_count) + " · 错误 " + fmt(r.tool_error_count);
        },
      },
      grid: { left: 8, right: 30, top: 8, bottom: 30, containLabel: true },
      xAxis: Object.assign(axisCategory(p), { data: EFFORTS.map(function (e) { return EFFORT_LABEL[e]; }) }),
      yAxis: Object.assign(axisCategory(p), { data: yData, axisLabel: { color: p.text2, fontSize: 11 } }),
      series: [{
        type: "heatmap", data: data,
        itemStyle: { borderColor: p.surface, borderWidth: 2 },
        label: {
          show: metric !== "status", fontSize: 10,
          rich: { onDark: { color: "#ffffff", fontWeight: 600 }, onLight: { color: "#0b0b0b", fontWeight: 600 } },
          formatter: function (pr) {
            if (metric === "status") return "";
            var v = pr.data.r[metric];
            if (v == null) return "";
            var hi = maxVal > 0 && v >= 0.55 * maxVal;
            var s = isDark() ? (hi ? "onLight" : "onDark") : (hi ? "onDark" : "onLight");
            var txt = metric === "duration_seconds" ? v.toFixed(1) + "s" : (v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v));
            return "{" + s + "|" + txt + "}";
          },
        },
      }],
    };

    if (metric !== "status" && hasNum) {
      option.visualMap = {
        min: 0, max: Math.ceil(maxVal), calculable: false, orient: "vertical", right: 0, top: "center",
        itemWidth: 12, itemHeight: 100, text: [metricLabel(metric), "0"],
        textStyle: { color: p.muted, fontSize: 10 }, inRange: { color: p.seqHeat },
      };
    }
    if (yData.length > 12) {
      option.dataZoom = [
        { type: "inside", yAxisIndex: 0, filterMode: "weakFilter" },
        { type: "slider", yAxisIndex: 0, width: 14, right: 2, start: 0, end: 40 },
      ];
    }

    var hgt = yData.length <= 12 ? Math.max(260, yData.length * 34 + 70) : 720;
    document.getElementById("chartMatrix").style.height = hgt + "px";

    var c = chart("chartMatrix");
    c.resize();
    c.setOption(option, true);
    c.off("click");
    c.on("click", function (pr) {
      if (pr.data && pr.data.run_id) { state.task = pr.data.task_id; state.run = pr.data.run_id; onSelect(); }
    });

    // 图例
    var lg = document.getElementById("matrixLegend");
    if (metric === "status") {
      lg.innerHTML = ["pass", "plus_fail", "fail"].map(function (k) {
        return '<span class="item"><span class="sw" style="background:' + STATUS[k].color + '"></span>' + STATUS[k].label + "</span>";
      }).join("");
    } else {
      lg.innerHTML = '<span class="item">颜色越深 = ' + metricLabel(metric) + " 越高（sequential 蓝）</span>";
    }
  }

  function diffSeries() {
    var arr = { out_hl: [], out_ml: [], out_mh: [], out_maxlow: [] };
    DATA.paired.forEach(function (rec) {
      var lo = rec.low, md = rec.medium, hi = rec.high, mx = rec.max;
      if (lo.output_tokens != null && hi.output_tokens != null) arr.out_hl.push(hi.output_tokens - lo.output_tokens);
      if (lo.output_tokens != null && md.output_tokens != null) arr.out_ml.push(md.output_tokens - lo.output_tokens);
      if (hi.output_tokens != null && mx.output_tokens != null) arr.out_mh.push(mx.output_tokens - hi.output_tokens);
      if (lo.output_tokens != null && mx.output_tokens != null) arr.out_maxlow.push(mx.output_tokens - lo.output_tokens);
    });
    return arr;
  }
  function quantile(sorted, q) {
    var pos = (sorted.length - 1) * q, base = Math.floor(pos), rest = pos - base;
    return sorted[base] + (sorted[base + 1] !== undefined ? (sorted[base + 1] - sorted[base]) * rest : 0);
  }
  function boxStats(arr) {
    arr = arr.filter(function (v) { return v != null && !isNaN(v); }).sort(function (a, b) { return a - b; });
    if (!arr.length) return null;
    return [arr[0], quantile(arr, 0.25), arr[Math.floor(arr.length / 2)], quantile(arr, 0.75), arr[arr.length - 1]];
  }

  function renderDiffBox() {
    var p = pal();
    var d = diffSeries();
    var names = ["High−Low", "Med−Low", "Max−High", "Max−Low"];
    var boxes = [boxStats(d.out_hl), boxStats(d.out_ml), boxStats(d.out_mh), boxStats(d.out_maxlow)];
    chart("chartDiffBox").setOption({
      backgroundColor: "transparent", textStyle: { color: p.text2 },
      tooltip: { trigger: "item", formatter: function (pr) { return (names[pr.dataIndex] || "") + " 输出 Token 差值"; } },
      grid: { left: 8, right: 20, top: 30, bottom: 26, containLabel: true },
      xAxis: Object.assign(axisCategory(p), { data: names }),
      yAxis: Object.assign(axisValue(p), { name: "输出 Token 差值", nameTextStyle: { color: p.muted } }),
      series: [{
        type: "boxplot", data: boxes, itemStyle: { color: p.series[0], borderColor: p.series[0] },
        boxWidth: [10, 26],
      }],
    }, true);
  }

  function renderDiffScatter() {
    var p = pal();
    var map = {
      hl: { x: "low", y: "high" },
      mh: { x: "high", y: "max" },
      ml: { x: "low", y: "max" },
    };
    var m = map[state.compare] || map.mh;
    var xE = m.x, yE = m.y;
    var pts = [];
    var minV = Infinity, maxV = -Infinity;
    DATA.paired.forEach(function (rec) {
      var xr = rec[xE], yr = rec[yE];
      if (xr.output_tokens == null || yr.output_tokens == null) return;
      minV = Math.min(minV, xr.output_tokens, yr.output_tokens);
      maxV = Math.max(maxV, xr.output_tokens, yr.output_tokens);
      pts.push({ value: [xr.output_tokens, yr.output_tokens], task_id: rec.task_id, diff: yr.output_tokens - xr.output_tokens });
    });
    chart("chartDiffScatter").setOption({
      backgroundColor: "transparent", textStyle: { color: p.text2 },
      tooltip: {
        trigger: "item",
        formatter: function (pr) {
          return "<strong>" + pr.data.task_id + "</strong><br/>" + EFFORT_LABEL[xE] + " " + fmt(pr.value[0]) +
            " → " + EFFORT_LABEL[yE] + " " + fmt(pr.value[1]) +
            "<br/>差值 " + (pr.data.diff >= 0 ? "+" : "") + fmt(pr.data.diff) + " Token";
        },
      },
      legend: { show: false },
      grid: { left: 8, right: 24, top: 20, bottom: 26, containLabel: true },
      xAxis: Object.assign(axisValue(p), { name: EFFORT_LABEL[xE] + " 输出 Token", nameTextStyle: { color: p.muted } }),
      yAxis: Object.assign(axisValue(p), { name: EFFORT_LABEL[yE] + " 输出 Token", nameTextStyle: { color: p.muted } }),
      series: [{
        type: "scatter", data: pts, symbolSize: 9,
        itemStyle: { color: p.series[0], opacity: 0.7, borderColor: p.surface, borderWidth: 1.5 },
        markLine: {
          silent: true, symbol: "none", lineStyle: { color: p.muted, type: "dashed", width: 1 },
          label: { show: true, formatter: "y = x", position: "end", color: p.muted },
          data: [[{ coord: [minV, minV] }, { coord: [maxV, maxV] }]],
        },
      }],
    }, true);
    var c = chart("chartDiffScatter");
    c.off("click");
    c.on("click", function (pr) { if (pr.data) { state.task = pr.data.task_id; state.run = pairedByTask[pr.data.task_id][yE].run_id; onSelect(); } });
  }

  // ---------- 修复轨迹 ----------
  function chainGroup(tid, e) {
    for (var i = 0; i < DATA.repair_groups.length; i++) {
      if (DATA.repair_groups[i].task_id === tid && DATA.repair_groups[i].reasoning_effort === e) return DATA.repair_groups[i];
    }
    return null;
  }

  function renderRepair() {
    var grid = document.getElementById("repairGrid");
    grid.innerHTML = "";
    CASE_TASKS.forEach(function (tid) {
      var card = document.createElement("div"); card.className = "card repair-panel";
      var h = document.createElement("h3"); h.textContent = tid + "（" + (pairedByTask[tid] ? pairedByTask[tid].source_task_id : "") + "）";
      var src = document.createElement("p"); src.className = "src";
      src.textContent = "横轴=追加轮次（0=原失败候选）；圆点=结果，菱形=首次通过，空圈=600s 预算。";
      var div = document.createElement("div"); div.className = "chart"; div.id = "chartRepair_" + tid; div.style.height = "270px";
      card.appendChild(h); card.appendChild(src); card.appendChild(div);
      grid.appendChild(card);
      renderRepairPanel(tid);
    });

    var lg = document.getElementById("repairLegend");
    lg.innerHTML = [
      '<span class="item"><span class="sw" style="background:' + STATUS.pass.color + '"></span>通过</span>',
      '<span class="item"><span class="sw" style="background:' + STATUS.plus_fail.color + '"></span>base通过/plus失败</span>',
      '<span class="item"><span class="sw" style="background:' + STATUS.fail.color + '"></span>均失败</span>',
      '<span class="item"><span class="sw" style="background:' + STATUS.timeout.color + '"></span>超时</span>',
      '<span class="item"><span class="sw" style="background:' + STATUS.interrupted.color + '"></span>接口中断</span>',
      '<span class="item">◆ 首次通过</span><span class="item">○ 600s</span>',
    ].join("");
  }

  function renderRepairPanel(tid) {
    var p = pal();
    var id = "chartRepair_" + tid;
    // 有修复链的档位 = 该题在主实验中失败的档位
    var lanes = EFFORTS.filter(function (e) {
      var s = pairedByTask[tid] && pairedByTask[tid][e];
      return s && s.task_success === false;
    });
    var series = [];
    var maxRound = 0;
    lanes.forEach(function (e, li) {
      var grp = chainGroup(tid, e);
      var pts = [];
      var seed = pairedByTask[tid][e];
      if (seed) {
        pts.push({ value: [0, li], run_id: seed.run_id, outcome: outcome(seed), effort: e, first: false, recover: false });
      }
      DATA.repair_rounds.forEach(function (rr) {
        if (rr.task_id !== tid || rr.reasoning_effort !== e) return;
        var rd = rr.repair_round == null ? 0 : rr.repair_round;
        maxRound = Math.max(maxRound, rd);
        var first = grp && grp.first_success_additional_round === rd;
        var recover = rr.timeout_seconds === 600;
        pts.push({ value: [rd, li], run_id: rr.run_id, outcome: outcome(rr), effort: e, first: first, recover: recover });
      });
      series.push({
        name: EFFORT_LABEL[e], type: "scatter", data: pts, symbolSize: 12,
        itemStyle: {
          color: function (pr) { return STATUS[pr.data.outcome].color; },
          opacity: 0.9, borderColor: p.surface, borderWidth: 1.5,
        },
        symbol: function (value, pr) {
          if (pr.data.first) return "diamond";
          if (pr.data.recover) return "emptyCircle";
          return "circle";
        },
      });
    });
    chart(id).setOption({
      backgroundColor: "transparent", textStyle: { color: p.text2 },
      tooltip: {
        trigger: "item",
        formatter: function (pr) {
          var d = pr.data;
          return "<strong>" + d.run_id + "</strong><br/>追加轮次 " + pr.value[0] + " · " + EFFORT_LABEL[d.effort] +
            "<br/>结果：" + STATUS[d.outcome].label + (d.first ? "（首次通过）" : "") + (d.recover ? "（600s 预算）" : "");
        },
      },
      grid: { left: 8, right: 16, top: 16, bottom: 24, containLabel: true },
      xAxis: Object.assign(axisValue(p), { minInterval: 1, name: "追加轮次", nameTextStyle: { color: p.muted } }),
      yAxis: Object.assign(axisCategory(p), { data: lanes.map(function (e) { return EFFORT_LABEL[e]; }) }),
      series: series,
    }, true);
    var c = chart(id);
    c.off("click");
    c.on("click", function (pr) { if (pr.data && pr.data.run_id) { state.task = tid; state.run = pr.data.run_id; onSelect(); } });
  }

  // ---------- 工具与代码 ----------
  function renderToolAndCode() {
    renderToolList();
    renderCode();
  }
  function renderToolList() {
    var box = document.getElementById("toolList");
    if (!state.run) { box.innerHTML = '<div class="empty">请先在矩阵或修复轨迹中选中一个运行。</div>'; document.getElementById("toolTitle").textContent = "工具动作序列"; return; }
    var acts = DATA.tool_actions.filter(function (a) { return a.run_id === state.run; }).sort(function (a, b) { return (a.action_index || 0) - (b.action_index || 0); });
    document.getElementById("toolTitle").textContent = "工具动作序列 · " + state.run + "（" + acts.length + " 个动作）";
    if (!acts.length) { box.innerHTML = '<div class="empty">该运行无审计工具动作。</div>'; return; }
    box.innerHTML = "";
    acts.forEach(function (a) {
      var row = document.createElement("div"); row.className = "tool-item";
      var meta = CAT[a.behavior_category] || CAT.other;
      var t = document.createElement("span"); t.className = "t"; t.textContent = (a.relative_time_seconds != null ? a.relative_time_seconds.toFixed(1) + "s" : "—");
      var cat = document.createElement("span"); cat.className = "cat";
      cat.innerHTML = '<span class="sw" style="background:' + meta.color + '"></span> ' + meta.label;
      var detail = document.createElement("span");
      var parts = [a.tool_name || ""];
      if (a.file_role) parts.push(a.file_role);
      if (a.command_family) parts.push(a.command_family);
      if (a.is_test_execution) parts.push("自测");
      detail.textContent = parts.join(" · ");
      var flag = document.createElement("span");
      if (a.is_error) { flag.className = "err"; flag.textContent = "⚠ " + (a.error_category || "错误"); }
      else { flag.className = "t"; flag.textContent = a.command_duration_seconds != null ? a.command_duration_seconds.toFixed(2) + "s" : (a.bridge_duration_seconds != null ? a.bridge_duration_seconds.toFixed(2) + "s" : ""); }
      row.appendChild(t); row.appendChild(cat); row.appendChild(detail); row.appendChild(flag);
      box.appendChild(row);
    });
  }
  function renderCode() {
    var grid = document.getElementById("codeGrid");
    var title = document.getElementById("codeTitle");
    if (!state.run) { grid.innerHTML = '<div class="empty">请选中一个失败题的运行以查看代码。</div>'; title.textContent = "候选代码与题面"; return; }
    var tid = state.task;
    var spec = DATA.specs[tid];
    var cur = DATA.candidates[state.run];
    var parent = null;
    // 找父版本
    var rr = DATA.repair_rounds.filter(function (x) { return x.run_id === state.run; })[0];
    if (rr && rr.parent_run_id) parent = DATA.candidates[rr.parent_run_id];
    if (!spec && !cur) {
      grid.innerHTML = '<div class="empty">该题候选代码未内嵌（仅失败 4 题内嵌）。见交接包 cases/candidates/' + state.run + '.py。</div>';
      title.textContent = "候选代码与题面";
      return;
    }
    title.textContent = "候选代码与题面 · " + state.run;
    grid.innerHTML = "";
    function codeBox(hd, code, key) {
      var box = document.createElement("div"); box.className = "code-box";
      var h = document.createElement("div"); h.className = "hd"; h.textContent = hd;
      box.appendChild(h);
      if (code != null && code !== "") {
        var pre = document.createElement("pre"); pre.textContent = code; box.appendChild(pre);
      } else {
        var none = document.createElement("div"); none.className = "none"; none.textContent = "（无 / 未内嵌）"; box.appendChild(none);
      }
      grid.appendChild(box);
    }
    if (spec) codeBox("公开题面 · " + tid, spec, "spec");
    codeBox("当前候选 · " + state.run, cur, "cur");
    if (parent != null && rr) codeBox("父版本 · " + rr.parent_run_id, parent, "parent");
  }

  function updateSelbar() {
    var el = document.getElementById("selbar");
    if (!state.task && !state.run) { el.textContent = "未选中任何题目或运行。"; return; }
    el.innerHTML = "已选题目 <b>" + (state.task || "—") + "</b>" + (state.run ? " · 运行 <b>" + state.run + "</b>" : "");
  }

  function onSelect() {
    updateSelbar();
    renderToolAndCode();
    // 高亮相关视图不重绘全部（矩阵/修复已可点选，这里只刷新工具与代码）
  }

  // ---------- 主观评分实验 ----------
  function statTile(label, value, sub) {
    var d = document.createElement("div"); d.className = "stat";
    var l = document.createElement("div"); l.className = "label"; l.textContent = label;
    var v = document.createElement("div"); v.className = "value"; v.textContent = value;
    var s = document.createElement("div"); s.className = "sub"; s.textContent = sub;
    d.appendChild(l); d.appendChild(v); d.appendChild(s);
    return d;
  }
  function renderSubjective() {
    if (!DATA.subjective) return;
    renderSubjKpi();
    renderSubjBars();
    renderSubjHist();
    renderSubjType();
    renderSubjForest();
    renderSubjRepeat();
  }
  function subjAllGroups() {
    return DATA.subjective.groups.filter(function (g) { return g.task_type === "all"; });
  }
  function renderSubjKpi() {
    var box = document.getElementById("subjKpi");
    box.innerHTML = "";
    var g = subjAllGroups();
    function mean(e) { var x = g.find(function (y) { return y.effort === e; }); return x ? x.mean_score_10 : null; }
    var full = DATA.subjective.primary_rows.filter(function (r) { return r.score_10 === 10; }).length;
    var tiles = [
      { l: "质量均分 Low", v: mean("low") == null ? "—" : mean("low").toFixed(2), s: "/10 · 120 份回答" },
      { l: "质量均分 High", v: mean("high") == null ? "—" : mean("high").toFixed(2), s: "/10 · 120 份回答" },
      { l: "质量均分 Ultra", v: mean("ultra") == null ? "—" : mean("ultra").toFixed(2), s: "/10 · 120 份回答" },
      { l: "满分回答占比", v: (full / DATA.subjective.primary_rows.length * 100).toFixed(1) + "%", s: full + "/" + DATA.subjective.primary_rows.length + " 份" },
    ];
    tiles.forEach(function (t) { box.appendChild(statTile(t.l, t.v, t.s)); });
  }
  function subjBar(id, vals, name, unit, isInt, ymin, ymax) {
    var p = pal();
    chart(id).setOption({
      backgroundColor: "transparent", textStyle: { color: p.text2 },
      title: { text: name, left: 0, top: 0, textStyle: { color: p.text1, fontSize: 12.5, fontWeight: 600 } },
      grid: { left: 8, right: 8, top: 26, bottom: 20, containLabel: true },
      xAxis: Object.assign(axisCategory(p), { data: SUBJ_EFFORTS.map(function (e) { return SUBJ_LABEL[e]; }) }),
      yAxis: Object.assign(axisValue(p), { name: unit, nameTextStyle: { color: p.muted }, min: ymin, max: ymax }),
      series: [{
        type: "bar", barWidth: 20,
        data: vals.map(function (v, i) { return { value: v, itemStyle: { color: p.seq[i], borderRadius: [4, 4, 0, 0] } }; }),
        label: { show: true, position: "top", color: p.text1, formatter: function (pr) { return isInt ? fmt(pr.value) : fmt1(pr.value); } },
      }],
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    }, true);
  }
  function renderSubjBars() {
    var g = subjAllGroups();
    function val(e, k) { var x = g.find(function (y) { return y.effort === e; }); return x ? x[k] : null; }
    subjBar("chartSubjScore", SUBJ_EFFORTS.map(function (e) { return val(e, "mean_score_10"); }), "质量均分（纵轴 9.0 起）", "/10", false, 9.0, 10.05);
    subjBar("chartSubjTime", SUBJ_EFFORTS.map(function (e) { return val(e, "median_elapsed_seconds"); }), "耗时中位数", "秒", false, 0, null);
    subjBar("chartSubjReason", SUBJ_EFFORTS.map(function (e) { return val(e, "mean_reasoning_tokens"); }), "平均推理 Token", "Token", true, 0, null);
  }
  function renderSubjHist() {
    var p = pal();
    var scores = DATA.subjective.primary_rows.map(function (r) { return r.score_10; }).filter(function (v) { return v != null; });
    var edges = [8.5, 8.75, 9.0, 9.25, 9.5, 9.75, 10.0];
    var counts = edges.map(function (e, i) {
      if (i === edges.length - 1) return scores.filter(function (v) { return v >= e; }).length;
      return scores.filter(function (v) { return v >= e && v < edges[i + 1]; }).length;
    });
    var labels = edges.map(function (e, i) { return i === edges.length - 1 ? "10.0" : e.toFixed(2); });
    chart("chartSubjHist").setOption({
      backgroundColor: "transparent", textStyle: { color: p.text2 },
      grid: { left: 8, right: 16, top: 20, bottom: 30, containLabel: true },
      xAxis: Object.assign(axisCategory(p), { data: labels, axisLabel: { color: p.text2, fontSize: 10 } }),
      yAxis: Object.assign(axisValue(p), { name: "回答数", nameTextStyle: { color: p.muted } }),
      series: [{
        type: "bar", barWidth: "60%",
        data: counts.map(function (c, i) { return { value: c, itemStyle: { color: i === counts.length - 1 ? STATUS.pass.color : p.series[0] } }; }),
        label: { show: true, position: "top", color: p.text1 },
      }],
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    }, true);
  }
  function renderSubjType() {
    var p = pal();
    var types = ["writing", "analysis", "planning"];
    var series = types.map(function (t, i) {
      return {
        name: SUBJ_TYPE_LABEL[t], type: "bar",
        data: SUBJ_EFFORTS.map(function (e) {
          var x = DATA.subjective.groups.find(function (y) { return y.task_type === t && y.effort === e; });
          return x ? x.mean_score_10 : null;
        }),
        itemStyle: { color: p.series[i] }, barWidth: 18,
        label: { show: true, position: "top", color: p.text1, fontSize: 10, formatter: function (pr) { return pr.value == null ? "" : pr.value.toFixed(2); } },
      };
    });
    chart("chartSubjType").setOption({
      backgroundColor: "transparent", textStyle: { color: p.text2 },
      legend: { top: 0, left: 0, textStyle: { color: p.text2 }, itemWidth: 12, itemHeight: 8 },
      grid: { left: 8, right: 16, top: 36, bottom: 24, containLabel: true },
      xAxis: Object.assign(axisCategory(p), { data: SUBJ_EFFORTS.map(function (e) { return SUBJ_LABEL[e]; }) }),
      yAxis: Object.assign(axisValue(p), { name: "/10", nameTextStyle: { color: p.muted }, min: 9.0, max: 10.08 }),
      series: series,
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    }, true);
  }
  function subjDiffs() {
    var byTask = {};
    DATA.subjective.primary_rows.forEach(function (r) {
      (byTask[r.task_id] = byTask[r.task_id] || {})[r.effort] = (byTask[r.task_id][r.effort] || []).concat(r.score_10);
    });
    var ids = Object.keys(byTask);
    function tm(tid, e) { var a = byTask[tid][e]; return a ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
    function diffs(a, b) {
      return ids.map(function (tid) { var x = tm(tid, a), y = tm(tid, b); return (x != null && y != null) ? x - y : null; }).filter(function (v) { return v != null; });
    }
    return diffs;
  }
  function bootCI(arr, n) {
    function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    var rand = rng(20261102); var means = [];
    for (var i = 0; i < n; i++) { var s = 0; for (var j = 0; j < arr.length; j++) s += arr[Math.floor(rand() * arr.length)]; means.push(s / arr.length); }
    means.sort(function (a, b) { return a - b; });
    return [means[Math.floor(n * 0.025)], means[Math.floor(n * 0.975)]];
  }
  function renderSubjForest() {
    var box = document.getElementById("chartSubjForest");
    var diffs = subjDiffs();
    var comps = [["high − low", "high", "low"], ["ultra − low", "ultra", "low"], ["ultra − high", "ultra", "high"]];
    var xmin = -0.05, xmax = 0.12;
    function pct(v) { return (v - xmin) / (xmax - xmin) * 100; }
    var rows = comps.map(function (c) {
      var d = diffs(c[1], c[2]);
      var mean = d.reduce(function (a, b) { return a + b; }, 0) / d.length;
      var ci = bootCI(d, 1000);
      return { name: c[0], mean: mean, ci: ci };
    });
    box.innerHTML = '<div class="forest">' + rows.map(function (r) {
      var l = pct(r.ci[0]), w = pct(r.ci[1]) - l;
      var val = (r.mean >= 0 ? "+" : "") + r.mean.toFixed(3) + " [" + r.ci[0].toFixed(3) + ", " + r.ci[1].toFixed(3) + "]";
      return [
        '<div class="frow">',
        '<span class="flabel">' + r.name + '</span>',
        '<span class="ftrack">',
        '<span class="fzero" style="left:' + pct(0).toFixed(2) + '%"></span>',
        '<span class="fci" style="left:' + l.toFixed(2) + '%;width:' + w.toFixed(2) + '%"></span>',
        '<span class="fdot" style="left:' + pct(r.mean).toFixed(2) + '%"></span>',
        '</span>',
        '<span class="fval">' + val + '</span>',
        '</div>'
      ].join("");
    }).join("") + '</div>';
  }
  function renderSubjRepeat() {
    var p = pal();
    var pts = DATA.subjective.repeat_scores.map(function (r) { return { value: [r.primary_score_10, r.score_10], run_id: r.run_id, diff: r.absolute_difference }; });
    var lo = 8.5, hi = 10.05;
    chart("chartSubjRepeat").setOption({
      backgroundColor: "transparent", textStyle: { color: p.text2 },
      tooltip: { trigger: "item", formatter: function (pr) { return "<strong>" + pr.data.run_id + "</strong><br/>主评分 " + pr.value[0] + " → 复评分 " + pr.value[1] + "<br/>绝对差 " + pr.data.diff.toFixed(3); } },
      grid: { left: 8, right: 20, top: 20, bottom: 26, containLabel: true },
      xAxis: Object.assign(axisValue(p), { name: "原主评分 /10", nameTextStyle: { color: p.muted }, min: lo, max: hi }),
      yAxis: Object.assign(axisValue(p), { name: "复评分 /10", nameTextStyle: { color: p.muted }, min: lo, max: hi }),
      series: [{
        type: "scatter", data: pts, symbolSize: 10,
        itemStyle: { color: p.series[0], opacity: 0.75, borderColor: p.surface, borderWidth: 1.5 },
        markLine: {
          silent: true, symbol: "none", lineStyle: { color: p.muted, type: "dashed", width: 1 },
          label: { show: true, formatter: "y = x", position: "end", color: p.muted },
          data: [[{ coord: [lo, lo] }, { coord: [hi, hi] }]],
        },
      }],
    }, true);
  }
  function resizeSubj() {
    ["chartSubjScore", "chartSubjTime", "chartSubjReason", "chartSubjHist", "chartSubjType", "chartSubjRepeat"].forEach(function (id) { if (charts[id]) charts[id].resize(); });
  }

  // ---------- 主题 / 标签 / 事件 ----------
  function initTheme() {
    var saved = localStorage.getItem("codedepth-theme");
    var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }
  function resizePanel(panelId) {
    var ids = panelId === "tab-primary" ? ["chartMatrix", "chartDiffBox", "chartDiffScatter"]
      : panelId === "tab-repair" ? CASE_TASKS.map(function (t) { return "chartRepair_" + t; }) : [];
    ids.forEach(function (id) { if (charts[id]) charts[id].resize(); });
  }

  document.getElementById("themeToggle").addEventListener("click", function () {
    var dark = isDark();
    document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
    localStorage.setItem("codedepth-theme", dark ? "light" : "dark");
    renderAll();
    resizePanel(state.tab);
  });
  document.getElementById("matrixMetric").addEventListener("change", function (e) { state.metric = e.target.value; renderMatrix(); });
  document.getElementById("onlyFailed").addEventListener("change", function (e) { state.onlyFailed = e.target.checked; renderMatrix(); });
  document.getElementById("diffCompare").addEventListener("change", function (e) { state.compare = e.target.value; renderDiffScatter(); });

  document.querySelectorAll(".exp-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".exp-btn").forEach(function (x) { x.classList.remove("active"); });
      btn.classList.add("active");
      state.exp = btn.getAttribute("data-exp");
      document.getElementById("exp-coding").style.display = state.exp === "coding" ? "" : "none";
      document.getElementById("exp-subjective").style.display = state.exp === "subjective" ? "" : "none";
      if (state.exp === "subjective") {
        if (!renderedSubj) { renderedSubj = true; renderSubjective(); }
        else setTimeout(resizeSubj, 0);
      }
      if (state.exp === "coding") setTimeout(function () { resizePanel(state.tab); }, 0);
    });
  });

  var tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabBtns.forEach(function (x) { x.classList.remove("active"); });
      btn.classList.add("active");
      state.tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".panel").forEach(function (pn) { pn.classList.remove("active"); });
      document.getElementById(state.tab).classList.add("active");
      if (state.tab === "tab-repair" && !renderedRepair) { renderedRepair = true; renderRepair(); }
      setTimeout(function () { resizePanel(state.tab); }, 0);
    });
  });
  window.addEventListener("resize", function () { Object.keys(charts).forEach(function (k) { charts[k].resize(); }); });

  if (typeof echarts === "undefined") {
    document.getElementById("dataBanner").className = "banner synthetic";
    document.getElementById("dataBanner").innerHTML = "<strong>ECharts 未加载</strong> · 请联网后刷新，或下载 echarts.min.js 到本地替换 CDN 引用。";
  }

  initTheme();
  renderAll();
  resizePanel(state.tab);
})();
