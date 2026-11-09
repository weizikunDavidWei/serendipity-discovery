# 多平台搜索与 RubberSegment（2026-11-09）

首页右下角在大型随机探索箭头左侧加入 bilibili / YouTube / Google 三段切换。默认 bilibili，所有圆球点击与完全随机探索都读取同一选择；三个平台共用当前圆球界面与词库。本轮没有独立视觉模式。

## 实现边界

- `assets/data.js` 保留原抽样、校验及近期去重；URL 导出兼容旧调用。
- `assets/search-platforms.js` 集中三个平台 URL 和编码逻辑，是不依赖页面的适配表。增加平台时先扩展此表。
- `assets/mode-controller.js` 管理有效平台 ID 与 `serendipity.search.platform.v1` 本地偏好，刷新和同源标签页同步；未知值/存储不可用回退 bilibili。页面切换不抽样、不写物理状态、不重建视觉对象。
- `assets/rubber-segment.js` 是原生 Pointer Events 双边界滑块，参考 [React Bits RubberSegment](https://reactbits.dev/micro/rubber-segment) 及用户提供源码。没有引入 React、Motion、图标库或新构建步骤。
- `assets/platform-switch.js` 仅连接组件与平台状态。探索逻辑在可信点击中同步 `window.open`，没有异步等待。

拖动阶段即时写入左右边界，不进行位置插值；释放才按最近100ms轨迹估速、投影和吸附。点击用先拉伸再收束的双边界弹簧，参数集中在 `RUBBER`，速度为 CSS px/s。过期速度归零、捕获取消/失焦/隐藏还原当前选择，停止帧和计时器；窗口变化重新测量，不在每个 move 中测量布局。组件支持销毁和 reduced-motion。

## 视觉与操作

36px 黑白胶囊、1px 内嵌、等宽分段及反相文字，与页面字体力度和系统主题共用变量。按钮实际命中高度44px。桌面宽258px，移动按可用空间缩小；窄屏辅助文字稍上移以留出间距。新增区域作为物理障碍，避免圆球遮挡。原大型 SVG 与右上角滑轨均保留。

点击任意平台或拖动当前滑块即可选择。键盘 Tab 进入当前项，方向键、Home、End 切换，Enter/空格选择。触摸竖向手势允许取消，取消不改变平台；个人选择仅保存在当前浏览器，不是公开默认发布。

## 实际验证

- Chrome 页面专项：鼠标即时跟手、最近位置吸附、快速连点、触摸拖动与取消、键盘、中文/特殊符号编码、两个搜索入口、偏好刷新恢复、跨标签页同步、无效偏好回退。
- 以测试内注入观测既有 World：同步切换三平台后实例、圆球数组、位置/速度及物理时钟完全不变，随后时钟继续推进。圆球节点、背景 Canvas、准星节点维持同一对象。
- 已查看1440×1000完整浅/深色截图及390×844移动完整截图；320宽、701宽、768平板、844×390横屏和1024×768检查文字/几何间距与溢出。
- macOS Safari 实际原生界面：点击 YouTube、拖动至Google、左方向键回到YouTube、Cmd-R恢复选中平台和相同主题；已查看完整页面。
- 原回归：Slide Commit 22项、Hollow 15项、Topolines 21项、Crosshair 10项通过。旧通用套件仍54通过/8个既有失败：仍断言最初16主题/240词，及由旧总数引起的管理链式断言，未将其标为通过，未改词库或管理系统。输出附本目录。
- 180帧连续切换本机样本：中位16.7ms、P95约16.8ms、最大33.3ms，单Canvas/三选项，非高刷新率或跨设备性能保证。
- 实际新标签页：Bilibili加载了中文搜索结果标题；YouTube打开正确搜索URL，未核验其结果内容；Google正确接收关键词后进入其验证码页面，未绕过验证，未将结果内容计为通过。
- 初次并行启动若干浏览器出现加载超时，重跑专项完成；额外8次连续冷开页均成功。未将超时尝试记为通过。
- Edge、iOS/iPadOS和其他实体触屏、高刷新率硬件本轮未实测。移动测试为Chrome触摸模拟。第三方服务内容/验证码/网络状态不由本项目控制。

## 重跑

启动 `python3 -m http.server 8765`，在该项目目录运行：

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node tests/platforms.cjs
```

默认使用已安装的Chrome。`TEST_URL`可指定正式站点；不会写入公开词库。详见 `MULTIPLATFORM_RESULTS.json` 与 `MULTIPLATFORM_REGRESSION.txt`。
