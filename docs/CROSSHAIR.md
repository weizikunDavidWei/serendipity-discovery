# Crosshair 集成 · 2026-11-08

参考：https://reactbits.dev/animations/crosshair ，以及用户提供的组件源码。
研究内容：指数平滑跟随、目标角标和尺寸测量、非交互覆盖层与差值混合。采用独立原生模块，无 React / GSAP / 图标字体依赖。没有复制整个 React 组件；保留现有视觉与物理代码。

右上角「准星 / ON · OFF」是原生键盘可操作按钮，aria-pressed 表示用户偏好。localStorage 键 serendipity.crosshair.enabled；禁用、页面后台、失焦、键盘输入、触摸输入时取消自身 rAF、隐藏覆盖层并恢复系统光标。reduced-motion 禁用效果，偏好仍保留；恢复后下一次鼠标移动激活。存储不可用时仍能开关。混合设备可用鼠标启用、手指操作立即隐藏。

命中以实际圆形距离判断，18px 接近范围；不是文字框，也不是矩形四角。每帧从完整 .orb 读取当前可见几何，因此支持漂浮、拖动、换组和尺寸过渡；7px 外接角标、直径读数。参数集中在 CROSSHAIR。白色 difference 混合在黑白背景和圆球上自动反相。覆盖层 pointer-events:none，不捕获、不取消事件、不写物理状态。仅鼠标在页面且功能启用时运行，最多读取 9 个圆球矩形；物理仍使用原有独立 World。

实测：macOS 安装版 Google Chrome（headless）运行真实网页。9 项集成断言通过：指针显示、完整球体尺寸、漂浮跟踪、关闭恢复、刷新保持、深色主题、减少动态效果、拖动不触发搜索、原搜索入口有效。另验证浅色模式、触摸事件隐藏，以及90/250/500px球体的中心/边缘命中和矩形空白角排除（9项几何断言）。触摸为合成事件，不等于触屏真机验收。截图已人工查看，几何角标围住整个圆球。

运行方式：本地服务后使用有 Playwright 的 Node 环境执行 tests/crosshair.cjs；可通过 TEST_URL 指向测试服务，PLAYWRIGHT_MODULE 指定依赖位置，默认 Chrome channel。原套件输出见 CROSSHAIR_CHROME_RESULTS.txt。

Safari WebDriver 因“Allow remote automation”未启用而无法运行；Safari、Edge、iOS/iPadOS及真实触屏本轮未实测。未声称 React Bits 在线预览的实际动画已经在浏览器中验收，适配依据公开源码与本地实际效果。

原有62项回归：修改前、修改后均为54通过/8失败，失败名称及消息完全一致（见 CROSSHAIR_BASELINE_RESULTS.txt）。旧套件硬编码240词/16主题/242条编辑结果，而当前已发布词库为42主题/3116词；相关管理页断言及后续链路失败在本次修改前即存在。本轮未修改管理系统或套件的旧基准，也未将这8项标记通过。物理、SVG、碰撞、惯性和搜索相关原回归通过。

交付同步：Git HTTPS 推送无可用凭据，GitHub 插件 Git tree 写入返回403 Resource not accessible by integration。已保存本地提交；本轮未更新 Pages，不能将公开部署标为通过。
