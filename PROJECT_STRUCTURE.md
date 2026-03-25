# 项目结构规范

## 目录结构

```
wechat-project-01/
├── docs/                   # 文档目录
│   ├── market-research.md  # 市场调研报告
│   ├── requirements.md     # 需求文档
│   ├── design.md          # 设计文档
│   ├── api.md             # API 接口文档
│   └── deployment.md      # 部署文档
│
├── src/                   # 源代码目录
│   ├── pages/            # 小程序页面
│   ├── components/       # 组件
│   ├── utils/            # 工具函数
│   ├── services/         # 服务层（API调用）
│   ├── styles/           # 样式文件
│   └── config/           # 配置文件
│
├── cloud/                # 云函数（后端）
│   ├── functions/        # 云函数
│   └── database/         # 数据库配置
│
├── scripts/              # 脚本目录
│   ├── build.sh         # 构建脚本
│   ├── deploy.sh        # 部署脚本
│   └── init.sh          # 初始化脚本
│
├── tests/               # 测试目录
│   ├── unit/           # 单元测试
│   ├── integration/    # 集成测试
│   └── e2e/            # 端到端测试
│
├── assets/             # 静态资源
│   ├── images/        # 图片
│   └── icons/         # 图标
│
├── config/            # 项目配置
│   ├── dev.json      # 开发环境配置
│   └── prod.json     # 生产环境配置
│
├── .gitignore
├── package.json
├── project.config.json  # 微信小程序配置
└── README.md
```

## 命名规范

### 文件命名
- 页面文件：kebab-case (例：home-page.wxml)
- 组件文件：PascalCase (例：UserCard.wxml)
- 工具函数：camelCase (例：formatDate.js)
- 常量文件：UPPER_SNAKE_CASE (例：API_CONFIG.js)

### 代码规范
- 变量命名：camelCase
- 常量命名：UPPER_SNAKE_CASE
- 函数命名：camelCase，动词开头
- 组件命名：PascalCase

## 文档规范

### 必备文档
1. **market-research.md** - 市场调研
2. **requirements.md** - 功能需求
3. **design.md** - 技术设计
4. **api.md** - 接口文档
5. **deployment.md** - 部署指南

### 文档格式
- 使用 Markdown 格式
- 包含目录结构
- 代码示例使用代码块
- 及时更新版本号和修改日期

## Git 规范

### Commit Message
格式：`type(scope): description`

Types:
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- test: 测试相关
- chore: 构建/工具变动

### 分支管理
- main: 主分支
- dev: 开发分支
- feature/*: 功能分支
- fix/*: 修复分支

## 测试规范

- 单元测试覆盖率 > 80%
- 关键功能必须有测试
- 测试文件与源文件同名，后缀 .test.js

## 代码审查

每次提交前检查：
- [ ] 代码符合规范
- [ ] 注释完整（英文）
- [ ] 测试通过
- [ ] 文档已更新
