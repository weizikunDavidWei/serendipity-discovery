# Slide Commit 与当前标签页现场恢复 · 2026-11-08

## 用户行为

首页「换一阵风」保留为小型入口。点击就地打开250px黑白胶囊，抓住44px手柄滑到最右端并释放才换组。半程、回到左侧再释放、取消捕获、触摸cancel均不提交；回程用有阻尼的弹簧积分，带轻微挤压；成功填充为「已换一阵风 ✓」，850ms后收起。深浅色跟随系统，减少动态时直接归位、无弹跳。

键盘：Tab聚焦手柄，方向键每次调整10%；End只移至终点，之后Enter或空格才确认。Home归零，Escape/外部点击/焦点离开可取消。未提交的过渡可中止；已经完成的换组不会因关闭成功反馈而撤销。控件打开时暂缓圆球模拟，保留待确认现场；关闭后恢复，不改速度/碰撞公式。窗口变化、失焦、隐藏和页面离开也清理控件、捕获及动画。

没有新增仅重排布局按钮：检查发现只有 shuffleScene 会主动换主题，resizeScene是自动适配视口。品牌在首页的普通点击不再触发无意义的整页导航；修饰键新开标签仍保留。主题搜索、完全随机搜索与管理/视觉设置无需滑动确认。

## 原生实现与安全提交

参考用户提供的 React Bits JavaScript/CSS 说明与 https://reactbits.dev/micro/slide-commit 。assets/slide-commit.js 为原生可复用组件，依赖Pointer Events、Pointer Capture、少量Web Animations及有界rAF弹簧；未引入React/Motion/Hugeicons或构建流程。仅静态SVG箭头，文案用textContent。状态分别为closed/ready/dragging/returning/pending/done/error；pending同步加锁，回调返回Promise；AbortSignal在销毁/关闭时中止尚未提交的业务。重复按键或同一次pointerup不会重复提交。

原业务拆成prepareScene和commitScene。随机主题与布局先准备到离屏DocumentFragment及新World，全部可生成后才短暂退出旧场景并替换DOM/World；若准备失败，原场景对象和DOM原样保留。等待阶段可取消，业务检查AbortSignal后才提交。失败可重新滑动。仍使用原World、bindDrag、arrange和随机抽样算法。

## sessionStorage

assets/scene-session.js 使用独立键 serendipity.exploration.scene.v1，保存主题稳定ID、有序圆球的x/y/r/vx/vy/phase、画布尺寸、物理时钟及最近20个关键词。不会复制整份关键词库、写入GitHub或永久兴趣记录。约每秒可见绘制时检查点保存，搜索、成功换组、打开确认和pagehide等时机立即保存；无新增常驻interval。刷新/当前标签页返回可恢复，系统强制杀进程可能仅保留最近检查点。拖动中的球不在重载时注入未经释放的甩动速度。

恢复前校验schema、ID存在/唯一、数量、有限数值、尺寸、位置和速度预算；无法解析或数据失效时安全使用原初始化流程。相同视口尽量保留原尺寸/位置，解算少量接触；不同视口先按比例适配、维持至少48px目标并解决碰撞，必要时用现有packing重排同一主题，仅在确实放不下时减少可见目标。不会为窗口变化抽取其他主题。

普通新标签页有独立session；对有opener的首次navigate忽略浏览器复制来的旧场景，避免新窗口继承父窗口现场。浏览器“复制标签页”或“恢复关闭的标签页”可能按其自身会话策略复制/恢复起始内容，但后续sessionStorage独立。用户的视觉效果开关/字重/透明度仍使用原localStorage个人偏好。背景地形的随机种子/动画帧不是本轮保存内容。存储受阻时不影响探索与滑动确认，并明确提示刷新可能无法保留现场。

## 实际验收

Chrome安装版headless：tests/slide-commit.cjs **35项通过**。真实鼠标输入验证半程回弹、到终点未释放保持旧场景、释放仅一次DOM替换；明确键盘确认、成功反馈/收起、外部/Escape取消、失败注入与恢复重试。精确比较刷新前后的主题ID、CSS尺寸和位置。近期去重、opener新标签独立、品牌导航、视口变化、坏JSON、禁用存储、暂停期间取消与销毁清理均通过。

移动：390×844视口、isMobile/hasTouch上下文，以CDP原生触摸输入验证touchCancel到终点不提交、touchEnd完整滑动提交；不是iOS/Android实体硬件测试。人工检查桌面、手机尺寸、深色控件截图；键盘焦点有反相内圈，视觉副本不重复进入无障碍树。

macOS Safari实际桌面UI（不是WebDriver或仅代码推断）：观察展开；原生鼠标半程拖动回0且主题未变；完整鼠标拖动后换组并收起；End到100%但主题不变；Escape关闭且不换；End再Enter确实换组；Cmd-R后主题及顺序相同，状态为「已恢复当前标签页的探索现场」。Safari未执行35项全套自动断言，也未做逐像素位置比对。

原Crosshair10项、Hollow14项、Topolines21项、字体/坐标15项回归通过。旧完整套件仍54通过/8个相同历史词库数量/管理链路旧基准失败，未把这8项标为通过。本轮仅更新旧套件的换组调用为真实确认流程，并在夹具间隔离/最终恢复session记录；不修订无关词库基准。开发中并行加载曾出现两次首页启动超时；冻结源码后顺序复跑Hollow14项和字体15项均通过，超时运行不计通过。

Edge、iOS/iPadOS/Android真机、触控板硬件本轮未实测。没有声称数小时内存或所有浏览器版本验收。

本地运行方式沿用README；有Playwright和Chrome的Node环境可运行 tests/slide-commit.cjs。支持PLAYWRIGHT_MODULE与TEST_URL；脚本中的故障注入只在测试请求拦截中存在，生产没有失败开关。
