# SERENDIPITY

一个通过随机主题与关键词探索互联网的轻量网站。第一阶段包含极简首页与完全在浏览器内运行的词库工作台。无构建步骤、无第三方依赖、无账号系统。

正式网站：[https://weizikundavidwei.github.io/serendipity-discovery/](https://weizikundavidwei.github.io/serendipity-discovery/)
管理页面：[admin.html](https://weizikundavidwei.github.io/serendipity-discovery/admin.html)
公开仓库：[https://github.com/weizikunDavidWei/serendipity-discovery](https://github.com/weizikunDavidWei/serendipity-discovery)

## 本地运行

在项目目录打开终端，运行：

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

访问 [本地首页](http://127.0.0.1:8765/)；管理页为 [本地管理页](http://127.0.0.1:8765/admin.html)。结束时按 Ctrl+C。需要 Python 3。也可使用任意静态 HTTP 服务器。请不要直接双击 HTML：浏览器对 file:// 下的模块与 JSON 读取有限制。

## 探索与物理交互

首页是一片全屏黑白圆圈场，没有 Hero、网格或底部操作栏。SERENDIPITY™ 位于边缘，大型 ↘ 是“完全随机探索”入口；“换一阵风”重新抽取主题、尺寸与构图。

- 桌面随机展示 5–9 个不同主题，小屏通常 5–6 个；极短的分屏窗口空间不足时继续减少数量，优先保留可用目标。桌面最大圆约 350–500px，和明显较小的圆圈并置；实际大小由可用空间决定。
- 点击主题立即在新标签页打开对应 Bilibili 搜索；完全随机从全库抽取。搜索使用原有编码和近期去重逻辑。
- 鼠标与触摸均可拖动圆圈并推动其他圆圈；释放后保留有限惯性。鼠标移动超过 6px、触摸超过 9px 才视为拖动，拖动释放不触发搜索。
- 使用 Tab 选择原生按钮，Enter / Space 探索。键盘焦点位于圆圈中时暂停漂移，便于操作。系统 reduced-motion 下无自主运动与惯性；用户仍可主动拖动。
- 跟随系统浅深色实时变化，没有产品主题切换按钮。页面进入后台停止动画，恢复时不补算后台经过的时间。
- Web Crypto 拒绝采样与 Fisher–Yates 保留。近 20 条关键词只在当前页面内存中，候选集中均匀抽取；主题词条耗尽后允许复用，多词条时排除紧邻上一次的词条。没有用户画像、埋点或兴趣存储。
- 搜索请求由 Bilibili 接收，本项目不控制第三方结果、登录要求或可达性。

### 实现与调整

当前物理输入与手感重构、真实甩动验收结果见 [PHYSICS_INPUT_REBUILD.md](docs/PHYSICS_INPUT_REBUILD.md)。

`assets/config.js` 集中管理数量、尺寸、碰撞、阻尼、速度、交互阈值和过渡时间。`assets/layout.js` 负责随机邻近聚集与受限放置，失败时缩小尺寸，不接受初始重叠。`assets/physics.js` 是独立于 DOM 的确定性圆形求解器；`assets/explore.js` 负责页面渲染、Pointer Events 和探索调度。

固定步长为 1/120 秒，每次显示帧最多补算 8 步。质量与半径平方相关，恢复系数 0.72，12 轮接触分离；拖动目标通过速度控制器推进，避免直接将物体传送到指针。边缘控件是不可见静态避让区；碰撞采用圆形距离与面积质量，而非矩形按钮动画。每帧只写入位置 transform，不反复读取页面布局。

## 管理词库

`admin.html` 可创建、重命名、删除主题，逐条增删改词条，按行批量粘贴，搜索全库，查看统计，执行去重与校验，并导入导出 JSON/CSV。

**本地草稿不是线上发布。** 编辑只写入当前站点来源的 localStorage。localhost、GitHub Pages 和不同端口之间的草稿互不共享。首页始终读取 `data/keywords.json`，不会读取管理草稿。

1. 编辑并点击对应的“添加”“保存”“重命名”或批量导入按钮，成功后自动保存草稿。
2. 点击“校验数据”。空主题可暂存为草稿，但导入公开词库和导出时要求每个主题至少一个词条。
3. 导出 JSON，手动替换仓库的 `data/keywords.json`。
4. 提交并部署，访客才能获得新的公开词库。文件名必须是 `keywords.json`。

整库导入是**替换**，不是合并；粘贴批量导入才是追加到当前主题。无效文件会被拒绝且保留当前草稿。整库 JSON/CSV 导入要求全库无重复；批量粘贴自动跳过重复词条。

保留最近 8 个替换或删除主题前的本地历史备份。“恢复公开版本”使用管理页本次打开时加载的公开数据；要取得刚更新的线上版本，先导出草稿再刷新。浏览器存储不可用时会显示失败提示，不会声称已保存。清除浏览器数据将丢失草稿与历史，请保留下载文件。检测到其他标签页修改草稿时会暂停本页编辑，仍允许导出当前版本，避免无提示覆盖。

## 数据结构与约束

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-11-08T00:00:00Z",
  "topics": [
    { "id": "stable-topic-id", "name": "主题名称", "keywords": ["关键词"] }
  ]
}
```

- ID 为稳定标识；只允许 1–80 位英文字母、数字、下划线和连字符，重命名不改变 ID。
- 主题名称不重复，最多 24 个 UTF-16 代码单元；关键词最多 100 个代码单元。统一 NFKC、首尾空格与连续空格，忽略大小写判断重复。
- 1–200 个主题，每主题最多 5,000 个关键词，全库最多 20,000 个；文件导入上限 5 MB。这些是容量限制，**本阶段实际只有 240 个关键词**。
- CSV 为 UTF-8，表头严格使用 `topic,keyword`，支持 BOM、双引号与逗号转义。CSV 不携带稳定 ID；需要保留 ID 时用 JSON。
- CSV 导出为公式前缀加保护，重新导入时移除该保护；面向表格软件和交换的复杂场景优先保存 JSON 主备份。
- 用户输入通过文本节点或输入控件呈现，不插入 HTML；项目不需要 GitHub 令牌，也不在前端保存秘密。

## GitHub Pages

已于 2026-11-08 正式发布。仓库为 **Public**，默认分支为 `main`，Pages 发布源为 **Deploy from a branch → main → / (root)**，使用 GitHub 默认域名和 HTTPS。

- [正式网站](https://weizikundavidwei.github.io/serendipity-discovery/)
- [管理页面](https://weizikundavidwei.github.io/serendipity-discovery/admin.html)
- [公开仓库](https://github.com/weizikunDavidWei/serendipity-discovery)
- [Pages 部署记录](https://github.com/weizikunDavidWei/serendipity-discovery/actions)

原始两次 Git 提交完整保留。当前 GitHub 插件已安装，但本次对话没有仓库操作工具，因此发布沿用本机 GitHub Desktop 的既有登录授权，并在 GitHub 网页配置 Pages；没有在源码中保存令牌。`.DS_Store`、ZIP 和 Git bundle 均未上传。

后续更新：修改文件并提交到 `main`，通过已登录的 GitHub Desktop 推送即可触发 Pages 自动部署。维护词库时，先从管理页导出 JSON，再替换 `data/keywords.json`、提交并推送。部署完成前访客可能仍看到旧内容；可在 Actions 查看状态。管理页本地保存不会自动推送或发布。

全站使用相对路径，兼容仓库子路径，无需构建或后端。保持 `.nojekyll`。恢复项目可克隆公开仓库：

```sh
git clone https://github.com/weizikunDavidWei/serendipity-discovery.git
```

首轮上线已实际核对首页、所有生产脚本和样式、`admin.html`、240 条关键词与本地源码字节一致；浏览器已验证圆圈渲染与中文 Bilibili 新标签页跳转。详见 [部署验收记录](docs/DEPLOYMENT_REPORT.md)。

## 验收与兼容性

首次交付记录见 [docs/TEST_REPORT.md](docs/TEST_REPORT.md)，当前迭代见 [docs/PHYSICS_TEST_REPORT.md](docs/PHYSICS_TEST_REPORT.md)。附带可重复运行的浏览器验收页面：

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

打开 [本地验收页面](http://127.0.0.1:8766/tests/)，点击“运行验收”。应使用独立端口并关闭该来源其他管理页；测试会暂存和恢复本地草稿，在 iframe 中验证真实应用。测试不是生产入口；仓库保留 `tests/` 以便重复验证。需要核查 5 / 7 / 9 个圆圈和手机构图时，可访问本地 `tests/preview.html`。该页面的数量和颜色控制仅用于测试，不属于产品首页。

使用标准 ES Modules、Fetch、Web Crypto、CSS Grid、matchMedia 和 localStorage，面向现代 Safari、Chrome、Edge；本次视觉迭代已在 Safari 27.2、Chrome 156 和内置浏览器各运行 41 项验收，通过全部检查；Edge 与触屏真机未实测。详见 [视觉与物理交互验收](docs/PHYSICS_TEST_REPORT.md)。没有使用渐变、玻璃效果、外部字体或大型框架。

## 文件与恢复

`PROJECT_STATUS.md` 保存本阶段进度、限制及后续待办。本地 Git 保存稳定开发记录。交付 ZIP 包含源码、文档、测试和一个可恢复本地提交历史的 Git bundle，不包含用户浏览器草稿。

恢复 Git 历史（在解压目录以外的新目录执行）：

```sh
git clone serendipity-history.bundle serendipity-recovered
```

本轮仅第一阶段，不含后端、账号、推荐系统或 5,000 词条扩充。
