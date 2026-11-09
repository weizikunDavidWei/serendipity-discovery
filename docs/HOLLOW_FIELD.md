# Hollow Distortion Field · 2026-11-08

研究来源：React Bits Grid Distortion https://www.reactbits.dev/backgrounds/grid-distortion 及其公开GLSL实现（局部位移场改变采样坐标）；Topolines https://github.com/idleCyrex/topolines 。没有复制 Grid Distortion 的纹理网格/React组件，没有新增渲染器、额外画布、贴图、实体圆环或后处理通道。

在既有 Topolines 片元着色器的 stN→stBase 处加入径向 displacement：最多9个圆形源，屏幕短边归一化保持纵横比；球边缘附近位移最大，向外 smoothstep 衰减至0；各源向量相加后用连续限幅避免过强变形。按半径缩放，影响外延=半径×(0.35+2.65×滑块比例)，力度固定0.22×半径。滑块只改外延，不改圆球尺寸、等高线密度或时钟。0%直接传0个源，与关闭一致。它是克制的艺术性径向形变，不声称科学黑洞模拟。

assets/hollow-field.js 将圆球实际显示矩形转换为GPU中心/半径；读取渲染中的完整 .orb，所以拖动、碰撞及CSS窗口缩放过渡都匹配可见位置。只在同一个 Topolines render 回调中读取并上传，复用固定27浮点缓冲区，没有新增rAF循环。关闭/0%时跳过DOM查找与几何读取，shader在第一次循环检查后退出；整个背景关闭或页面隐藏时沿用暂停机制。reduced-motion不持续漂浮，已静止地形仍显示静态扭曲；拖动时由现有draw发送轻量通知更新一帧（关闭扭曲不通知GPU重绘）。背景生命周期仍只保留一个上下文。

后台「空间扭曲 / ON·OFF」与「吸积盘大小」0–100%（默认50%），单独恢复默认。示意大/小圆不参与物理或点击。当前浏览器个人设置沿用统一视觉配置键；公开默认沿用 data/visual-defaults.json 的 hollowEnabled:true、hollowSize:.5。更改后台不会更新所有访客或其他设备。

## 实际测试

Chrome安装版headless：tests/hollow.cjs 14项通过。冻结时钟后读取真实GL像素：ON/OFF有347167像素alpha变化，重新ON与原ON像素差0（该次随机地形）；人工查看同一画面ON/OFF截图，确认是现有等高线几何改变。每个实际球体的GPU中心与半径均匹配DOM，真实鼠标拖动后中心继续匹配。滑块85%跨标签页立即更新、刷新保持、关闭源数0、大小0源数0、恢复50%、手机视口与单画布通过。浅/深色截图已查看。

补测：扭曲关闭时100ms内球体几何读取0次，开启后48次（该次随机场景/帧调度）；120个带效果rAF样本中位16.7ms，非跨设备FPS或长期内存保证。390px管理页无水平溢出。

Topolines21项与Crosshair10项回归全部通过；完整旧套件54通过/8失败，仍为此前相同的词库数量/管理链路旧基准，未把这些失败标为通过。碰撞、惯性、边界与搜索相关回归通过。运行方式沿用本地8765服务 + 已有Playwright/Chrome，支持 PLAYWRIGHT_MODULE / TEST_URL。

Safari、Edge、iOS/iPadOS及触摸硬件本轮未实测；手机为Chrome视口模拟。使用WebGL1固定上限9源，保持无WebGL时纯色降级。未逐设备证明长时间GPU资源或耗电表现。
