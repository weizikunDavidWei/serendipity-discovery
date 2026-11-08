# GitHub Pages 正式部署验收

日期：2026-11-08（America/Toronto）。本文件保留首次上线的历史记录；后续首页视觉与物理交互迭代见 [PHYSICS_TEST_REPORT.md](PHYSICS_TEST_REPORT.md)。

## 发布结果

- 公开仓库：https://github.com/weizikunDavidWei/serendipity-discovery
- 正式网站：https://weizikundavidwei.github.io/serendipity-discovery/
- 管理页面：https://weizikundavidwei.github.io/serendipity-discovery/admin.html
- 发布源：Deploy from a branch → `main` → `/ (root)`。
- HTTPS：GitHub 默认域名强制启用。
- [首次部署运行](https://github.com/weizikunDavidWei/serendipity-discovery/actions/runs/42459109307)：build、report-build-status、deploy 全部 success，源提交 `44911b692d4683673958ab48944e8e39416f4780`。

## 源码、历史与上传检查

指定项目目录是第一阶段 ZIP 的解压副本。15 个源码、数据、文档和测试文件与原 Git 仓库逐字节一致；通过随附 Git bundle 恢复独立仓库，完整保留 `0cdf38c` 和 `44911b6` 两次原始提交，没有重写历史或覆盖既有远程内容。

检查全部原有提交的受跟踪文件，未发现常见 GitHub/OpenAI 令牌模式、私钥或硬编码秘密赋值；人工复核确认词库为公开主题，没有浏览器草稿或用户画像。提交作者使用项目占位邮箱。`.DS_Store`、ZIP 和 Git bundle 受忽略规则保护，没有上传；发布仓库只包含项目文件。

GitHub 插件已安装，但该会话未提供仓库操作工具；本次使用本机已登录的 GitHub Desktop 创建 Public 仓库并推送原历史，通过已登录 Safari 在 GitHub 设置 Pages。未提取、输出或向源码写入访问令牌。公开仓库 API 确认 `private: false`、`default_branch: main`，远程 main 的提交与本地一致。

## 正式站点检查

| 检查 | 结果 |
|---|---|
| 首页 | 内置浏览器实际访问 HTTPS 正式地址，标题、说明、主题圆圈及控件正常 |
| 黑白视觉与漂浮 | 当前系统深色下黑底、白实心圆、黑字；计算样式 `animation-name: float`，圆圈无水平越界 |
| 数据加载 | 管理页实际显示 16 个主题 / 240 个关键词；公开 JSON 与本地词库完全一致 |
| Bilibili 跳转 | 实际点击“手作之物”，在新标签页打开“螺钿”，URL 为 `https://search.bilibili.com/all?keyword=%E8%9E%BA%E9%92%BF` |
| 管理页面 | `admin.html` 可访问，主题列表、关键词列表、导入导出与本地草稿说明均成功渲染 |
| 静态资源 | `index.html`、`admin.html`、全部 5 个生产 JS/CSS 文件和 `data/keywords.json` 共 8 项均 HTTP 200，与本地字节一致 |
| 原功能保持 | 页面 HTML、JS、CSS 和公开 JSON 未改动，继承第一阶段 23 项验收通过结果 |

本次不是重新开发，没有调整视觉设计或进入第二阶段。管理页仍只保存当前浏览器草稿；线上词库更新需要导出并替换仓库数据文件，再推送 main。浅色系统联动与跨浏览器完整矩阵的边界仍以 `TEST_REPORT.md` 为准；本次线上检查没有宣称三款浏览器全部完成实机复测。
