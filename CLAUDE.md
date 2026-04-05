# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

「你能过几关」— 脑洞益智挑战微信小游戏，目标通过广告变现。包含 80 关，涵盖脑筋急转弯、冷知识、找不同字、传感器交互等多种玩法。

## 技术栈

- **微信小游戏**（`compileType: "game"`）
- 原生 Canvas 2D 渲染（无游戏引擎）
- 纯前端，无后端依赖
- 开发工具：微信开发者工具（小游戏模式）

## 架构

```
├── game.js                - 小游戏入口（Canvas 初始化、游戏循环、触摸路由）
├── game.json              - 小游戏配置
├── project.config.json    - 项目配置
├── js/
│   ├── base/
│   │   ├── canvas-adapter.js   - Canvas 适配（DPR、屏幕尺寸）
│   │   └── scene-manager.js    - 场景管理器（注册/切换/渲染/触摸分发）
│   ├── scenes/
│   │   ├── home-scene.js       - 首页场景（进度、开始/继续、音效开关）
│   │   ├── game-scene.js       - 核心游戏场景（80关全部玩法）
│   │   └── result-scene.js     - 结果场景（通关数、评语、导航）
│   ├── ui/
│   │   └── components.js       - Canvas UI 组件（Button/Text/ProgressBar/Card）
│   └── utils/
│       ├── storage.js          - 本地存储封装（进度、设置、统计）
│       ├── level-manager.js    - 关卡加载、进度跟踪、解锁逻辑
│       ├── ad-manager.js       - 广告管理（激励视频、插屏）
│       ├── sensor-manager.js   - 传感器管理（加速度计、陀螺仪）
│       └── audio-manager.js    - 音效管理（正确/错误/点击）
├── data/
│   └── levels.js               - 80 关关卡数据（JS 模块）
├── audio/                      - 音效文件（correct/wrong/click.mp3）
└── docs/                       - 项目文档
```

## 关卡类型

| 类型 | 说明 | 交互方式 |
|------|------|----------|
| `riddle` | 脑筋急转弯 | 选择题（A/B/C/D） |
| `trivia` | 冷知识问答 | 选择题 |
| `text_trap` | 找不同字 | 点击字符网格中的不同字 |
| `interactive` | 交互式玩法 | 15 种交互方式，见下 |

### Interactive 交互方法
`shake` 摇一摇、`tilt` 倾斜手机、`flip` 翻转手机、`color_wait` 变色按钮定时点击、`lights_puzzle` 关灯游戏、`sequence_tap` 顺序点击、`scratch` 擦除、`drag_text` 拖拽文字、`drag_element` 拖拽元素、`multi_touch` 多指触控、`input_answer` 输入答案、`pinch_zoom` 双指放大、`trick_choice` 陷阱选项、`swipe` 滑动、`tap_text` 点击文字

## 广告策略

- 前 5 关无广告
- 第 6 关起每 5 关展示插屏广告
- 提示功能需看激励视频解锁
- 广告 ID 为占位符（`adunit-placeholder-*`），上线前需替换

## 小游戏开发要点

- 所有渲染通过 Canvas 2D API（fillRect/fillText/arc 等），无 DOM/WXML
- 场景切换通过 SceneManager.switchTo(name, params)
- 触摸事件通过 wx.onTouchStart/Move/End 全局监听，由 SceneManager 分发到当前场景
- 游戏循环使用 requestAnimationFrame
- 传感器交互（shake/tilt/flip）需真机测试，模拟器不可用

## 交流与命名约定

- 用中文交流，代码注释用英文（JSDoc 格式）
- Commit message 用中文，格式 `type(scope): 描述`
- 分支：feature/xxx 和 fix/xxx 从 main 拉取
