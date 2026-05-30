// ============================================================
// 博客应用逻辑 - 路由、渲染、搜索、主题切换
// ============================================================

(function () {
  "use strict";

  // ========== DOM 引用缓存 ==========
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const mainContent = $("#main-content");
  const navLinks = $("#nav-links");
  const footerText = $("#footer-text");
  const searchOverlay = $("#search-overlay");
  const searchInput = $("#search-input");
  const searchResults = $("#search-results");
  const themeToggle = $("#theme-toggle");
  const menuToggle = $("#menu-toggle");
  const backToTop = $("#back-to-top");
  const siteName = $("#site-name");

  // ========== 工具函数 ==========

  /** 估算阅读时间 */
  function readTime(text) {
    const words = text.replace(/[\s]/g, "").length;
    const minutes = Math.max(1, Math.ceil(words / 400)); // 中文 ~400字/分钟
    return minutes + " 分钟阅读";
  }

  /** 格式化日期 */
  function fmtDate(dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "年" + m + "月" + day + "日";
  }

  /** Markdown 渲染（带缓存） */
  const mdCache = {};
  function renderMarkdown(text) {
    if (mdCache[text]) return mdCache[text];
    let html;
    if (typeof marked !== "undefined" && marked.parse) {
      html = marked.parse(text);
    } else {
      html = escapeHtml(text).replace(/\n/g, "<br>");
    }
    mdCache[text] = html;
    return html;
  }

  /** HTML 转义 */
  function escapeHtml(str) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return str.replace(/[&<>"']/g, (c) => map[c]);
  }

  /** 生成唯一标签列表 */
  function getAllTags() {
    const tags = new Set();
    getPosts().forEach((p) => p.tags.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }

  // ========== 数据层：合并 content.js + localStorage ==========
  // 这样你就可以在网页管理面板中增删改内容，数据保存在浏览器里

  function loadFromStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      showToast("保存失败：浏览器存储空间不足");
    }
  }

  function getPosts() {
    const custom = loadFromStorage("blog_custom_posts") || [];
    const removed = loadFromStorage("blog_removed_posts") || [];
    // 合并：自定义文章 + 内置文章（排除已删除的）
    const builtIn = (typeof blogPosts !== "undefined" ? blogPosts : []).filter(
      (p) => !removed.includes(p.id)
    );
    return [...custom, ...builtIn];
  }

  function getProblems() {
    const custom = loadFromStorage("blog_custom_problems") || [];
    const removed = loadFromStorage("blog_removed_problems") || [];
    const builtIn = (typeof lifeProblems !== "undefined" ? lifeProblems : []).filter(
      (p) => !removed.includes(p.id)
    );
    return [...custom, ...builtIn];
  }

  function getConfig() {
    const custom = loadFromStorage("blog_custom_config") || {};
    const builtIn = typeof siteConfig !== "undefined" ? siteConfig : {};
    return Object.assign({}, builtIn, custom);
  }

  function addPost(post) {
    const custom = loadFromStorage("blog_custom_posts") || [];
    custom.unshift(post);
    saveToStorage("blog_custom_posts", custom);
  }

  function updatePost(id, updates) {
    // 先尝试在自定义文章中找
    const custom = loadFromStorage("blog_custom_posts") || [];
    const idx = custom.findIndex((p) => p.id === id);
    if (idx !== -1) {
      custom[idx] = Object.assign({}, custom[idx], updates);
      saveToStorage("blog_custom_posts", custom);
      return true;
    }
    // 如果是内置文章，把它复制到自定义中修改
    const builtIn = (typeof blogPosts !== "undefined" ? blogPosts : []).find((p) => p.id === id);
    if (builtIn) {
      const modified = Object.assign({}, builtIn, updates);
      custom.unshift(modified);
      saveToStorage("blog_custom_posts", custom);
      return true;
    }
    return false;
  }

  function deletePost(id) {
    // 自定义文章：直接删除
    const custom = loadFromStorage("blog_custom_posts") || [];
    const filteredCustom = custom.filter((p) => p.id !== id);
    if (filteredCustom.length !== custom.length) {
      saveToStorage("blog_custom_posts", filteredCustom);
      return true;
    }
    // 内置文章：加入删除名单
    const removed = loadFromStorage("blog_removed_posts") || [];
    if (!removed.includes(id)) {
      removed.push(id);
      saveToStorage("blog_removed_posts", removed);
      return true;
    }
    return false;
  }

  function addProblem(problem) {
    const custom = loadFromStorage("blog_custom_problems") || [];
    custom.unshift(problem);
    saveToStorage("blog_custom_problems", custom);
  }

  function updateProblem(id, updates) {
    const custom = loadFromStorage("blog_custom_problems") || [];
    const idx = custom.findIndex((p) => p.id === id);
    if (idx !== -1) {
      custom[idx] = Object.assign({}, custom[idx], updates);
      saveToStorage("blog_custom_problems", custom);
      return true;
    }
    const builtIn = (typeof lifeProblems !== "undefined" ? lifeProblems : []).find(
      (p) => p.id === id
    );
    if (builtIn) {
      const modified = Object.assign({}, builtIn, updates);
      custom.unshift(modified);
      saveToStorage("blog_custom_problems", custom);
      return true;
    }
    return false;
  }

  function deleteProblem(id) {
    const custom = loadFromStorage("blog_custom_problems") || [];
    const filtered = custom.filter((p) => p.id !== id);
    if (filtered.length !== custom.length) {
      saveToStorage("blog_custom_problems", filtered);
      return true;
    }
    const removed = loadFromStorage("blog_removed_problems") || [];
    if (!removed.includes(id)) {
      removed.push(id);
      saveToStorage("blog_removed_problems", removed);
      return true;
    }
    return false;
  }

  function saveConfig(config) {
    saveToStorage("blog_custom_config", config);
  }

  /** 获取当前路由 */
  function getRoute() {
    const hash = location.hash.slice(1) || "/";
    return hash;
  }

  /** 解析路由 */
  function parseRoute() {
    const route = getRoute();
    // /posts/hello-world → { page: "post", id: "hello-world" }
    // /problems → { page: "problems" }
    // /about → { page: "about" }
    // / → { page: "home" }
    const parts = route.split("/").filter(Boolean);
    if (parts.length === 0) return { page: "home" };
    if (parts[0] === "posts" && parts[1]) return { page: "post", id: parts[1] };
    if (parts[0] === "posts") return { page: "posts" };
    if (parts[0] === "problems") return { page: "problems" };
    if (parts[0] === "about") return { page: "about" };
    if (parts[0] === "tag" && parts[1]) return { page: "tag", tag: decodeURIComponent(parts[1]) };
    if (parts[0] === "admin") return { page: "admin" };
    return { page: "home" };
  }

  // ========== 导航栏渲染 ==========

  function renderNav() {
    const cfg = getConfig();
    siteName.textContent = cfg.name;
    navLinks.innerHTML = cfg.navLinks
      .map(
        (link) =>
          `<a href="${link.href}" data-route="${link.href}">${link.label}</a>`
      )
      .join("");

    footerText.textContent = cfg.footer;

    // 高亮当前导航
    updateNavActive();
  }

  function updateNavActive() {
    const route = getRoute();
    $$(".nav-links a").forEach((a) => {
      const href = a.getAttribute("data-route") || "";
      if (route === "/" && href === "#/") {
        a.classList.add("active");
      } else if (href !== "#/" && route.startsWith(href.replace("#/", "/"))) {
        a.classList.add("active");
      } else {
        a.classList.remove("active");
      }
    });
  }

  // ========== 页面渲染 ==========

  function renderPage() {
    const { page, id, tag } = parseRoute();
    window.scrollTo({ top: 0, behavior: "instant" });
    closeSearch();
    closeMenu();

    switch (page) {
      case "home":
        renderHome();
        break;
      case "posts":
        renderHome();
        break;
      case "post":
        renderPost(id);
        break;
      case "problems":
        renderProblems();
        break;
      case "about":
        renderAbout();
        break;
      case "tag":
        renderHome(tag);
        break;
      case "admin":
        renderAdmin();
        break;
      default:
        renderHome();
    }

    updateNavActive();
  }

  // ========== 首页 ==========

  function renderHome(activeTag) {
    const cfg = getConfig();
    let posts = [...getPosts()];
    // 置顶文章优先
    posts.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    let filteredPosts = posts;
    if (activeTag) {
      filteredPosts = posts.filter((p) => p.tags.includes(activeTag));
    }

    const tags = getAllTags();
    const tagFilterHtml =
      tags.length > 0
        ? `<div class="tag-filter">
            <button class="tag-filter-btn ${!activeTag ? "active" : ""}" data-tag="">全部</button>
            ${tags
              .map(
                (t) =>
                  `<button class="tag-filter-btn ${activeTag === t ? "active" : ""}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`
              )
              .join("")}
          </div>`
        : "";

    const postCards =
      filteredPosts.length > 0
        ? filteredPosts
            .map(
              (p) => `
          <article class="post-card fade-in ${p.pinned ? "pinned" : ""}">
            <div class="post-meta">
              ${p.pinned ? '<span class="pin-badge">📌 置顶</span>' : ""}
              <span class="post-date">${fmtDate(p.date)}</span>
              <span class="post-readtime">${readTime(p.content)}</span>
            </div>
            <h2><a href="#/posts/${p.id}">${escapeHtml(p.title)}</a></h2>
            <p class="post-excerpt">${escapeHtml(p.excerpt || p.content.replace(/[#*`\n\[\]()>|\\-]/g, "").slice(0, 100) + "...")}</p>
            <div class="post-tags">
              ${p.tags.map((t) => `<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join("")}
            </div>
          </article>`
            )
            .join("")
        : `<div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p>${activeTag ? "该标签下暂无文章" : "还没有文章，快去写第一篇吧 ✍️"}</p>
          </div>`;

    mainContent.innerHTML = `
      <section class="hero">
        <h1>${escapeHtml(cfg.description)}</h1>
        <p>${escapeHtml(cfg.author)}</p>
      </section>
      ${tagFilterHtml}
      <div class="post-list">${postCards}</div>`;

    // 绑定事件：标签筛选
    $$(".tag-filter-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const t = this.dataset.tag;
        if (t) {
          location.hash = "#/tag/" + encodeURIComponent(t);
        } else {
          location.hash = "#/";
        }
      });
    });

    // 绑定事件：卡片上的标签点击
    $$(".post-card .tag, .article-meta .tag").forEach((tagEl) => {
      tagEl.addEventListener("click", function (e) {
        e.preventDefault();
        const t = this.dataset.tag;
        location.hash = "#/tag/" + encodeURIComponent(t);
      });
    });
  }

  // ========== 文章详情页 ==========

  function renderPost(id) {
    const post = getPosts().find((p) => p.id === id);
    if (!post) {
      mainContent.innerHTML = `
        <div class="empty-state" style="padding: 80px 20px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p>文章不存在</p>
          <p style="margin-top:8px;"><a href="#/">← 回到首页</a></p>
        </div>`;
      return;
    }

    // 找上一篇和下一篇
    const posts = getPosts();
    const idx = posts.indexOf(post);
    const prev = idx > 0 ? posts[idx - 1] : null;
    const next = idx < posts.length - 1 ? posts[idx + 1] : null;

    mainContent.innerHTML = `
      <article class="fade-in">
        <header class="article-header">
          <h1>${escapeHtml(post.title)}</h1>
          <div class="article-meta">
            <span>${fmtDate(post.date)}</span>
            <span>${readTime(post.content)}</span>
            <span class="article-tags">
              ${post.tags.map((t) => `<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join("")}
            </span>
          </div>
        </header>
        <div class="article-body">${renderMarkdown(post.content)}</div>
        <nav class="article-footer-nav">
          <div class="prev">
            ${prev ? `<span style="color:var(--text-muted);font-size:0.8rem;">← 上一篇</span><br><a href="#/posts/${prev.id}">${escapeHtml(prev.title)}</a>` : ""}
          </div>
          <div class="next">
            ${next ? `<span style="color:var(--text-muted);font-size:0.8rem;">下一篇 →</span><br><a href="#/posts/${next.id}">${escapeHtml(next.title)}</a>` : ""}
          </div>
        </nav>
      </article>`;

    // 标签点击
    $$(".article-meta .tag").forEach((tagEl) => {
      tagEl.addEventListener("click", function () {
        const t = this.dataset.tag;
        location.hash = "#/tag/" + encodeURIComponent(t);
      });
    });
  }

  // ========== 问题清单页 ==========

  function renderProblems(statusFilter, categoryFilter) {
    // 读取 URL 参数（可选）
    if (!statusFilter && !categoryFilter) {
      const params = new URLSearchParams(location.hash.split("?")[1] || "");
      statusFilter = params.get("status") || "all";
      categoryFilter = params.get("category") || "all";
    }

    let problems = [...getProblems()];

    // 筛选
    if (statusFilter && statusFilter !== "all") {
      problems = problems.filter((p) => p.status === statusFilter);
    }
    if (categoryFilter && categoryFilter !== "all") {
      problems = problems.filter((p) => p.category === categoryFilter);
    }

    // 统计
    const total = getProblems().length;
    const solved = getProblems().filter((p) => p.status === "solved").length;
    const ongoing = getProblems().filter((p) => p.status === "ongoing").length;
    const unsolved = getProblems().filter((p) => p.status === "unsolved").length;

    const statusLabels = { all: "全部状态", solved: "✅ 已解决", ongoing: "🔄 解决中", unsolved: "❌ 待解决" };
    const categoryLabels = { all: "全部分类" };
    const categories = [...new Set(getProblems().map((p) => p.category))];
    categories.forEach((c) => (categoryLabels[c] = c));

    const statusText = { solved: "已解决", ongoing: "解决中", unsolved: "待解决" };
    const priorityLabels = { 1: "高优先级", 2: "中优先级", 3: "低优先级" };
    const priorityDots = { 1: "high", 2: "mid", 3: "low" };

    const statusBtns = Object.entries(statusLabels)
      .map(
        ([k, v]) =>
          `<button class="filter-btn ${statusFilter === k ? "active" : ""}" data-filter="status" data-value="${k}">${v}</button>`
      )
      .join("");

    const categoryBtns = Object.entries(categoryLabels)
      .map(
        ([k, v]) =>
          `<button class="filter-btn ${categoryFilter === k ? "active" : ""}" data-filter="category" data-value="${k}">${v}</button>`
      )
      .join("");

    const canEdit = canEditProblems();

    const problemCards =
      problems.length > 0
        ? problems
            .map(
              (p) => `
          <div class="problem-card fade-in">
            <div class="problem-card-header">
              <h3>${escapeHtml(p.title)}</h3>
              <span class="status-badge ${p.status}">${statusText[p.status]}</span>
              ${canEdit ? `<button class="btn-icon problem-edit-btn" data-id="${p.id}" title="编辑">&#9998;</button>` : ""}
            </div>
            <div class="problem-card-meta">
              <span>📅 ${fmtDate(p.date)}</span>
              ${p.solvedDate ? `<span>✅ ${fmtDate(p.solvedDate)}</span>` : ""}
              <span>📂 ${escapeHtml(p.category)}</span>
              <span><span class="priority-dot ${priorityDots[p.priority]}"></span>${priorityLabels[p.priority]}</span>
            </div>
            <div class="problem-card-desc">${escapeHtml(p.description)}</div>
            ${p.solution ? `<div class="problem-card-solution"><div class="solution-label">💡 解决方案</div>${renderMarkdown(p.solution)}</div>` : ""}
          </div>`
            )
            .join("")
        : `<div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <p>没有匹配的问题</p>
          </div>`;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>🐛 生活问题清单</h1>
        <p>记录生活中遇到的问题和解决方案，让每一个困难都变成经验。</p>
      </div>
      <div class="stats-row">
        <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">全部问题</div></div>
        <div class="stat-card"><div class="stat-num">${solved}</div><div class="stat-label">已解决</div></div>
        <div class="stat-card"><div class="stat-num">${ongoing}</div><div class="stat-label">解决中</div></div>
        <div class="stat-card"><div class="stat-num">${unsolved}</div><div class="stat-label">待解决</div></div>
      </div>
      ${canEdit ? `<div class="problem-actions"><button class="btn btn-primary" id="btn-add-problem">+ 添加问题</button></div>` : ""}
      <div class="problem-filters">
        <span style="font-size:0.82rem;color:var(--text-muted);align-self:center;margin-right:4px;">状态：</span>
        ${statusBtns}
      </div>
      <div class="problem-filters">
        <span style="font-size:0.82rem;color:var(--text-muted);align-self:center;margin-right:4px;">分类：</span>
        ${categoryBtns}
      </div>
      <div class="problem-list">${problemCards}</div>`;

    // 绑定筛选按钮
    $$(".problem-filters .filter-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const filterType = this.dataset.filter;
        const value = this.dataset.value;
        if (filterType === "status") {
          renderProblems(value, categoryFilter);
        } else {
          renderProblems(statusFilter, value);
        }
      });
    });

    // 添加问题按钮
    var addBtn = document.getElementById("btn-add-problem");
    if (addBtn) {
      addBtn.addEventListener("click", function () { handleAddProblem(); });
    }

    // 卡片编辑按钮
    document.querySelectorAll(".problem-edit-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = this.dataset.id;
        var problem = getProblems().find(function (p) { return p.id === id; });
        if (problem) handleEditProblem(problem);
      });
    });
  }

  // ========== 关于页 ==========

  function renderAbout() {
    const postCount = getPosts().length;
    const problemCount = getProblems().length;
    const solvedCount = getProblems().filter((p) => p.status === "solved").length;

    mainContent.innerHTML = `
      <div class="about-section fade-in">
        <div class="about-card">
          <h2>👤 关于我</h2>
          <p>我是${escapeHtml(getConfig().author)}。</p>
          <p>目前是一名大四学生，即将在 2025 年 9 月开始研究生阶段的学习。这个博客记录我的学习笔记、生活感悟和成长过程。</p>

          <h2>📝 关于这个博客</h2>
          <p>这个博客是我亲手搭建的。作为一个编程新手，从零开始建一个博客让我学到了很多东西。</p>
          <p>博客使用纯 HTML + CSS + JavaScript 构建，没有使用任何框架，可以直接在浏览器中打开。所有文章用 Markdown 编写，排版美观大方。</p>
          <p>目前共有 <strong>${postCount}</strong> 篇文章，记录了 <strong>${problemCount}</strong> 个生活问题（其中 <strong>${solvedCount}</strong> 个已解决）。</p>

          <h2>🛠 技术栈</h2>
          <ul>
            <li><strong>前端</strong>：HTML5 + CSS3 + Vanilla JavaScript (ES6+)</li>
            <li><strong>Markdown 渲染</strong>：<a href="https://marked.js.org/" target="_blank" rel="noopener">marked.js</a></li>
            <li><strong>部署</strong>：可直接托管在 GitHub Pages、Vercel 或任何静态服务器</li>
            <li><strong>编辑器</strong>：VS Code</li>
          </ul>

          <h2>📮 联系我</h2>
          <p>如果你想交流或者给我建议，可以通过以下方式找到我：</p>
          <ul>
            <li>在这个博客的 GitHub 仓库提 Issue</li>
            <li>通过导师/实验室联系</li>
          </ul>
          <p style="margin-top:16px;color:var(--text-muted);">感谢你的来访 🙏</p>
        </div>
      </div>`;
  }

  // ========== 管理面板 ==========

  /** Toast 提示 */
  function showToast(msg) {
    let toast = document.getElementById("admin-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "admin-toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function () {
      toast.classList.remove("show");
    }, 2000);
  }

  /** 模态弹窗 */
  function openModal(title, bodyHtml, onSave) {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.id = "admin-modal";
    overlay.innerHTML =
      '<div class="modal"><div class="modal-header"><h3>' +
      escapeHtml(title) +
      '</h3><button class="btn-icon" id="modal-close" title="关闭">✕</button></div><div class="modal-body">' +
      bodyHtml +
      '</div><div class="modal-footer"><button class="btn btn-secondary" id="modal-cancel">取消</button><button class="btn btn-primary" id="modal-save">保存</button></div></div>';
    document.body.appendChild(overlay);

    overlay.querySelector("#modal-close").addEventListener("click", closeModal);
    overlay.querySelector("#modal-cancel").addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector("#modal-save").addEventListener("click", function () {
      if (onSave) onSave(overlay);
    });
    document.addEventListener("keydown", function escClose(e) {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", escClose);
      }
    });
  }

  function closeModal() {
    var modal = document.getElementById("admin-modal");
    if (modal) modal.remove();
  }

  /** 标签输入组件 */
  function initTagInput(wrapperId, inputId, initialTags) {
    var wrapper = document.getElementById(wrapperId);
    var input = document.getElementById(inputId);
    var tags = initialTags ? initialTags.slice() : [];

    function renderTags() {
      var chips = wrapper.querySelectorAll(".tag-chip");
      chips.forEach(function (c) { c.remove(); });
      tags.forEach(function (t, i) {
        var chip = document.createElement("span");
        chip.className = "tag-chip";
        chip.innerHTML =
          escapeHtml(t) + '<span class="remove-tag" data-idx="' + i + '">×</span>';
        wrapper.insertBefore(chip, input);
      });
    }

    renderTags();

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        var val = input.value.trim().replace(/,/g, "");
        if (val && tags.indexOf(val) === -1) {
          tags.push(val);
          renderTags();
        }
        input.value = "";
      }
      if (e.key === "Backspace" && input.value === "" && tags.length > 0) {
        tags.pop();
        renderTags();
      }
    });

    wrapper.addEventListener("click", function (e) {
      var rm = e.target.closest(".remove-tag");
      if (rm) {
        var idx = parseInt(rm.dataset.idx, 10);
        tags.splice(idx, 1);
        renderTags();
      }
    });

    return {
      getTags: function () { return tags; },
      setTags: function (newTags) { tags = newTags.slice(); renderTags(); },
    };
  }

  /** 管理面板 - 登录门禁 */
  var adminAuthed = false;
  var ADMIN_PASSWORD = ""; // 本地使用不需要密码，部署到公网后可设置

  /** 检查是否可以编辑问题（无需密码或已登录） */
  function canEditProblems() {
    return !ADMIN_PASSWORD || adminAuthed;
  }

  /** 添加问题入口 - 已认证直接打开编辑器，否则跳转管理面板 */
  function handleAddProblem() {
    if (canEditProblems()) {
      openProblemEditor();
    } else {
      location.hash = "#/admin";
    }
  }

  /** 编辑问题入口 */
  function handleEditProblem(problem) {
    if (canEditProblems()) {
      openProblemEditor(problem);
    } else {
      location.hash = "#/admin";
    }
  }

  function renderAdmin() {
    if (!adminAuthed && ADMIN_PASSWORD) {
      mainContent.innerHTML =
        '<div class="admin-login fade-in"><h2>🔐 请输入管理密码</h2><input type="password" id="admin-pwd" placeholder="密码" /><div class="login-error" id="login-error"></div><button class="btn btn-primary" id="admin-login-btn">进入管理</button></div>';
      document.getElementById("admin-login-btn").addEventListener("click", function () {
        if (document.getElementById("admin-pwd").value === ADMIN_PASSWORD) {
          adminAuthed = true;
          renderAdmin();
        } else {
          document.getElementById("login-error").textContent = "密码错误";
        }
      });
      document.getElementById("admin-pwd").addEventListener("keydown", function (e) {
        if (e.key === "Enter") document.getElementById("admin-login-btn").click();
      });
      return;
    }

    var tab = location.hash.split("?")[1] || "";
    var activeTab = tab.match(/tab=(\w+)/) ? tab.match(/tab=(\w+)/)[1] : "posts";

    mainContent.innerHTML =
      '<div class="fade-in"><div class="page-header"><h1>⚙️ 管理面板</h1><p>在这里管理博客内容，所有修改自动保存到浏览器</p></div><div class="admin-tabs"><button class="admin-tab' +
      (activeTab === "posts" ? " active" : "") +
      '" data-tab="posts">📝 文章管理</button><button class="admin-tab' +
      (activeTab === "problems" ? " active" : "") +
      '" data-tab="problems">🐛 问题管理</button><button class="admin-tab' +
      (activeTab === "settings" ? " active" : "") +
      '" data-tab="settings">🔧 网站设置</button><button class="admin-tab' +
      (activeTab === "export" ? " active" : "") +
      '" data-tab="export">📦 数据备份</button><button class="admin-tab' +
      (activeTab === "publish" ? " active" : "") +
      '" data-tab="publish">🚀 发布上线</button></div><div id="admin-content"></div></div>';

    document.querySelectorAll(".admin-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        location.hash = "#/admin?tab=" + this.dataset.tab;
      });
    });

    if (activeTab === "problems") renderAdminProblems();
    else if (activeTab === "settings") renderAdminSettings();
    else if (activeTab === "export") renderAdminExport();
    else if (activeTab === "publish") renderAdminPublish();
    else renderAdminPosts();
  }

  /** 文章管理 */
  function renderAdminPosts() {
    var posts = getPosts();
    var content = document.getElementById("admin-content");
    var html =
      '<div class="admin-toolbar"><h2>共 ' +
      posts.length +
      ' 篇文章</h2><button class="btn btn-primary" id="btn-new-post">+ 写新文章</button></div>';
    if (posts.length === 0) {
      html += '<div class="empty-state"><p>还没有文章，点击上方按钮写第一篇 ✍️</p></div>';
    } else {
      html += '<div class="admin-list">';
      posts.forEach(function (p) {
        var isCustom =
          loadFromStorage("blog_custom_posts") &&
          loadFromStorage("blog_custom_posts").some(function (cp) { return cp.id === p.id; });
        html +=
          '<div class="admin-list-item"><div class="item-info"><div class="item-title">' +
          (p.pinned ? "📌 " : "") +
          escapeHtml(p.title) +
          '</div><div class="item-meta">' +
          fmtDate(p.date) +
          " · " +
          escapeHtml(p.tags.join(", ")) +
          (isCustom ? ' · <span style="color:var(--accent)">自定义</span>' : " · 内置") +
          '</div></div><div class="item-actions"><a class="btn btn-sm btn-secondary" href="#/posts/' +
          p.id +
          '" target="_blank">查看</a><button class="btn btn-sm btn-secondary edit-post" data-id="' +
          p.id +
          '">编辑</button><button class="btn btn-sm btn-danger delete-post" data-id="' +
          p.id +
          '" data-title="' +
          escapeHtml(p.title) +
          '">删除</button></div></div>';
      });
      html += "</div>";
    }
    content.innerHTML = html;

    document.getElementById("btn-new-post").addEventListener("click", function () {
      openPostEditor();
    });
    content.querySelectorAll(".edit-post").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var post = getPosts().find(function (p) { return p.id === btn.dataset.id; });
        if (post) openPostEditor(post);
      });
    });
    content.querySelectorAll(".delete-post").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (confirm("确定删除「" + btn.dataset.title + "」吗？此操作不可恢复。")) {
          deletePost(btn.dataset.id);
          showToast("已删除");
          renderAdminPosts();
          updateAllPageLinks();
        }
      });
    });
  }

  /** 文章编辑器 */
  function openPostEditor(post) {
    var isEdit = !!post;
    var tags = post ? post.tags.join(",") : "";
    var body =
      '<label>标题</label><input type="text" id="edit-title" value="' +
      escapeHtml(post ? post.title : "") +
      '" placeholder="文章标题" />' +
      '<label>日期</label><input type="date" id="edit-date" value="' +
      (post ? post.date : new Date().toISOString().slice(0, 10)) +
      '" />' +
      '<label>标签</label><div class="tag-input-wrapper" id="tag-wrapper"><input type="text" id="tag-input" placeholder="输入后按回车添加" /></div><span class="field-hint">按回车或逗号添加标签</span>' +
      '<label>摘要 <span class="field-hint">（可选，留空自动截取正文前100字）</span></label><input type="text" id="edit-excerpt" value="' +
      escapeHtml(post ? post.excerpt || "" : "") +
      '" placeholder="文章摘要" />' +
      '<label>正文 <span class="field-hint">（支持 Markdown 语法）</span></label><textarea id="edit-content" placeholder="在这里写正文...">' +
      escapeHtml(post ? post.content : "") +
      "</textarea>" +
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="edit-pinned" ' +
      (post && post.pinned ? "checked" : "") +
      ' style="width:auto;" /> 置顶这篇文章</label>';

    openModal(isEdit ? "编辑文章" : "写新文章", body, function (overlay) {
      var title = overlay.querySelector("#edit-title").value.trim();
      var date = overlay.querySelector("#edit-date").value;
      var excerpt = overlay.querySelector("#edit-excerpt").value.trim();
      var content = overlay.querySelector("#edit-content").value.trim();
      var pinned = overlay.querySelector("#edit-pinned").checked;

      if (!title) { showToast("标题不能为空"); return; }
      if (!content) { showToast("正文不能为空"); return; }

      var tagRef = overlay._tagRef;
      var tagList = tagRef ? tagRef.getTags() : [];
      if (tagList.length === 0) tagList = ["未分类"];

      var data = {
        title: title,
        date: date,
        tags: tagList,
        excerpt: excerpt,
        content: content,
        pinned: pinned,
      };

      if (isEdit) {
        updatePost(post.id, data);
        showToast("文章已更新");
      } else {
        data.id = "post-" + Date.now();
        addPost(data);
        showToast("文章已发布");
      }
      closeModal();
      renderAdminPosts();
      updateAllPageLinks();
    });

    // 初始化标签输入
    setTimeout(function () {
      var tagRef = initTagInput("tag-wrapper", "tag-input", post ? post.tags : []);
      // 把 tagRef 存到 overlay 上
      var overlay = document.getElementById("admin-modal");
      if (overlay) overlay._tagRef = tagRef;
    }, 50);
  }

  /** 问题管理 */
  function renderAdminProblems() {
    var problems = getProblems();
    var content = document.getElementById("admin-content");
    var html =
      '<div class="admin-toolbar"><h2>共 ' +
      problems.length +
      ' 个问题</h2><button class="btn btn-primary" id="btn-new-problem">+ 添加问题</button></div>';
    if (problems.length === 0) {
      html += '<div class="empty-state"><p>还没有问题记录</p></div>';
    } else {
      html += '<div class="admin-list">';
      problems.forEach(function (p) {
        var statusText = { solved: "✅ 已解决", ongoing: "🔄 解决中", unsolved: "❌ 待解决" };
        var isCustom =
          loadFromStorage("blog_custom_problems") &&
          loadFromStorage("blog_custom_problems").some(function (cp) { return cp.id === p.id; });
        html +=
          '<div class="admin-list-item"><div class="item-info"><div class="item-title">' +
          escapeHtml(p.title) +
          '</div><div class="item-meta">' +
          (statusText[p.status] || p.status) +
          " · " +
          escapeHtml(p.category) +
          " · " +
          fmtDate(p.date) +
          (isCustom ? ' · <span style="color:var(--accent)">自定义</span>' : " · 内置") +
          '</div></div><div class="item-actions"><button class="btn btn-sm btn-secondary edit-problem" data-id="' +
          p.id +
          '">编辑</button><button class="btn btn-sm btn-danger delete-problem" data-id="' +
          p.id +
          '" data-title="' +
          escapeHtml(p.title) +
          '">删除</button></div></div>';
      });
      html += "</div>";
    }
    content.innerHTML = html;

    document.getElementById("btn-new-problem").addEventListener("click", function () {
      openProblemEditor();
    });
    content.querySelectorAll(".edit-problem").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var problem = getProblems().find(function (p) { return p.id === btn.dataset.id; });
        if (problem) openProblemEditor(problem);
      });
    });
    content.querySelectorAll(".delete-problem").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (confirm("确定删除「" + btn.dataset.title + "」吗？此操作不可恢复。")) {
          deleteProblem(btn.dataset.id);
          showToast("已删除");
          renderAdminProblems();
          updateAllPageLinks();
        }
      });
    });
  }

  /** 问题编辑器 */
  function openProblemEditor(problem) {
    var isEdit = !!problem;
    var statuses = ["unsolved", "ongoing", "solved"];
    var statusLabels = { unsolved: "待解决", ongoing: "解决中", solved: "已解决" };
    var categories = ["生活", "学习", "技术", "健康", "社交", "其他"];

    var body =
      '<label>问题描述</label><input type="text" id="edit-problem-title" value="' +
      escapeHtml(problem ? problem.title : "") +
      '" placeholder="一句话描述问题" />' +
      '<label>状态</label><select id="edit-problem-status">' +
      statuses
        .map(function (s) {
          return (
            '<option value="' +
            s +
            '"' +
            (problem && problem.status === s ? " selected" : "") +
            ">" +
            statusLabels[s] +
            "</option>"
          );
        })
        .join("") +
      "</select>" +
      '<label>分类</label><select id="edit-problem-category">' +
      categories
        .map(function (c) {
          return (
            '<option value="' +
            c +
            '"' +
            (problem && problem.category === c ? " selected" : "") +
            ">" +
            c +
            "</option>"
          );
        })
        .join("") +
      "</select>" +
      '<label>优先级</label><select id="edit-problem-priority">' +
      '<option value="1"' +
      (problem && problem.priority === 1 ? " selected" : "") +
      ">高</option>" +
      '<option value="2"' +
      (problem && problem.priority === 2 ? " selected" : "") +
      ">中</option>" +
      '<option value="3"' +
      (problem && problem.priority === 3 ? " selected" : "") +
      ">低</option>" +
      "</select>" +
      '<label>记录日期</label><input type="date" id="edit-problem-date" value="' +
      (problem ? problem.date : new Date().toISOString().slice(0, 10)) +
      '" />' +
      '<label>解决日期 <span class="field-hint">（已解决才需要填）</span></label><input type="date" id="edit-problem-solved" value="' +
      (problem ? problem.solvedDate || "" : "") +
      '" />' +
      '<label>详细描述</label><textarea id="edit-problem-desc" placeholder="详细描述这个问题...">' +
      escapeHtml(problem ? problem.description : "") +
      "</textarea>" +
      '<label>解决方案 <span class="field-hint">（支持 Markdown）</span></label><textarea id="edit-problem-solution" placeholder="你是怎么解决的？">' +
      escapeHtml(problem ? problem.solution : "") +
      "</textarea>";

    openModal(isEdit ? "编辑问题" : "添加问题", body, function (overlay) {
      var title = overlay.querySelector("#edit-problem-title").value.trim();
      var status = overlay.querySelector("#edit-problem-status").value;
      var category = overlay.querySelector("#edit-problem-category").value;
      var priority = parseInt(overlay.querySelector("#edit-problem-priority").value, 10);
      var date = overlay.querySelector("#edit-problem-date").value;
      var solvedDate = overlay.querySelector("#edit-problem-solved").value;
      var desc = overlay.querySelector("#edit-problem-desc").value.trim();
      var solution = overlay.querySelector("#edit-problem-solution").value.trim();

      if (!title) { showToast("问题描述不能为空"); return; }

      var data = {
        title: title,
        status: status,
        category: category,
        priority: priority,
        date: date,
        solvedDate: solvedDate,
        description: desc,
        solution: solution,
      };

      if (isEdit) {
        updateProblem(problem.id, data);
        showToast("问题已更新");
      } else {
        data.id = "problem-" + Date.now();
        addProblem(data);
        showToast("问题已添加");
      }
      closeModal();
      renderAdminProblems();
      updateAllPageLinks();
    });
  }

  /** 网站设置 */
  function renderAdminSettings() {
    var cfg = getConfig();
    var content = document.getElementById("admin-content");
    content.innerHTML =
      '<div class="settings-form"><div class="setting-row"><label>网站名称</label><input type="text" id="setting-name" value="' +
      escapeHtml(cfg.name || "") +
      '" /></div><div class="setting-row"><label>作者署名</label><input type="text" id="setting-author" value="' +
      escapeHtml(cfg.author || "") +
      '" /></div><div class="setting-row"><label>首页描述</label><input type="text" id="setting-desc" value="' +
      escapeHtml(cfg.description || "") +
      '" /></div><div class="setting-row"><label>页脚文字</label><input type="text" id="setting-footer" value="' +
      escapeHtml(cfg.footer || "") +
      '" /></div><div class="setting-row"><label>管理密码 <span class="field-hint">（留空 = 不需要密码，部署到公网后建议设置）</span></label><input type="text" id="setting-password" placeholder="设置后访问管理面板需要密码" /></div><button class="btn btn-primary" id="btn-save-settings">保存设置</button></div>';

    document.getElementById("btn-save-settings").addEventListener("click", function () {
      var newCfg = {
        name: document.getElementById("setting-name").value.trim(),
        author: document.getElementById("setting-author").value.trim(),
        description: document.getElementById("setting-desc").value.trim(),
        footer: document.getElementById("setting-footer").value.trim(),
      };
      saveConfig(newCfg);

      var pwd = document.getElementById("setting-password").value.trim();
      if (pwd) {
        ADMIN_PASSWORD = pwd;
        localStorage.setItem("blog_admin_password", pwd);
      }

      showToast("设置已保存，刷新页面生效");
      updateAllPageLinks();
    });
  }

  /** 数据备份 */
  function renderAdminExport() {
    var content = document.getElementById("admin-content");
    var allData = {
      posts: getPosts(),
      problems: getProblems(),
      config: getConfig(),
      exportDate: new Date().toISOString(),
    };
    var jsonStr = JSON.stringify(allData, null, 2);
    var blob = new Blob([jsonStr], { type: "application/json" });

    content.innerHTML =
      '<div class="settings-form"><h2 style="margin-bottom:16px;">📦 数据备份</h2><p style="color:var(--text-secondary);margin-bottom:16px;">将你的所有文章和问题数据导出为 JSON 文件保存。以后可以导入恢复。</p><button class="btn btn-primary" id="btn-export">📥 导出 JSON 备份</button><button class="btn btn-secondary" id="btn-import-file" style="margin-left:8px;">📤 导入 JSON 备份</button><input type="file" id="import-file-input" accept=".json" style="display:none;" /><div id="import-status" style="margin-top:12px;"></div><hr style="margin:24px 0;border-color:var(--border);" /><h2 style="margin-bottom:12px;">⚠️ 危险操作</h2><button class="btn btn-danger" id="btn-reset-all">🗑 清除所有数据</button><p style="font-size:0.82rem;color:var(--text-muted);margin-top:6px;">这会删除所有自定义内容，恢复为初始状态。内置示例文章也会恢复。</p></div>';

    document.getElementById("btn-export").addEventListener("click", function () {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "blog-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
      showToast("备份文件已下载");
    });

    document.getElementById("btn-import-file").addEventListener("click", function () {
      document.getElementById("import-file-input").click();
    });

    document.getElementById("import-file-input").addEventListener("change", function () {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = JSON.parse(e.target.result);
          if (data.posts) saveToStorage("blog_custom_posts", data.posts);
          if (data.problems) saveToStorage("blog_custom_problems", data.problems);
          if (data.config) saveToStorage("blog_custom_config", data.config);
          document.getElementById("import-status").innerHTML =
            '<span style="color:var(--solved);">✅ 导入成功！请刷新页面查看。</span>';
          showToast("数据已导入");
          updateAllPageLinks();
        } catch (err) {
          document.getElementById("import-status").innerHTML =
            '<span style="color:var(--unsolved);">❌ 文件格式不正确</span>';
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("btn-reset-all").addEventListener("click", function () {
      if (confirm("确定要清除所有自定义数据吗？\n\n这会删除你添加的所有文章和问题，恢复为初始状态。\n\n此操作不可恢复！")) {
        localStorage.removeItem("blog_custom_posts");
        localStorage.removeItem("blog_custom_problems");
        localStorage.removeItem("blog_custom_config");
        localStorage.removeItem("blog_removed_posts");
        localStorage.removeItem("blog_removed_problems");
        showToast("所有数据已清除，请刷新页面");
        updateAllPageLinks();
      }
    });
  }

  // ========== GitHub 发布 ==========

  function loadGitHubConfig() {
    try {
      var saved = localStorage.getItem("blog_github_config");
      return saved ? JSON.parse(saved) : { token: "", owner: "", repo: "", branch: "main" };
    } catch (e) { return { token: "", owner: "", repo: "", branch: "main" }; }
  }

  function saveGitHubConfig(cfg) {
    localStorage.setItem("blog_github_config", JSON.stringify(cfg));
  }

  function base64Encode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
      return String.fromCharCode("0x" + p1);
    }));
  }

  function generateContentJS() {
    var posts = getPosts().map(function (p) {
      return { id: p.id, title: p.title, date: p.date, tags: p.tags, excerpt: p.excerpt, content: p.content, pinned: p.pinned };
    });
    var problems = getProblems().map(function (p) {
      return { id: p.id, title: p.title, status: p.status, category: p.category, priority: p.priority, date: p.date, solvedDate: p.solvedDate, description: p.description, solution: p.solution };
    });
    var cfg = getConfig();
    var config = {
      name: cfg.name, author: cfg.author, avatar: cfg.avatar,
      description: cfg.description, footer: cfg.footer,
      navLinks: cfg.navLinks
    };

    var lines = [];
    lines.push("// ============================================================");
    lines.push("// 博客数据 - 由发布功能自动生成");
    lines.push("// 生成时间：" + new Date().toISOString());
    lines.push("// ============================================================");
    lines.push("");
    lines.push("const blogPosts = " + JSON.stringify(posts, null, 2) + ";");
    lines.push("");
    lines.push("// ========== 生活问题清单 ==========");
    lines.push("");
    lines.push("const lifeProblems = " + JSON.stringify(problems, null, 2) + ";");
    lines.push("");
    lines.push("// ========== 网站配置 ==========");
    lines.push("");
    lines.push("const siteConfig = " + JSON.stringify(config, null, 2) + ";");

    return lines.join("\n");
  }

  async function publishToGitHub(cfg, onProgress) {
    var apiBase = "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo;
    var headers = {
      "Authorization": "Bearer " + cfg.token,
      "Accept": "application/vnd.github+json"
    };

    onProgress("正在生成数据...");
    var content = generateContentJS();

    // 先获取现有文件的 SHA（更新时需要）
    onProgress("正在检查仓库...");
    var sha = null;
    try {
      var getResp = await fetch(apiBase + "/contents/js/content.js?ref=" + cfg.branch, { headers: headers });
      if (getResp.ok) {
        var data = await getResp.json();
        sha = data.sha;
      }
    } catch (e) { /* 文件不存在，将创建新文件 */ }

    // 创建或更新文件
    onProgress("正在上传...");
    var body = {
      message: "📝 更新博客内容 - " + new Date().toLocaleString("zh-CN"),
      content: base64Encode(content),
      branch: cfg.branch
    };
    if (sha) body.sha = sha;

    var putResp = await fetch(apiBase + "/contents/js/content.js", {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify(body)
    });

    var result = await putResp.json();
    if (!putResp.ok) {
      throw new Error(result.message || "发布失败 (HTTP " + putResp.status + ")");
    }
    return result;
  }

  function renderAdminPublish() {
    var content = document.getElementById("admin-content");
    var cfg = loadGitHubConfig();

    content.innerHTML =
      '<div class="settings-form">' +
      '<h2 style="margin-bottom:4px;">🚀 发布到线上</h2>' +
      '<p style="color:var(--text-secondary);margin-bottom:20px;">将你的博客内容一键推送到 GitHub，GitHub Pages 会自动更新网站。</p>' +

      '<div class="setting-row">' +
      '<label>GitHub Token <a href="https://github.com/settings/tokens/new?scopes=repo&description=Blog+Publish" target="_blank" style="font-weight:400;font-size:0.82rem;">（点此创建 → 勾选 repo → 生成后复制过来）</a></label>' +
      '<input type="password" id="publish-token" value="' + escapeHtml(cfg.token) + '" placeholder="ghp_xxxxxxxxxxxx" />' +
      '</div>' +

      '<div class="setting-row">' +
      '<label>GitHub 用户名</label>' +
      '<input type="text" id="publish-owner" value="' + escapeHtml(cfg.owner) + '" placeholder="例如：zhangsan" />' +
      '</div>' +

      '<div class="setting-row">' +
      '<label>仓库名</label>' +
      '<input type="text" id="publish-repo" value="' + escapeHtml(cfg.repo) + '" placeholder="例如：my-blog" />' +
      '</div>' +

      '<div class="setting-row">' +
      '<label>分支</label>' +
      '<input type="text" id="publish-branch" value="' + escapeHtml(cfg.branch) + '" placeholder="main" />' +
      '</div>' +

      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button class="btn btn-secondary" id="btn-save-publish-cfg">💾 保存配置</button>' +
      '<button class="btn btn-primary" id="btn-publish" style="font-size:1.05rem;padding:10px 28px;">🚀 发布到线上</button>' +
      '</div>' +

      '<div id="publish-status" style="margin-top:16px;"></div>' +

      '<hr style="margin:28px 0;border-color:var(--border);" />' +
      '<h3 style="margin-bottom:8px;">📋 使用说明</h3>' +
      '<ol style="color:var(--text-secondary);font-size:0.88rem;line-height:1.8;padding-left:18px;">' +
      '<li>点击上方链接创建一个 GitHub Token，勾选 <strong>repo</strong> 权限</li>' +
      '<li>确保仓库已存在，且已开启 GitHub Pages（Settings → Pages → Source: Deploy from a branch → 选你的分支 → Save）</li>' +
      '<li>填写 Token、用户名、仓库名、分支，点击保存配置</li>' +
      '<li>点击"发布到线上"按钮，等待完成</li>' +
      '<li>稍等 1-2 分钟，访问 <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:3px;">https://用户名.github.io/仓库名</code> 即可查看</li>' +
      '</ol>' +
      '</div>';

    // 保存配置
    document.getElementById("btn-save-publish-cfg").addEventListener("click", function () {
      var newCfg = {
        token: document.getElementById("publish-token").value.trim(),
        owner: document.getElementById("publish-owner").value.trim(),
        repo: document.getElementById("publish-repo").value.trim(),
        branch: document.getElementById("publish-branch").value.trim() || "main"
      };
      saveGitHubConfig(newCfg);
      showToast("GitHub 配置已保存");
    });

    // 发布
    document.getElementById("btn-publish").addEventListener("click", function () {
      var currentCfg = {
        token: document.getElementById("publish-token").value.trim(),
        owner: document.getElementById("publish-owner").value.trim(),
        repo: document.getElementById("publish-repo").value.trim(),
        branch: document.getElementById("publish-branch").value.trim() || "main"
      };
      saveGitHubConfig(currentCfg);

      if (!currentCfg.token || !currentCfg.owner || !currentCfg.repo) {
        document.getElementById("publish-status").innerHTML =
          '<div style="color:var(--unsolved);">请先填写 Token、用户名和仓库名</div>';
        return;
      }

      var statusEl = document.getElementById("publish-status");
      var btn = document.getElementById("btn-publish");
      btn.disabled = true;
      btn.textContent = "⏳ 发布中...";

      publishToGitHub(currentCfg, function (msg) {
        statusEl.innerHTML = '<div style="color:var(--text-secondary);">' + msg + '</div>';
      }).then(function (result) {
        statusEl.innerHTML =
          '<div style="color:var(--solved);font-weight:600;">✅ 发布成功！</div>' +
          '<div style="color:var(--text-secondary);margin-top:4px;">GitHub Pages 正在部署，通常 1-2 分钟后生效。</div>' +
          '<div style="margin-top:8px;">🔗 <a href="https://' + currentCfg.owner + '.github.io/' + currentCfg.repo +
          '" target="_blank" style="color:var(--accent);">https://' + currentCfg.owner + '.github.io/' + currentCfg.repo + '</a></div>';
        btn.disabled = false;
        btn.textContent = "🚀 发布到线上";
        showToast("发布成功！");
      }).catch(function (err) {
        statusEl.innerHTML =
          '<div style="color:var(--unsolved);">❌ 发布失败：' + escapeHtml(err.message) + '</div>' +
          '<div style="color:var(--text-muted);margin-top:4px;font-size:0.82rem;">请检查：Token 是否有 repo 权限？仓库名是否正确？仓库是否已创建？</div>';
        btn.disabled = false;
        btn.textContent = "🚀 重新发布";
      });
    });
  }

  /** 刷新页面上可能过时的链接/数据 */
  function updateAllPageLinks() {
    // 更新页脚
    var cfg = getConfig();
    if (footerText) footerText.textContent = cfg.footer;
    if (siteName) siteName.textContent = cfg.name;
  }

  // ========== 搜索 ==========

  function openSearch() {
    searchOverlay.classList.add("active");
    searchInput.focus();
  }

  function closeSearch() {
    searchOverlay.classList.remove("active");
    searchInput.value = "";
    searchResults.innerHTML = "";
  }

  function doSearch(query) {
    if (!query.trim()) {
      searchResults.innerHTML = "";
      return;
    }

    const q = query.toLowerCase();
    const results = getPosts().filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );

    if (results.length === 0) {
      searchResults.innerHTML =
        '<div class="search-no-result">没有找到相关文章</div>';
      return;
    }

    searchResults.innerHTML = results
      .map(
        (p) => `
      <a href="#/posts/${p.id}" class="search-result-item">
        <div class="title">${escapeHtml(p.title)}</div>
        <div class="excerpt">${escapeHtml(p.excerpt || p.content.slice(0, 100))}</div>
      </a>`
      )
      .join("");
  }

  // ========== 主题切换 ==========

  function initTheme() {
    const saved = localStorage.getItem("blog-theme") || "light";
    applyTheme(saved);
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("blog-theme", theme);
  }

  function toggleTheme() {
    const current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  }

  // ========== 事件绑定 ==========

  function bindEvents() {
    // 路由变化
    window.addEventListener("hashchange", renderPage);

    // 主题切换
    themeToggle.addEventListener("click", toggleTheme);

    // 搜索
    $("#search-toggle").addEventListener("click", () => {
      if (searchOverlay.classList.contains("active")) {
        closeSearch();
      } else {
        openSearch();
      }
    });

    searchInput.addEventListener("input", function () {
      doSearch(this.value);
    });

    // ESC 关闭搜索
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSearch();
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    });

    // 点击搜索框外部关闭
    document.addEventListener("click", function (e) {
      if (
        searchOverlay.classList.contains("active") &&
        !searchOverlay.contains(e.target) &&
        e.target !== $("#search-toggle") &&
        !$("#search-toggle").contains(e.target)
      ) {
        closeSearch();
      }
    });

    // 移动端菜单
    menuToggle.addEventListener("click", function () {
      navLinks.classList.toggle("open");
    });

    // 回到顶部
    window.addEventListener("scroll", function () {
      if (window.scrollY > 400) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
    });

    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // 导航链接点击（移动端关闭菜单）
    navLinks.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        navLinks.classList.remove("open");
      }
    });

    // 搜索结果的链接点击关闭搜索
    searchResults.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        closeSearch();
      }
    });
  }

  function closeMenu() {
    navLinks.classList.remove("open");
  }

  // ========== 启动 ==========
  function init() {
    // 加载管理密码
    var savedPwd = localStorage.getItem("blog_admin_password");
    if (savedPwd) ADMIN_PASSWORD = savedPwd;
    renderNav();
    initTheme();
    bindEvents();
    renderPage();
  }

  // DOM 加载完成后启动
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
