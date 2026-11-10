# 可配置浏览器搜索（2026-11-09）

后台「搜索平台 → 浏览器搜索网站」提供 Google、必应、Yandex、小红书、百度。首页第三项显示实际网站名，例如“小红书”，默认Google；前两项bilibili、YouTube保持独立。圆球及大型随机箭头均走统一搜索适配器，仍同步打开新标签页。

## 状态与兼容

- 三个界面槽固定为`bilibili`、`youtube`、`browser`，浏览器槽与具体搜索服务分离。`mode-controller.js`导出当前槽及实际`getSearchProvider()`；原`google`模式值/调用兼容映射至`browser`，不丢失旧选择。
- `search-platforms.js`集中五个浏览器服务和URL参数，关键词仅编码一次。必应使用`q`、Yandex使用`text`、百度使用`wd`、小红书使用`keyword`，Google沿用`q`。
- 独立`browser-preferences.js`仅保存白名单中的服务ID，键为`serendipity.search.browser-provider.v1`。损坏值和存储读取异常回退Google，写入失败明确显示未保存。
- `browser-admin.js`是独立设置模块，不进入词库保存/导入导出逻辑。此设置是当前浏览器的个人偏好，不是替所有访客发布新的默认值，不跨设备同步。
- 同源标签页通过storage事件更新；只替换现有按钮和反相文字副本的文本，不重建滑块、圆球、准星或背景，不改变当前槽位、主题与物理状态。

## 实际测试

- Chrome搜索配置46项通过：五个选项、名称和反相副本、两种搜索入口、中文/特殊字符编码、场景不变、读屏标签、刷新恢复、跨标签页即时同步、旧Google选择迁移、无效值防护、存储失败状态、词库草稿/历史/视觉设置未改、手机尺寸及黑白显示。
- 三平台35项与指针跟手13项回归通过。测试已适配浏览器槽ID；纯Google适配器的既有URL编码检查仍保留。没有修改圆球物理、碰撞、Slide Commit、Crosshair、Topolines/Hollow、关键词数据或词库管理脚本。
- 已查看桌面完整页面的黑白主题、320px首页中文标签和390px后台截图。小红书文本未溢出，后台复用原有标签和下拉菜单排版。
- 实际点击并打开五个外部新标签页：必应、小红书出现对应中文关键词搜索页标题；Google、Yandex、百度进入各自验证页面。正确搜索目标请求已观察到，未绕过验证，未将第三方结果内容计为受控测试通过。
- 本轮已补 macOS Safari 原生后台选择、跨标签页同步、模式独立、刷新恢复与小红书落地页检查；Edge与实体移动设备未实测。触摸由Chrome CDP回归覆盖。详见BROWSER_PLATFORM_ACCEPTANCE.md。

结构化结果见`BROWSER_PROVIDER_RESULTS.json`。启动本地服务后，用现有Node/Playwright/Chrome运行`tests/browser-providers.cjs`。`TEST_URL`可切换至正式站点；测试只改变隔离浏览器上下文的个人设置，不修改公开词库。

## 缓存与恢复

搜索模块入口及其相互依赖采用同一`?v=20261109-browser2`版本，避免Safari复用缺少新接口的旧文件。修改这些模块的导出接口时，应同步更新这组版本号。其他物理、数据与视觉模块不改URL。模式和搜索服务偏好在pageshow及恢复可见时重读，仍沿用原存储键及storage通知，不创建新配置系统。
