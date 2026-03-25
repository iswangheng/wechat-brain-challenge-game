# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

微信小游戏项目（wechat-game），目标通过广告变现。当前状态：**市场调研中**，确定具体游戏品类后再开发。

## 技术栈

- 微信小程序原生开发（可引入 WeUI）
- 后端：微信云开发优先，复杂逻辑用 Node.js + Express
- 数据库：云数据库优先，复杂查询用 MySQL
- 包管理器：npm
- 开发工具：微信开发者工具

## 常用命令

```bash
npm install              # 安装依赖
npm run dev              # 开发模式（需在微信开发者工具中运行）
npm run build            # 构建生产版本
npm test                 # 运行测试
npm run deploy:cloud     # 部署云函数
```

## 架构

```
src/pages/       - 小程序页面（kebab-case 命名，如 home-page.wxml）
src/components/  - 组件（PascalCase 命名，如 UserCard.wxml）
src/utils/       - 工具函数
src/services/    - API 调用服务层
src/config/      - 配置文件
cloud/functions/ - 云函数（后端）
cloud/database/  - 数据库配置
config/          - 环境配置（dev.json / prod.json）
docs/            - 所有项目文档集中管理
tests/           - 测试（unit/ integration/ e2e/）
```

## 小程序开发要点

- 避免频繁 setData，合并数据更新以优化性能
- 首屏加载目标 < 2 秒，图片用 webp 格式
- 广告位：首页 banner（顶部）、结果页插屏（计算后展示）、底部 banner；广告不能阻断核心功能，首次加载不弹插屏

## 交流与命名约定

- 用中文交流，代码注释用英文（JSDoc 格式）
- Commit message 用中文，格式 `type(scope): 描述`
- 分支：feature/xxx 和 fix/xxx 从 dev 拉取
