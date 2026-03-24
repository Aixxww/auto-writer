---
name: auto-writer
description: 自动化写作技能，每日从多源抓取热点，智能选题，AI写作，SEO优化，自动配图，发布并生成JSON报告。Use when user asks to "每日写作", "自动写作", "热点文章", "auto write", "daily article", or runs /auto-writer.
version: 1.1.0
metadata:
  openclaw:
    homepage: https://github.com/anthropics/claude-code
    compatible: true
  requires:
    anyBins:
      - bun
      - npx
---

# Auto Writer - 自动化热点写作系统

端到端自动化写作流程：热点抓取 → 智能选题 → 内容创作 → SEO优化 → 自动配图 → 发布部署 → 结果汇报。

## 用户群体调性

默认针对 **X平台** 和 **微信公众号** 双平台优化：
- **X平台**：短平快、观点鲜明、转发性强、标签驱动
- **微信公众号**：深度阅读、排版精美、可配图、订阅粘性

## 热点内容覆盖

支持以下热点类型（不限于）：
- **时事新闻**：突发事件、官方通报、社会热点
- **科技/AI**：大模型、新产品、技术突破、行业动态
- **财经**：股市、经济政策、投资机会、加密货币
- **社会民生**：教育、医疗、住房、就业政策
- **知识科普**：历史、文化、心理学、技能方法
- **情感**：恋爱婚姻、亲子教育、人际心理、治愈内容
- **娱乐体育**：明星动态、影视综艺、赛事体育
- **企业/组织**：公司新闻、创业融资、品牌营销
- **个人**：人物故事、创业者、网红博主

## 兼容性

| 平台 | 状态 |
|------|------|
| Claude Code | ✅ 完全支持 |
| OpenClaw | ✅ 完全支持 |

## 工作流程

### Step 1: 热点抓取

从多个源头抓取当日热点：

**真实抓取模式**（需要网络/代理）：
```bash
# 使用 Bun 运行抓取脚本
cd ~/.claude/skills/auto-writer
bun scripts/fetch-hot.ts /tmp/auto-writer-hot
```

**OpenClaw 环境**（推荐）：
```bash
# 在 OpenClaw 中可直接调用 baoyu-url-to-markdown
/baoyu-url-to-markdown https://s.weibo.com/top/summary
/baoyu-url-to-markdown https://www.zhihu.com/hot
```

**数据源列表**：

| 源头 | 类型 | API/方式 | 备注 |
|------|------|----------|------|
| 微博热搜 | 社交 | `https://weibo.com/ajax/side/hotSearch` | 需登录Cookie |
| 知乎热榜 | 问答 | `https://www.zhihu.com/api/v3/feed/topstory/hot-list.json` | 免登录 |
| 今日头条 | 新闻 | `https://www.toutiao.com/hot-event/hot-board/` | 免登录 |
| 百度热搜 | 搜索 | `https://top.baidu.com/board?tab=realtime` | 免登录 |
| 36氪 | 科技 | `https://36kr.com/api/newsflashes` | 免登录 |
| 抖音热点 | 短视频 | 需登录 | 可选 |

**执行逻辑**：
1. 依次请求各热点源API（使用代理配置）
2. 解析JSON/HTML，提取标题、热度、链接
3. 合并去重（根据标题相似度阈值 > 0.8）
4. 保存到 `{output_dir}/01-hot-topics.json`

**输出示例**：
```json
{
  "fetch_time": "2026-03-24T08:00:00Z",
  "sources": ["weibo", "zhihu", "toutiao", "baidu", "36kr"],
  "topics": [
    {
      "id": "topic-001",
      "title": "DeepSeek-R2即将发布",
      "source": "weibo",
      "heat": 9823421,
      "url": "https://weibo.com/...",
      "category": null,
      "keywords": ["AI", "DeepSeek", "大模型"]
    }
  ],
  "total_count": 50
}
```

### Step 2: 热点分析与标注

对每个热点进行深度分析：

**2.1 领域分类**

自动识别热点所属领域（扩展覆盖）：

| 领域 | 标签 | 典型关键词 |
|------|------|-----------|
| 时事新闻 | `news` | 突发, 最新, 官方, 通报, 发布会 |
| 科技/AI | `tech` | AI, 大模型, GPT, DeepSeek, 互联网 |
| 财经 | `finance` | 股市, 经济, 投资, 加密货币, 基金 |
| 社会 | `society` | 政策, 教育, 医疗, 交通, 住房 |
| 知识 | `knowledge` | 科普, 历史, 文化, 心理学, 方法论 |
| 情感 | `emotion` | 恋爱, 婚姻, 亲子, 人际, 心理 |
| 娱乐体育 | `entertainment` | 明星, 电影, 综艺, 足球, 篮球 |
| 企业/组织 | `enterprise` | 公司, 创业, 融资, 裁员, 品牌 |
| 个人 | `person` | 人物, 创业者, 企业家, 博主 |

**2.2 可创作性评估**

从5个维度评分（各20分，满分100）：

| 维度 | 评分标准 |
|------|----------|
| 信息丰富度 | 是否有足够背景信息可展开 |
| 延展空间 | 是否能关联其他话题/知识 |
| 时效持久性 | 热度可持续时间（小时/天/周） |
| 争议深度 | 是否有可讨论的多方观点 |
| 受众广度 | 目标读者群体大小 |

**公式**：`可创作分 = 信息分 × 0.2 + 延展分 × 0.25 + 时效分 × 0.2 + 争议分 × 0.2 + 受众分 × 0.15`

**2.3 读者心理分析**

分析目标读者的心理诉求：

```
读者画像分析模板：
- 核心情绪: 好奇/焦虑/共鸣/认同/愤怒/恐吓
- 阅读动机: 获取信息/满足八卦/寻求认同/解决问题
- 预期收获: 知识增量/情绪价值/社交资本
- 传播意愿: 高/中/低（什么情况下会分享）
```

**输出**：保存到 `{output_dir}/02-topic-analysis.json`

### Step 3: 选题策略 (1/10 选中)

**3.1 筛选规则**

从所有热点中筛选出最适合创作的 1/10：

| 优先级 | 权重 | 条件 |
|--------|------|------|
| P0 | 40% | 可创作分 ≥ 75 |
| P1 | 25% | 热度排名前20% |
| P2 | 15% | 领域匹配用户偏好（见EXTEND.md） |
| P3 | 10% | 与用户历史选题不重复（去重率 < 0.3） |
| P4 | 10% | 预计完读率 > 60% |

**3.2 选题决策**

执行选题筛选，取前10%作为候选，最终选定1个。

**输出**：保存到 `{output_dir}/03-selected-topic.json`

### Step 4: 框架与风格设计

**4.1 文章框架模板**

根据领域自动选择框架：

| 领域 | 推荐框架 | 结构 |
|------|----------|------|
| 科技 | 问题解决型 | 现象→背景→分析→影响→结论 |
| 财经 | 数据驱动型 | 数据→现象→原因→预测→建议 |
| 娱乐 | 故事叙述型 | 引子→发展→高潮→反思 |
| 社会 | 观点分析型 | 事件→各方声音→深度解读→启发 |
| 争议话题 | 平衡论述型 | 事件→正方观点→反方观点→平衡结论 |

**4.2 风格设定**

支持风格：`depth_analysis`（深度分析）、`relaxed`（轻松）、`sharp`（犀利）、`warm`（温情）、`tutorial`（教程）

**输出**：保存到 `{output_dir}/04-outline.md`

### Step 5: 内容写作

按照框架进行写作：

**开篇钩子技巧**（详见 `references/writing-techniques.md`）：

| 钩子类型 | 使用场景 | 示例 |
|---------|---------|------|
| 痛点钩子 | 指出读者困惑 | "当你花了两小时写的文章只有3个阅读时..." |
| 数据钩子 | 震撼开篇 | "一条推文，24小时内带来500万次曝光。" |
| 场景钩子 | 具体场景吸引 | "凌晨三点，产品经理的微信突然亮了..." |
| 对比钩子 | 制造悬念 | "5年前ChatGPT需排队；今天每人手机都有AI。" |
| 疑问钩子 | 引发好奇 | "同样写大模型，为什么有人爆款不断？" |
| 故事钩子 | 小故事开场 | "去年11月，一个默默无闻的中国团队..." |
| 金句钩子 | 冲击力开篇 | "风口不是等来的，是看见的。" |

**内容节奏**：每篇文章至少2-3个情绪高潮（平静→高点→平静→高点→收尾）

**写作原则**：

1. **去AI味**（重要）
   - 避免使用：首先、其次、然后、总之、综上所述
   - 避免：让我们来看看...、值得注意的是...
   - 避免：过度使用排比句和工整对仗
   - 多用：口语化表达、不完美句式、情绪词
   - 多用：具体案例、真实数据、个人观点

2. **SEO优化**
   - 核心关键词：自然出现在前200字
   - 长尾关键词：小标题中合理分布
   - 关键词密度：2-4%之间

3. **读者体验**
   - 段落长度：移动端每段不超过4行
   - 小标题间隔：每300-500字
   - 重点加粗：关键信息/金句

**输出**：保存到 `{output_dir}/05-draft.md`

### Step 6: 内容润色

**去AI味检查**：

| AI特征 | 修正方法 |
|--------|----------|
| 句式工整 | 打破对称，增加不规则表达 |
| 过度总结 | 删除冗余总结，直接收尾 |
| 空洞过渡 | 用具体细节替代"值得注意的是"|
| 全知视角 | 加入"我认为"、"在我看来"等主观视角 |

**SEO检查**：标题关键词、开头200字、小标题优化

**输出**：保存到 `{output_dir}/06-polished.md`

### Step 7: 三标题生成

生成3种风格的标题：

| 类型 | 特点 |
|------|------|
| 爆点型 | 点击率优先 |
| 专业型 | 权威感 |
| 情感型 | 共鸣感 |

**标签系统**：自动生成 **3-5个标签**（1领域+2-3关键词+可选时效）

**摘要**：150-200字，包含核心话题、主要内容、价值亮点

**输出**：保存到 `{output_dir}/07-metadata.json`

### Step 8: 配图分析与生成

**8.1 封面图规格**（双平台适配）

| 平台 | 比例 | 推荐尺寸 |
|------|------|----------|
| X平台 | **5:2** | 1920×768 |
| 微信公众号 | **2.35:1** | 2400×1023 |
| 通用默认 | **16:9** | 1920×1080 |

**8.2 配图位置分析**

| 位置 | 触发条件 | 配图目的 |
|------|----------|----------|
| 封面（双规格） | 所有文章 | 吸引点击 |
| 位置1（开头后） | 信息密集段落后 | 视觉休息/数据可视化 |
| 位置2（中段） | 概念解释/流程说明 | 辅助理解 |
| 位置3（结尾前） | 情感高潮/金句 | 情绪强化 |

**8.3 调用 baoyu-image-gen**

使用已配置的 `baoyu-image-gen` 生成配图：
- 封面图：2张（X平台5:2 + 微信2.35:1）
- 内图：2-3张（16:9）

**输出**：保存到 `{output_dir}/images/`

### Step 9: 复核检查

**排版检查**：段落间距、标题层级、图片位置、加粗使用

**人味检查**：个人观点、情绪起伏、具体案例、口语化、无AI过渡句

**输出**：更新 `{output_dir}/06-polished.md`，保存 `{output_dir}/08-review.md`

### Step 10: 发布

支持平台：**X平台**、**微信公众号**、掘金、知乎专栏、简书、语雀

**发布流程**：上传图片 → 替换路径 → 发布文章 → 获取链接

**双平台发布**：可同时发布到X和微信公众号

**输出**：保存 `{output_dir}/09-published.json`

### Step 11: 生成JSON报告

最终生成完整执行报告：

```json
{
  "execution_id": "auto-writer-20260324-080000",
  "timestamp": "2026-03-24T08:30:00Z",
  "status": "success",
  "article": {
    "title": "主标题",
    "title_alternatives": ["备选标题1", "备选标题2"],
    "summary": "摘要内容（100-150字）",
    "tags": ["标签1", "标签2", "标签3"],
    "word_count": 2847
  },
  "images": {
    "cover": {
      "wechat": "path/to/cover-5-2.png",
      "x_platform": "path/to/cover-2.35-1.png"
    },
    "inline_images": [
      {"position": "开头后", "path": "path/to/image-1.png"},
      {"position": "中段", "path": "path/to/image-2.png"},
      {"position": "结尾前", "path": "path/to/image-3.png"}
    ]
  },
  "draft": {
    "path": "path/to/06-polished.md"
  },
  "selection_rationale": {
    "creativity_score": 82,
    "heat_rank": 3,
    "reason": "高热度+高可创作性+领域匹配+流量密码"
  },
  "publish": {
    "platforms": ["wechat", "x"],
    "urls": {
      "x": "https://x.com/user/status/xxx",
      "wechat": "https://mp.weixin.qq.com/s/xxx"
    },
    "status": "published"
  }
}
```

## 配置 (EXTEND.md)

首次使用需配置偏好。配置文件路径优先级：
1. `.auto-writer/EXTEND.md`（项目目录）
2. `~/.auto-writer/EXTEND.md`（用户目录）

**配置示例**：`references/config/extend-example.md`

**主要配置项**：
| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| preferred_domains | 领域偏好 | []（不限制） |
| excluded_domains | 排除领域 | [] |
| default_style | 写作风格 | depth_analysis |
| article_length | 文章长度 | medium |
| platforms.x.enabled | X平台启用 | true |
| platforms.wechat.enabled | 微信启用 | true |
| images.cover.x_platform.ratio | X封面比例 | 5:2 |
| images.cover.wechat.ratio | 微信封面比例 | 2.35:1 |
| images.inline.count | 内图数量 | 2 |

## 使用方式

```bash
# 完整流程
/auto-writer

# 仅执行特定步骤
/auto-writer --step fetch     # 仅抓取热点
/auto-writer --step select    # 仅选题
/auto-writer --step write     # 仅写作
/auto-writer --step images    # 仅配图
/auto-writer --step publish   # 仅发布
/auto-writer --step report    # 生成报告

# 指定输出目录
/auto-writer --output-dir ./my-articles/20260324

# 定时执行（每天早8点）
/auto-writer --schedule "0 8 * * *"
```

## 输出文件结构

```
{output_dir}/
├── 01-hot-topics.json      # 原始热点
├── 02-topic-analysis.json  # 分析结果
├── 03-selected-topic.json  # 选定选题
├── 04-outline.md           # 文章大纲
├── 05-draft.md             # 初稿
├── 06-polished.md          # 润色正文
├── 07-metadata.json        # 标题/标签/摘要
├── 08-review.md            # 复核报告
├── 09-published.json       # 发布结果
├── 10-report.json          # 最终报告
└── images/
    ├── cover.png           # 封面图
    ├── image-1.png         # 内图1
    ├── image-2.png         # 内图2
    └── image-3.png         # 内图3
```
