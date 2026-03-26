# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

「你能过几关」— 脑洞益智挑战微信小游戏，目标通过广告变现。包含 80 关，涵盖脑筋急转弯、冷知识、找不同字、传感器交互等多种玩法。

## 技术栈

- 微信小程序原生开发
- 纯前端，无后端依赖
- 包管理器：npm
- 开发工具：微信开发者工具

## 常用命令

```bash
npm install              # 安装依赖
npm run dev              # 开发模式（需在微信开发者工具中运行）
npm run build            # 构建生产版本
npm test                 # 运行测试
```

## 架构

```
src/
├── app.js / app.json / app.wxss   - 小程序入口和全局样式
├── pages/
│   ├── index/          - 首页（进度展示、开始/继续/选关、排行榜、音效开关）
│   ├── game/           - 核心游戏页（加载关卡、处理答题和交互逻辑）
│   ├── result/         - 通关结果页（完成数、评语、分享）
│   └── share/          - 分享落地页
├── components/
│   ├── QuestionCard/   - 题目卡片组件
│   ├── OptionButton/   - 选项按钮组件
│   ├── ShareCard/      - 分享卡片组件
│   ├── AdBanner/       - 广告 Banner 组件
│   └── Leaderboard/    - 排行榜组件
├── utils/
│   ├── storage.js      - 本地存储封装（进度、设置、统计）
│   ├── level-manager.js - 关卡加载、进度跟踪、解锁逻辑
│   ├── ad-manager.js   - 广告管理（激励视频、插屏、Banner）
│   ├── sensor-manager.js - 传感器管理（加速度计、陀螺仪）
│   ├── share-manager.js - 分享配置生成
│   ├── share-image.js  - Canvas 动态生成分享图
│   └── audio-manager.js - 音效管理（正确/错误/点击）
├── data/
│   ├── levels.json     - 80 关关卡数据
│   └── share-texts.json - 分享文案模板
├── audio/              - 音效文件（correct/wrong/click.mp3）
└── images/             - 图片资源
docs/                   - 项目文档（市场调研等）
tests/                  - 测试
```

## 关卡类型

| 类型 | 说明 | 交互方式 |
|------|------|----------|
| `riddle` | 脑筋急转弯 | 选择题 |
| `trivia` | 冷知识问答 | 选择题 |
| `text_trap` | 找不同字 | 点击正确字符（`tap_char`） |
| `interactive` | 交互式玩法 | 多种，见下 |

### Interactive 交互方法
`shake` 摇一摇、`tilt` 倾斜手机、`flip` 翻转手机、`color_wait` 变色按钮定时点击、`lights_puzzle` 关灯游戏、`sequence_tap` 顺序点击、`scratch` 擦除、`drag_text` 拖拽文字、`drag_element` 拖拽元素、`multi_touch` 多指触控、`input_answer` 输入答案、`pinch_zoom` 双指放大、`trick_choice` 陷阱选项、`swipe` 滑动、`tap_text` 点击文字

## 广告策略

- 前 5 关无广告
- 第 6 关起每 5 关展示插屏广告
- 提示功能需看激励视频解锁
- 广告 ID 为占位符（`adunit-placeholder-*`），上线前需替换

## 小程序开发要点

- 避免频繁 setData，合并数据更新以优化性能
- 首屏加载目标 < 2 秒，图片用 webp 格式
- 广告不能阻断核心功能，首次加载不弹插屏

## 交流与命名约定

- 用中文交流，代码注释用英文（JSDoc 格式）
- Commit message 用中文，格式 `type(scope): 描述`
- 分支：feature/xxx 和 fix/xxx 从 main 拉取
