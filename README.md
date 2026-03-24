# Auto Writer

[中文版](#中文版-1) | [English](#english)

---

## English

A Claude Code skill for automated daily content creation pipeline.

### Features

- **Multi-source Hot Topic Collection**: Weibo, Zhihu, Baidu, Toutiao, 36Kr
- **Intelligent Topic Selection**: 1/10 selection algorithm with creativity scoring
- **Automated Writing**: Framework-based content generation with SEO optimization
- **De-AI Processing**: Remove AI-style phrases and patterns
- **Multi-format Output**: 3 title styles + tags + summary
- **Smart Image Generation**: AI-powered cover and inline images
- **Multi-platform Support**: X (5:2) and WeChat Official Account (2.35:1)
- **JSON Report**: Structured execution results

### Content Coverage

| Domain | Description |
|--------|-------------|
| News | Breaking news and current events |
| Tech/AI | Technology and AI industry |
| Finance | Market trends and investment |
| Society | Social issues and trends |
| Knowledge | Educational content |
| Emotion | Emotional and personal stories |
| Entertainment/Sports | Pop culture and sports news |
| Enterprise | Business and corporate news |
| Personal | Personal growth and lifestyle |

### Workflow

```
Hot Topics → Analysis → Selection (1/10) → Framework → Writing
     ↓           ↓           ↓              ↓           ↓
  50+ topics  Scoring    1 selected    Structure    Draft
                           ↓
         SEO + De-AI → 3 Titles → Image Analysis → Images
              ↓            ↓              ↓           ↓
         Polished    Metadata      Prompts     Cover + Inline
                           ↓
                      Report → Publish
                           ↓
                   JSON Output
```

### Installation

```bash
# Clone to your Claude skills directory
cd ~/.claude/skills
git clone https://github.com/Aixxww/auto-writer.git
```

### Configuration

Create configuration file at `.auto-writer/EXTEND.md` or `~/.auto-writer/EXTEND.md`:

```yaml
author: "Your Name"
author_id: "your_id"

# Domain preferences
preferred_domains:
  - tech
  - finance

# Article style: depth_analysis, relaxed, sharp, warm, tutorial
default_style: depth_analysis

# Platforms
platforms:
  x:
    enabled: true
  wechat:
    enabled: true
```

See `references/config/extend-example.md` for full configuration options.

### Usage

```bash
# Run full pipeline
/auto-writer

# Run specific step
/auto-writer --step write

# Custom output directory
/auto-writer --output-dir ./articles

# Use custom config
/auto-writer --config /path/to/EXTEND.md
```

### File Structure

```
auto-writer/
├── SKILL.md                           # Main skill definition
├── README.md                          # Documentation
├── references/
│   ├── writing-techniques.md          # Writing hooks and styles
│   └── config/
│       └── extend-example.md          # Configuration example
└── scripts/
    ├── fetch-topics.ts                # Hot topic scraping
    ├── analyze-topics.ts              # Topic analysis and selection
    └── generate-report.ts             # Report generation
```

### Key Features Explained

#### 1/10 Selection Algorithm

Topics are scored on 5 dimensions:
- **Information Richness** (25%): Depth of content
- **Extension Space** (20%): Room for original insights
- **Timeliness** (20%): Relevance and freshness
- **Controversy** (15%): Discussion potential
- **Audience Breadth** (20%): Target audience size

#### De-AI Optimization

Avoids AI-style patterns:
- Transitional phrases: "首先、其次、然后、总之"
- Formula expressions: "让我们来看看...、值得注意的是..."
- Over-polished structures

Promotes human-like writing:
- Colloquial expressions
- Imperfect sentence structures
- Personal opinions and emotions
- Specific examples and real data

#### Three-Title System

| Type | Purpose | Example |
|------|---------|---------|
| Explosive | Click-through rate | "这条推文，24小时500万曝光" |
| Professional | Authority | "从数据看内容传播的逻辑" |
| Emotional | Resonance | "那些被算法埋没的好内容" |

### Requirements

- Claude Code or OpenClaw
- Bun runtime (for TypeScript scripts)
- Image generation API (optional)

### License

MIT

---

## 中文版

Claude Code 自动化写作技能，实现每日内容创作全流程。

### 功能特点

- **多源热点抓取**：微博、知乎、百度、今日头条、36Kr
- **智能选题**：1/10 选题算法，基于创作性评分
- **自动写作**：框架式内容生成，内置SEO优化
- **去AI味处理**：移除AI痕迹，提升人味
- **多格式输出**：3种标题风格 + 标签 + 摘要
- **智能配图**：AI生成封面图和插图
- **多平台支持**：X平台（5:2）、微信公众号（2.35:1）
- **JSON报告**：结构化执行结果

### 内容覆盖范围

| 领域 | 说明 |
|------|------|
| 时事新闻 | 突发新闻和热点事件 |
| 科技/AI | 科技和人工智能行业 |
| 财经 | 市场趋势和投资理财 |
| 社会 | 社会问题和趋势 |
| 知识 | 知识科普内容 |
| 情感 | 情感和个人故事 |
| 娱乐/体育 | 流行文化和体育新闻 |
| 企业 | 商业和企业动态 |
| 个人 | 个人成长和生活方式 |

### 工作流程

```
热点收集 → 分析 → 选题(1/10) → 框架 → 写作
     ↓       ↓        ↓         ↓       ↓
  50+热点  评分    选1条     结构    初稿
                  ↓
      SEO+去AI味 → 三标题 → 图片分析 → 配图
           ↓         ↓        ↓       ↓
        润色后    元数据   提示词   封面+内图
                  ↓
              报告 → 发布
                  ↓
            JSON输出
```

### 安装

```bash
# 克隆到 Claude skills 目录
cd ~/.claude/skills
git clone https://github.com/Aixxww/auto-writer.git
```

### 配置

在 `.auto-writer/EXTEND.md` 或 `~/.auto-writer/EXTEND.md` 创建配置文件：

```yaml
author: "你的名字"
author_id: "your_id"

# 领域偏好
preferred_domains:
  - tech
  - finance

# 文章风格：depth_analysis, relaxed, sharp, warm, tutorial
default_style: depth_analysis

# 平台
platforms:
  x:
    enabled: true
  wechat:
    enabled: true
```

完整配置选项见 `references/config/extend-example.md`。

### 使用方法

```bash
# 运行完整流程
/auto-writer

# 运行特定步骤
/auto-writer --step write

# 自定义输出目录
/auto-writer --output-dir ./articles

# 使用自定义配置
/auto-writer --config /path/to/EXTEND.md
```

### 文件结构

```
auto-writer/
├── SKILL.md                           # 主技能定义
├── README.md                          # 说明文档
├── references/
│   ├── writing-techniques.md          # 写作钩子和风格
│   └── config/
│       └── extend-example.md          # 配置示例
└── scripts/
    ├── fetch-topics.ts                # 热点抓取
    ├── analyze-topics.ts              # 热点分析和选题
    └── generate-report.ts             # 报告生成
```

### 核心功能详解

#### 1/10 选题算法

基于5个维度评分：
- **信息丰富度**（25%）：内容深度
- **创作空间**（20%）：原创观点空间
- **时效性**（20%）：相关性和新鲜度
- **争议性**（15%）：讨论潜力
- **受众广度**（20%）：目标受众规模

#### 去AI味优化

避免AI风格：
- 过渡词："首先、其次、然后、总之"
- 公式化表达："让我们来看看...、值得注意的是..."
- 过分工整的结构

提倡人味写作：
- 口语化表达
- 不完美句式
- 个人观点和情绪
- 具体案例和真实数据

#### 三标题系统

| 类型 | 目的 | 示例 |
|------|------|------|
| 爆点型 | 点击率 | "这条推文，24小时500万曝光" |
| 专业型 | 权威感 | "从数据看内容传播的逻辑" |
| 情感型 | 共鸣感 | "那些被算法埋没的好内容" |

### 依赖

- Claude Code 或 OpenClaw
- Bun 运行时（用于 TypeScript 脚本）
- 图片生成 API（可选）

### 开源协议

MIT
