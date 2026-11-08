# Topolines integration · 2026-11-08

来源：https://github.com/idleCyrex/topolines ，https://topolines.idlee.xyz/playground 。使用 npm topolines 0.3.0 的原生 TopoField，非 React，固定本地资产 assets/vendor/topolines-0.3.0.js（约25KB）。保留 MIT 及内含 Ashima simplex noise 许可于 TOPOLINES-LICENSE.txt。没有运行时 CDN、npm 或构建步骤。

默认配置 data/visual-defaults.json：speed .005 / scale 2.29 / levels 10 / lineWidth 1.7 / warp .12 / opacity .22。黑白颜色由 prefers-color-scheme 实时决定。interactive=false；背景 pointer-events:none，层级位于隔离的首页场景下方。maxDpr=1.25 限制像素成本。随机 seed 每个页面实例创建一次，调整选项不重建、不换种子；关闭/开启保留同一 field 和时钟。页面离开销毁 GPU 和监听器，BFCache 恢复按原 seed/clock 重建。

局部 vendor 补丁：pause 设置持久 paused 状态，play 清除；start/render 检查 paused 与 document.hidden。上游 pause 仅取消当前 rAF，随后可见性/IntersectionObserver/ResizeObserver 可能唤醒，故不能直接用于“完全停止”要求。修复后关闭及透明度0不提交 GPU 绘制；后台暂停；reduced-motion 保留单帧静态图。WebGL 不支持则保留原纯色界面和所有核心交互。

个人设置 serendipity.visual.preferences.v1：opacity/enabled/toggleStyle。视觉模块独立于关键词草稿；跨标签页通过 storage 同步。Crosshair 仍使用原有独立启用状态键，只共用样式。range 精度1%，0–100%；默认22%；3种共用按钮样式；恢复默认仅复位本模块的个人偏好，不重置词库或准星开关。保存失败明确提示。公开默认 JSON 必须经过仓库发布才影响首次访问者；已有个人偏好优先，不自动同步到其他设备。浏览器清理存储后恢复公开默认。

## 本轮实际测试

Chrome安装版、headless模式运行真实页面，tests/topolines.cjs 21项全通过。通过GL实际uniform检查22%与黑白颜色，并计数 drawArrays 验证关闭后（含resize）不再渲染。后台滑块、跨标签页实时更新、三种统一样式、刷新保持、默认恢复、动态球体拖动与搜索、准星完整锁定、reduced-motion单帧、390×844移动尺寸无溢出及单画布均通过。人工检查桌面、管理页及移动尺寸截图。

额外7项生命周期检查通过：0透明度停止、恢复、模拟隐藏暂停/返回、实例种子稳定、20次开关不重建、destroy清理。模拟 document.hidden 不等于浏览器真实后台调度。120个有背景的rAF样本中位间隔16.7ms，仅为本机观测，非跨设备FPS或长期内存保证。

命令：先 python3 -m http.server 8765，再用配置有 Playwright 与 Chrome 的Node运行 tests/topolines.cjs。可设 TEST_URL 和 PLAYWRIGHT_MODULE。无生产运行依赖。

Safari/Edge、iOS/iPadOS真机与触摸硬件本轮未实测；移动仅为Chrome视口模拟。无需将这些标为通过。原有词库基准失败仍单独记录，不能视为本轮通过。

完整原回归再次执行：54通过/8失败，与本轮前相同的旧词库数量和管理流程断言；准星10项全部通过。未把旧失败改为通过，未修改无关管理数据逻辑。实际完整输出 TOPOLINES_REGRESSION_RESULTS.txt。
