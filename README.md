# 我的个人博客

一个用纯 HTML + CSS + JavaScript 搭建的个人博客，专为编程新手设计。

## 怎么打开

直接双击 `index.html` 文件，用浏览器打开即可。

或者用 VS Code 打开这个文件夹，安装 Live Server 插件，右键 `index.html` → "Open with Live Server"。

## 怎么添加新文章

1. 用任意编辑器（记事本也行）打开 `js/content.js`
2. 找到 `const blogPosts = [` 这一段
3. 在 `];` 前面，按下面格式添加新文章：

```javascript
  {
    id: "my-second-post",           // 唯一标识，英文+数字，不要和已有的重复
    title: "我的第二篇文章",
    date: "2025-06-01",
    tags: ["生活", "学习"],          // 标签，可以随便写
    excerpt: "这篇文章的简短介绍",    // 可选，不写会自动取正文前100字
    content: `
## 标题

正文内容，支持 **Markdown** 语法。

- 列表项1
- 列表项2

\`\`\`javascript
// 代码块
console.log("hello");
\`\`\`
`,
    pinned: false,                   // true = 置顶，false = 不置顶
  },
```

**重点**：`id` 不要重复，`content` 里的反引号是键盘上 Tab 键上面那个键。

## 怎么添加生活问题

同样在 `js/content.js` 中，找到 `const lifeProblems = [`，按格式添加：

```javascript
  {
    id: "problem-01",
    title: "问题的一句话描述",
    status: "unsolved",              // "solved" / "unsolved" / "ongoing"
    category: "技术",                // 生活 / 学习 / 技术 / 健康 / 社交 / 其他
    priority: 1,                     // 1=高 2=中 3=低
    date: "2025-06-01",
    solvedDate: "",                  // 解决日期，未解决就留空 ""
    description: "问题的详细描述",
    solution: "",                    // 解决方案，支持 Markdown，未解决留空 ""
  },
```

## 怎么修改网站名称和作者

在 `js/content.js` 最底部，找到 `const siteConfig =`，修改里面的值即可。

## 功能清单

- 文章列表 + 标签筛选
- 文章详情页（Markdown 渲染）
- 生活问题清单 + 状态/分类筛选
- 搜索（点击右上角放大镜，或按 Ctrl+K）
- 暗色模式（点击右上角月亮/太阳图标）
- 手机端适配
- 置顶文章
- 上一篇/下一篇导航
- 回到顶部按钮

## 怎么部署到网上（让别人也能访问）

最简单的免费方法之一——GitHub Pages：

1. 注册 GitHub 账号
2. 新建一个仓库，名字叫 `你的用户名.github.io`
3. 把这个 blog 文件夹里的所有文件上传到仓库
4. 等 1-2 分钟，访问 `https://你的用户名.github.io` 就能看到了

更简单的方法是用 Vercel：
1. 注册 Vercel（用 GitHub 账号登录）
2. 导入你的 GitHub 仓库
3. 自动部署完成
