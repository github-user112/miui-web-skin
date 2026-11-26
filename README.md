# 网页 MIUI 化 · 小米浏览器扩展程序

粉丝自制怀旧互动，**非小米官方发布**。Manifest V3，纯本地静态资源，无外链、无 SDK、无账号、无数据上传。

## 发布信息（已定稿）

- **名称**：`网页 MIUI 化`
- **描述**（提交时填写）：一键把任意网页换成 MIUI 风格：复古 MIUI 1、扁平 MIUI 6、灵动 HyperOS 三套主题，橙色强调色、圆角卡片、复古图标贴纸与状态条。粉丝自制，非小米官方发布；设置仅保存在本机。
- **场景标签**：创意扩展程序

## 交付物

| 文件 | 说明 |
| --- | --- |
| `miui-web-skin.zip` | 提交包，11.4 KB，9 个文件，`manifest.json` 在根目录 |
| `demo.mp4` | 演示视频：1080×1440，3:4 竖版，14 秒，2.46 MB |
| `preview-retro/flat/hyper.png` | 三套主题效果预览图 |
| `preview-custom.png` | 自定义强调色 + 圆角效果预览 |
| `manifest.json` / `content.js` / `skin.css` / `popup.*` / `icons/` | 扩展源码 |
| `build.sh` | 重新打包并自检（含禁用 API / 外链 / 权限扫描） |
| `demo.html` / `make_video.py` | 演示页与视频生成脚本（不进 ZIP） |

## 功能

- **三套主题**：MIUI 1 复古（暖色纸张、方角、扫描线）、MIUI 6 扁平（橙白、圆角）、HyperOS 灵动（深色玻璃、渐变发光）
- **自定义强调色**：5 个预设色 + 原生取色器自定义 HEX，通过 CSS 变量即时覆盖主题默认色
- **圆角强度**：8 / 12 / 20 / 28px 四档，或恢复为当前主题默认值
- **五个细节开关**：强调色、卡片圆角、图标贴纸、MIUI 状态条、角落米粉角标
  - 图标贴纸**默认关闭**，避免覆盖真实站点自己的按钮图标；需要时可在 popup 打开
- 设置为**全局设置**，对所有授权网页和已打开的页面同步生效；点「恢复网页原样」会移除全部 `data-miui-*` 属性与自定义变量
- 输入数据：仅 `chrome.storage.local` 的 `skin` / `accent` / `radius` / `features` 四个键，不读取浏览历史、Cookie、URL，不联网

## 技术实现与审查修复

已完成一轮只读代码审查并修复：

- 按钮只改 `background-color`，不再用 `background` 简写清空站点图标；跳过 `:disabled`
- 图标贴纸默认关闭，且改为在按钮文字后追加 `::after`，不覆盖站点 `::before` 图标
- HyperOS 深色对常见内容容器成对设置深底浅字；文字覆盖规则收窄为**直接子元素**，避免把浅色文字落到未被深色化的白底容器上
- 不再对 `article/section/aside/.box` 强制面板背景与阴影，只作用于 `.card` / `.panel`
- 注入的状态条与角标样式全部限定在 `#miui-web-skin-overlay` 内；容器 class 不会与站点冲突
- 所有 `color-mix()` 都补了普通颜色兜底；链接在 HyperOS 下保留强调色
- popup 改为内存态写入，修复快速连点丢失设置的竞态；补 `storage.onChanged` 与 `runtime.lastError` 处理
- 内容脚本加重复注入守卫；站点重建 body 后角标会自动恢复；关闭主题时清理全部属性与 CSS 变量
- 打包脚本改为显式文件清单，修正图标 PASS 误报，补充外链 / `eval` / inline 事件 / 禁用 API / 权限检查

## 本地检查与预览

```bash
cd ~/workspace/miui-web-skin
python3 -m http.server 8901
# demo.html 可看效果；扩展本身需在小米浏览器导入 ZIP 后使用
```

## 安装与真机验收（必须你自己做）

1. 把 `miui-web-skin.zip` 放到手机或 Pad 可选择的文件夹。
2. 打开**小米浏览器 → 扩展程序页 → 导入本地扩展文件**，选择该 ZIP（无需解压、不需要开发者模式）。
3. 打开任意 http/https 网页并刷新，点击扩展入口：切换三套主题、试自定义色与圆角、逐个试开关。
4. 关闭主题后页面应完全恢复原样；重新打开 popup、刷新页面、重启浏览器后设置应保留。

> `demo.mp4` 与 `preview-*.png` 是用桌面 Chromium + 模拟页面生成的**效果演示素材**，不是小米浏览器真机截图。官方规范不接受桌面 Chrome 截图代替参赛验收。请把它们替换为至少一端（手机或 Pad）在小米浏览器上的真实运行截图与视频后再提交。

## 已知限制

- 主题样式通过通用选择器作用于授权网页。HyperOS 深色对 `header/nav/main/article/section/aside/footer` 及常见容器类做了成对配色，但极少数使用私有容器类且自带浅底深字的站点仍可能出现对比度问题；请在真机多找几个站点确认。
- 图标贴纸默认关闭；开启后在少数用 `::after` 做图标的按钮上可能追加一个装饰字符。
- 状态条 fixed 覆盖页面顶部 26px（`pointer-events:none`，不影响点击）；复古扫描线为全屏视觉层。
- 未使用 downloads、sidePanel、tabs 等额外权限；`downloads` 在 Pad 不可用，因此没有依赖它。
- 提交后不支持更新：真机验证完成后再上传最终 ZIP、截图和视频（三者须对应同一版本 1.0.0）。
