(() => {
  const viewNames = {
    overview: "01 / OVERVIEW",
    assets: "02 / ASSETS",
    policies: "03 / POLICIES",
    audit: "04 / AUDIT",
    redaction: "05 / REDACTION",
  };

  const navButtons = [...document.querySelectorAll("[data-view]")];
  const views = [...document.querySelectorAll("[data-view-panel]")];
  const currentSection = document.getElementById("current-section");
  const menuToggle = document.getElementById("menu-toggle");
  const navScrim = document.getElementById("nav-scrim");
  const csrfToken = document.querySelector('meta[name="agent-canary-csrf"]')?.content || "";
  let backendConnected = false;
  let backendApiState = null;
  let backendRuntimeState = null;
  let backendPolicyState = null;

  function closeMenu() {
    document.body.classList.remove("nav-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "打开导航");
    if (navScrim) navScrim.hidden = true;
  }

  function showView(name) {
    if (!viewNames[name]) return;
    for (const button of navButtons) {
      const active = button.dataset.view === name;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    for (const view of views) {
      const active = view.dataset.viewPanel === name;
      view.classList.toggle("is-visible", active);
      view.hidden = !active;
    }
    if (currentSection) currentSection.textContent = viewNames[name];
    closeMenu();
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  for (const button of navButtons) button.addEventListener("click", () => showView(button.dataset.view));
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-open-audit]");
    if (!button) return;
    showView("audit");
    selectAudit(button.dataset.openAudit);
  });

  menuToggle?.addEventListener("click", () => {
    const open = !document.body.classList.contains("nav-open");
    document.body.classList.toggle("nav-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
    if (navScrim) navScrim.hidden = !open;
  });
  navScrim?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  const assetRows = [...document.querySelectorAll("[data-asset-row]")];
  const assetSearch = document.getElementById("asset-search");
  let activeAssetFilter = "all";

  function filterAssets() {
    const query = (assetSearch?.value || "").trim().toLocaleLowerCase();
    for (const row of assetRows) {
      const categoryMatches = activeAssetFilter === "all" || row.dataset.category === activeAssetFilter;
      const queryMatches = !query || row.textContent.toLocaleLowerCase().includes(query);
      row.hidden = !(categoryMatches && queryMatches);
    }
  }

  document.querySelectorAll("[data-asset-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeAssetFilter = button.dataset.assetFilter;
      document.querySelectorAll("[data-asset-filter]").forEach((chip) => {
        const selected = chip === button;
        chip.classList.toggle("is-selected", selected);
        chip.setAttribute("aria-pressed", String(selected));
      });
      filterAssets();
    });
  });
  assetSearch?.addEventListener("input", filterAssets);

  function selectAsset(row) {
    assetRows.forEach((candidate) => candidate.classList.toggle("is-selected", candidate === row));
    const bindings = {
      "asset-dossier-id": row.dataset.id,
      "asset-inspector-title": row.dataset.name,
      "asset-dossier-name": row.dataset.name,
      "asset-dossier-type": row.dataset.type,
      "asset-dossier-boundary": row.dataset.boundary,
      "asset-dossier-state": row.dataset.state,
    };
    for (const [id, value] of Object.entries(bindings)) {
      const target = document.getElementById(id);
      if (target) target.textContent = value || "—";
    }
  }
  assetRows.forEach((row) => {
    row.addEventListener("click", () => selectAsset(row));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectAsset(row);
      }
    });
  });

  const policyDetails = {
    registration: {
      title: "宿主登记边界",
      copy: "Agent Canary 的保护范围由宿主注册并经 Gateway / Guard 路由的回调决定。",
    },
    approval: {
      title: "高风险审批路径",
      copy: "示例展示策略要求额外审批时的流程概念；实际审批依赖后端配置和宿主身份验证。",
    },
    signal: {
      title: "Canary 信号处置",
      copy: "诱饵与 Canary 信号可进入记录或隔离路径；本页没有触发真实信号，也没有执行隔离。",
    },
  };
  document.querySelectorAll("[data-policy-select]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-policy-select]").forEach((item) => item.classList.toggle("is-selected", item === button));
      const detail = policyDetails[button.dataset.policySelect];
      if (detail) {
        document.getElementById("policy-detail-title").textContent = detail.title;
        document.getElementById("policy-detail-copy").textContent = detail.copy;
      }
    });
  });

  const policyToggles = [...document.querySelectorAll("[data-policy-toggle]")];
  const policyJson = document.getElementById("policy-json");
  const policyState = document.getElementById("policy-state");
  function updatePolicyPreview() {
    const preview = {
      mode: "static-preview",
      registeredCallbacksOnly: Boolean(document.querySelector('[data-policy-toggle="registeredCallbacks"]')?.checked),
      approvalRequiredForHighRisk: Boolean(document.querySelector('[data-policy-toggle="approvalRequired"]')?.checked),
      quarantineOnCanarySignal: Boolean(document.querySelector('[data-policy-toggle="quarantineOnSignal"]')?.checked),
      runtimeConnected: false,
    };
    if (policyJson) policyJson.textContent = JSON.stringify(preview, null, 2);
    if (policyState) policyState.innerHTML = '<span class="status-dot"></span>本地预览状态 · 未发送网络请求';
  }
  policyToggles.forEach((toggle) => toggle.addEventListener("change", updatePolicyPreview));

  const auditRows = [...document.querySelectorAll("[data-audit-row]")];
  const auditFilter = document.getElementById("audit-filter");
  const auditDetails = {
    "EVT-D01": { type: "Decoy tool interaction", call: "未执行 · 静态说明", policy: "没有真实决策记录", signal: "合成样例，不代表已触发", isolation: "未运行隔离操作" },
    "EVT-D02": { type: "Policy deny preview", call: "没有 MCP 调用", policy: "仅显示策略示意", signal: "未触发", isolation: "未运行隔离操作" },
    "EVT-D03": { type: "Canary signal fixture", call: "没有 MCP 调用", policy: "没有真实决策记录", signal: "合成样例，不代表已触发", isolation: "未运行隔离操作" },
    "EVT-D04": { type: "Unregistered callback", call: "没有工具调用", policy: "仅用于说明宿主登记边界", signal: "未触发", isolation: "未运行隔离操作" },
    "EVT-D05": { type: "Approval requested", call: "没有 MCP 调用", policy: "审批流程概念展示", signal: "未触发", isolation: "未运行隔离操作" },
    "EVT-D06": { type: "Text minimization preview", call: "浏览器本地字符串操作", policy: "无运行时策略决策", signal: "未触发", isolation: "不涉及隔离" },
  };
  let selectedAuditId = "EVT-D01";
  let auditAcknowledged = false;

  const eventLabels = {
    decoy_called: "Decoy tool called",
    token_found: "Canary token found",
    session_tripped: "Session signal recorded",
    session_quarantined: "Session quarantined",
    credential_revocation_requested: "Credential revocation requested",
    credential_revocation_failed: "Credential revocation failed",
    action_blocked: "Action blocked",
    session_reset: "Session reset",
    policy_allowed: "Policy allowed",
    policy_blocked: "Policy blocked",
    policy_approval_required: "Approval required",
    policy_approval_granted: "Approval granted",
    test: "Test event",
  };

  function auditCategory(kind) {
    if (["decoy_called", "token_found", "session_tripped", "session_quarantined"].includes(kind)) return "signal";
    if (kind.startsWith("policy_") || kind === "action_blocked") return "policy";
    return "boundary";
  }

  function makeCell(className, content, tagName = "td") {
    const cell = document.createElement(tagName);
    if (className) cell.className = className;
    cell.textContent = content;
    return cell;
  }

  function renderBackendEvents(events) {
    const eventList = document.getElementById("overview-events");
    const sourceNote = document.getElementById("overview-event-source");
    const auditNote = document.getElementById("audit-source-note");
    const auditBody = document.getElementById("audit-rows");
    if (!Array.isArray(events) || events.length === 0) {
      if (sourceNote) sourceNote.textContent = "本机 API 已连接；最近 100 条记录中没有事件。列表保留合成样例。";
      if (auditNote) auditNote.textContent = "本机 API 已连接；最近 100 条记录为空。下表保留合成事件样例，不代表历史全量。";
      return;
    }

    const recent = events.slice(-6).reverse();
    const eventFragment = document.createDocumentFragment();
    const auditFragment = document.createDocumentFragment();
    const total = events.length;
    recent.forEach((event, index) => {
      const kind = typeof event.kind === "string" ? event.kind : "test";
      const id = `ROW-${String(total - index).padStart(3, "0")}`;
      const label = eventLabels[kind] || "Recorded security event";
      const category = auditCategory(kind);
      const tool = typeof event.toolName === "string" ? event.toolName : "";
      const timestamp = typeof event.ts === "string" ? event.ts : "时间字段未记录";
      const signal = kind === "token_found"
        ? "后端日志记录 token_found；Token 内容不会展示。"
        : kind === "decoy_called"
          ? "后端日志记录 decoy_called；此记录本身不证明发现 Token。"
          : "此记录不属于 Canary 信号事件。";
      auditDetails[id] = {
        type: label,
        call: tool ? `后端日志工具字段：${tool}` : "日志没有工具名称字段",
        policy: kind.startsWith("policy_") || kind === "action_blocked" ? `后端记录类型：${kind}` : "此记录不包含独立策略决策字段",
        signal,
        isolation: kind === "session_quarantined" ? "日志记录到 session_quarantined" : "本条记录未包含隔离事件",
      };

      const listItem = document.createElement("li");
      listItem.className = "event-row";
      const origin = makeCell("event-severity event-severity--recorded", "LOCAL", "span");
      const text = document.createElement("span");
      text.className = "event-row__text";
      const title = document.createElement("strong");
      title.textContent = label;
      const subtitle = document.createElement("small");
      subtitle.textContent = tool ? `工具：${tool}` : timestamp;
      text.append(title, subtitle);
      const code = makeCell("", id, "code");
      const inspect = makeCell("text-action", "查看", "button");
      inspect.type = "button";
      inspect.dataset.openAudit = id;
      listItem.append(origin, text, code, inspect);
      eventFragment.append(listItem);

      const row = document.createElement("tr");
      row.tabIndex = 0;
      row.dataset.auditRow = "";
      row.dataset.auditId = id;
      row.dataset.auditKind = category;
      row.addEventListener("click", () => selectAudit(id));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectAudit(id);
        }
      });
      row.append(
        makeCell("", timestamp),
        makeCell("", tool ? `${label} · ${tool}` : label),
        makeCell("", "Agent Canary backend log"),
      );
      const resultCell = document.createElement("td");
      const tag = document.createElement("span");
      tag.className = "tag tag--olive";
      tag.textContent = "RECORDED";
      resultCell.append(tag);
      row.append(resultCell, makeCell("", id));
      auditFragment.append(row);
    });

    eventList.replaceChildren(eventFragment);
    auditBody.replaceChildren(auditFragment);
    document.getElementById("audit-stream-title").textContent = "本机事件时间线";
    document.getElementById("incident-source-tag").textContent = "LOCAL API";
    document.getElementById("incident-source-tag").className = "tag tag--olive";
    document.getElementById("incident-record-id").textContent = "API SNAPSHOT";
    document.getElementById("incident-record-scope").textContent = "LATEST 100 / NOT LIVE TELEMETRY";
    document.getElementById("incident-heading").textContent = "本机审计日志快照";
    document.getElementById("incident-subheading").textContent = "来自本机控制台 API 的有界记录 · 不是实时 Agent 监控或事件取证结论";
    document.getElementById("incident-state-label").innerHTML = "本机快照<br><small>NOT LIVE</small>";
    document.querySelector(".incident-banner__state .status-dot")?.classList.remove("status-dot--rust");
    document.getElementById("export-audit").textContent = "导出本机审计快照";
    document.getElementById("audit-export-status").textContent = "导出本机 API 返回的最近 100 条事件";
    document.querySelector(".priority-count").textContent = String(recent.length).padStart(2, "0");
    if (sourceNote) sourceNote.textContent = `本机事件日志 · 展示最近 ${recent.length} 条（API 返回 ${total} 条，最多 100 条）。`;
    if (auditNote) auditNote.textContent = `真实本机后端日志 · 共显示 ${total} 条（API 范围：${backendApiState?.countScope || "接口限定记录"}）。`;
    filterAudit();
    selectAudit(recent.length ? `ROW-${String(total).padStart(3, "0")}` : "EVT-D01");
  }

  function filterAudit() {
    const kind = auditFilter?.value || "all";
    for (const row of document.querySelectorAll("[data-audit-row]")) row.hidden = kind !== "all" && row.dataset.auditKind !== kind;
  }
  auditFilter?.addEventListener("change", filterAudit);

  function selectAudit(id) {
    const row = [...document.querySelectorAll("[data-audit-row]")].find((candidate) => candidate.dataset.auditId === id);
    if (!row) return;
    selectedAuditId = id;
    auditAcknowledged = false;
    document.querySelectorAll("[data-audit-row]").forEach((candidate) => candidate.classList.toggle("is-selected", candidate === row));
    const detail = auditDetails[id];
    const cells = row.querySelectorAll("td");
    document.getElementById("audit-record-id").textContent = id;
    document.getElementById("audit-record-type").textContent = detail.type;
    document.getElementById("audit-record-call").textContent = detail.call;
    document.getElementById("audit-record-policy").textContent = detail.policy;
    document.getElementById("audit-record-signal").textContent = detail.signal;
    document.getElementById("audit-record-isolation").textContent = detail.isolation;
    document.getElementById("audit-ack-state").textContent = "未确认 · 本地演示";
    const filter = row.dataset.auditKind;
    if (auditFilter && auditFilter.value !== "all" && auditFilter.value !== filter) {
      auditFilter.value = "all";
      filterAudit();
    }
    if (cells.length) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  auditRows.forEach((row) => {
    row.addEventListener("click", () => selectAudit(row.dataset.auditId));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectAudit(row.dataset.auditId);
      }
    });
  });
  document.getElementById("ack-audit")?.addEventListener("click", () => {
    auditAcknowledged = !auditAcknowledged;
    document.getElementById("audit-ack-state").textContent = auditAcknowledged ? "已查看 · 当前页面状态" : "未确认 · 本地演示";
    document.getElementById("ack-audit").textContent = auditAcknowledged ? "取消本地标记" : "在本页标记已查看";
  });
  document.getElementById("export-audit")?.addEventListener("click", async () => {
    let payload;
    let filename;
    if (backendConnected) {
      try {
        const state = await backendApiGet("/api/state");
        payload = {
          kind: "agent-canary-local-backend-audit-snapshot",
          synthetic: false,
          scope: state.countScope || "后端接口限定的记录范围",
          exportedAt: new Date().toISOString(),
          counts: state.counts || {},
          events: Array.isArray(state.events) ? state.events : [],
          disclaimer: "从本机控制台读取的审计事件；仅包含接口返回范围，不能代表更早的完整历史。",
        };
        filename = "agent-canary-local-audit-snapshot.json";
      } catch {
        document.getElementById("audit-export-status").textContent = "本机连接已中断；没有导出静态样例替代真实日志。";
        return;
      }
    } else {
      payload = {
        kind: "agent-canary-static-demo-export",
        synthetic: true,
        disclaimer: "合成界面样例，不是运行时日志、取证材料、真实事件或安全结论。",
        runtimeConnected: false,
        exportedAt: new Date().toISOString(),
        records: [...document.querySelectorAll("[data-audit-row]")].map((row) => ({ id: row.dataset.auditId, type: auditDetails[row.dataset.auditId]?.type || "Demo sample", category: row.dataset.auditKind, synthetic: true })),
      };
      filename = "agent-canary-synthetic-demo-audit.json";
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    document.getElementById("audit-export-status").textContent = backendConnected ? "已导出本机后端返回的事件快照；范围受接口限制。" : "已在本地生成合成演示 JSON；不包含运行时日志。";
  });

  const redactionInput = document.getElementById("redaction-input");
  const redactionSource = document.getElementById("redaction-source");
  const redactionOutput = document.getElementById("redaction-output");
  const initialSyntheticText = redactionInput?.value || "";
  function runRedactionPreview() {
    const source = redactionInput?.value || "";
    const preview = source
      .replace(/\b([A-Z0-9._%+-])[A-Z0-9._%+-]*@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi, "$1***@$2")
      .replace(/\bUSER-DEMO-[A-Z0-9-]+\b/gi, "USER-DEMO-[REDACTED]")
      .replace(/\bCANARY-DEMO-[A-Z0-9-]+\b/gi, "CANARY-[REDACTED]");
    if (redactionSource) redactionSource.textContent = source || "（空白输入）";
    if (redactionOutput) redactionOutput.textContent = preview || "（空白输入）";
  }
  document.getElementById("run-redaction")?.addEventListener("click", runRedactionPreview);
  document.getElementById("reset-redaction")?.addEventListener("click", () => {
    if (redactionInput) redactionInput.value = initialSyntheticText;
    runRedactionPreview();
  });

  function isLocalWorkbenchBackend() {
    const localHost = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(window.location.hostname);
    return localHost && window.location.pathname.startsWith("/workbench/") && csrfToken.length >= 32;
  }

  async function backendApiGet(route) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(route, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "x-canary-csrf": csrfToken },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`LOCAL_API_HTTP_${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function backendApiPost(route, payload) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(route, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "x-canary-csrf": csrfToken },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`LOCAL_API_HTTP_${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function connectToLocalBackend() {
    if (!isLocalWorkbenchBackend()) return;
    const strip = document.getElementById("backend-connection");
    const statusTitle = document.getElementById("backend-status-title");
    const statusCopy = document.getElementById("backend-status-copy");
    const modeLabel = document.getElementById("backend-mode");
    const link = document.getElementById("backend-link");
    strip.dataset.state = "connecting";
    statusTitle.textContent = "正在连接本机控制台 API";
    statusCopy.textContent = "只读取本机隔离运行时、策略沙箱和接口范围内的记录。";
    modeLabel.textContent = "LOOPBACK / SAME ORIGIN";

    try {
      const [apiState, runtimeState, policyState] = await Promise.all([
        backendApiGet("/api/state"),
        backendApiGet("/api/runtime3"),
        backendApiGet("/api/policy/state"),
      ]);
      backendConnected = true;
      backendApiState = apiState;
      backendRuntimeState = runtimeState;
      backendPolicyState = policyState;
      strip.dataset.state = "connected";
      statusTitle.textContent = "本机后端已连接 · 只读数据快照";
      statusCopy.textContent = "已读取本机控制台 API；刷新页面可重新读取。没有在此页面执行工具操作。";
      modeLabel.textContent = "LOOPBACK / SAME ORIGIN";
      link.href = `${window.location.pathname}${window.location.search}`;
      link.target = "_self";
      link.textContent = "刷新数据 ↻";
      document.getElementById("runtime-badge-label").textContent = "本机隔离演示运行时";
      document.getElementById("export-audit").textContent = "导出本机审计快照";
      document.getElementById("audit-export-status").textContent = "导出本机 API 返回的最近 100 条事件";
      document.getElementById("demo-notice-title").textContent = "本机只读连接已启用。";
      document.getElementById("demo-notice-copy").textContent = Array.isArray(apiState.events) && apiState.events.length
        ? "资产、图表和策略开关仍为演示样例；右侧事件流来自本机 API 最近 100 条记录。Gateway 按钮只读临时文件，不监控宿主 Agent。"
        : "资产、图表和策略开关仍为演示样例；本机 API 最近 100 条记录为空，事件列表保留合成样例。Gateway 按钮只读临时文件，不监控宿主 Agent。";

      const metrics = document.getElementById("backend-metrics");
      metrics.hidden = false;
      document.getElementById("backend-runtime-state").textContent = runtimeState.mode === "DEMO_REAL_TEMPORARY_FILE_IO_NO_AGENT_MODEL" ? "LOCAL SANDBOX" : String(runtimeState.mode || "CONNECTED");
      document.getElementById("backend-guard-state").textContent = String(runtimeState.guard || "UNKNOWN");
      document.getElementById("backend-evidence-count").textContent = String(Array.isArray(runtimeState.evidence) ? runtimeState.evidence.length : 0);
      document.getElementById("backend-event-count").textContent = `${Array.isArray(apiState.events) ? apiState.events.length : 0} / 100`;
      document.getElementById("backend-metrics-scope").textContent = `当前页读取快照 · ${apiState.countScope || "接口限定范围"} · 临时文件沙箱，不是生产 Agent 遥测。`;
      const policyCurrent = document.getElementById("policy-backend-current");
      policyCurrent.hidden = false;
      document.getElementById("policy-backend-mode").textContent = `${policyState.mode || "UNKNOWN"} · VIRTUAL SANDBOX`;
      document.getElementById("backend-demo-controls").hidden = false;
      renderBackendEvents(Array.isArray(apiState.events) ? apiState.events : []);
    } catch {
      backendConnected = false;
      strip.dataset.state = "error";
      statusTitle.textContent = "本机工作台已打开，但 API 读取失败";
      statusCopy.textContent = "请检查控制台进程状态后刷新页面；未用合成结果替代后端数据。";
      modeLabel.textContent = "LOCAL API / UNAVAILABLE";
      link.href = `${window.location.pathname}${window.location.search}`;
      link.target = "_self";
      link.textContent = "重试连接 ↻";
    }
  }

  document.getElementById("run-local-demo")?.addEventListener("click", async (event) => {
    if (!backendConnected) return;
    const button = event.currentTarget;
    const output = document.getElementById("backend-demo-result");
    button.disabled = true;
    button.textContent = "正在读取临时样例…";
    try {
      const runtime = await backendApiPost("/api/runtime3/action", { action: "read" });
      backendRuntimeState = runtime;
      const evidenceCount = Array.isArray(runtime.evidence) ? runtime.evidence.length : 0;
      document.getElementById("backend-guard-state").textContent = String(runtime.guard || "UNKNOWN");
      document.getElementById("backend-evidence-count").textContent = String(evidenceCount);
      output.hidden = false;
      output.textContent = JSON.stringify({
        source: "Agent Canary localhost backend",
        mode: runtime.mode,
        coverage: runtime.coverage,
        guard: runtime.guard,
        evidenceRecordsReturned: evidenceCount,
        gatewayResponsePresent: Object.prototype.hasOwnProperty.call(runtime, "lastResult"),
        scope: "one read-only call against a temporary synthetic file",
      }, null, 2);
      document.getElementById("backend-status-copy").textContent = "本机沙箱只读调用已返回；显示的是后端运行时响应快照。";
    } catch {
      output.hidden = false;
      output.textContent = "本机后端调用失败；没有回退为合成结果。请查看控制台进程状态后重试。";
    } finally {
      button.disabled = false;
      button.textContent = "再次执行只读调用";
    }
  });

  showView("overview");
  connectToLocalBackend();
})();
