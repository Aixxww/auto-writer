# Auto Writer 配置示例

将此文件复制到以下位置之一进行配置：
1. `.auto-writer/EXTEND.md`（项目目录，优先级高）
2. `~/.auto-writer/EXTEND.md`（用户目录，全局配置）

---

## 基础配置

```yaml
# 用户信息
author: "你的名字"
author_id: "your_id"

# 输出目录（可选，默认 ./output）
output_dir: "./articles"

# 代理设置（可选）
proxy:
  http: "http://127.0.0.1:7890"
  https: "http://127.0.0.1:7890"
```

---

## 内容偏好配置

```yaml
# 领域偏好（可选，不设置则不限制）
# 支持的领域：tech, finance, society, entertainment, sports, international
preferred_domains:
  - tech
  - finance

# 排除领域（可选）
excluded_domains:
  - entertainment

# 写作风格（可选）
# 支持：depth_analysis（深度分析）, relaxed（轻松）, sharp（犀利）, warm（温情）, tutorial（教程）
default_style: depth_analysis

# 文章长度（可选）
# 支持：short（500-800字）, medium（1000-1500字）, long（2000-3000字）
article_length: medium

# 是否启用争议性话题（可选）
allow_controversial: true
```

---

## 平台配置

```yaml
# X平台配置
platforms:
  x:
    enabled: true
    auto_publish: false  # 是否自动发布
    tags_count: 4  # 标签数量（3-5个）

# 微信公众号配置
  wechat:
    enabled: true
    auto_publish: false
    cover_ratio: "2.35:1"  # 封面图比例

# 其他平台（可选）
  juejin:
    enabled: false
  zhihu:
    enabled: false
```

---

## 热点抓取配置

```yaml
# 热点源配置（可选，默认全部启用）
hot_sources:
  weibo:
    enabled: true
    cookie: ""  # 可选，登录后的cookie
  zhihu:
    enabled: true
  baidu:
    enabled: true
  toutiao:
    enabled: true
  "36kr":
    enabled: true

# 热点去重阈值（0-1，默认0.8）
dedup_threshold: 0.8

# 最大抓取数量（可选，默认50）
max_topics: 50
```

---

## 图片生成配置

```yaml
# 图片生成设置
images:
  # 封面图
  cover:
    x_platform:
      ratio: "5:2"
      width: 1920
      height: 768
    wechat:
      ratio: "2.35:1"
      width: 2400
      height: 1023

  # 内容插图
  inline:
    count: 2  # 插图数量（0-3）
    ratio: "16:9"
    width: 1920
    height: 1080

  # 图片风格
  style: "minimalist"  # minimalist, colorful, dark, professional

# 图片生成API（使用 baoyu-image-gen）
image_gen:
  provider: google  # openai, google, openrouter, dashscope
  model: gemini-3-pro-image-preview
  quality: 2k
```

---

## 发布配置

```yaml
# 发布设置
publish:
  # 自动发布（需要配置API密钥）
  auto_publish: false

  # 发布时间（本地时间）
  schedule:
    x: "09:00"
    wechat: "10:00"

  # 发布确认
  require_confirmation: true  # 发布前需要确认

# API密钥（如需自动发布）
api_keys:
  x:
    api_key: ""
    api_secret: ""
    bearer_token: ""
  wechat:
    app_id: ""
    app_secret: ""
```

---

## 高级配置

```yaml
# SEO优化设置
seo:
  keyword_density: 0.03  # 关键词密度（2-4%）
  title_max_length: 30  # 标题最大字数
  summary_length: 150  # 摘要字数

# 去AI味设置
de_ai:
  remove_transitions: true  # 移除过渡词
  add_personal_opinion: true  # 添加个人观点
  colloquial_level: medium  # 口语化程度：low, medium, high

# 定时任务（可选）
schedule:
  enabled: false
  cron: "0 8 * * *"  # 每天早8点执行
```

---

## 完整配置示例

```yaml
author: "张三"
author_id: "zhangsan"

output_dir: "./daily-articles"

proxy:
  http: "http://127.0.0.1:7890"
  https: "http://127.0.0.1:7890"

preferred_domains:
  - tech
  - finance

default_style: depth_analysis
article_length: medium

platforms:
  x:
    enabled: true
    auto_publish: false
  wechat:
    enabled: true
    auto_publish: false

hot_sources:
  weibo:
    enabled: true
  zhihu:
    enabled: true
  baidu:
    enabled: true
  toutiao:
    enabled: true
  "36kr":
    enabled: true

images:
  cover:
    x_platform:
      ratio: "5:2"
    wechat:
      ratio: "2.35:1"
  inline:
    count: 2
    ratio: "16:9"

image_gen:
  provider: google
  quality: 2k

publish:
  auto_publish: false
  require_confirmation: true

seo:
  keyword_density: 0.03
  title_max_length: 30

de_ai:
  remove_transitions: true
  add_personal_opinion: true
```

---

## 配置优先级

1. 命令行参数（最高）
2. 项目目录 `.auto-writer/EXTEND.md`
3. 用户目录 `~/.auto-writer/EXTEND.md`
4. 默认值（最低）

---

## 使用方式

```bash
# 使用项目配置
cd your-project
/auto-writer

# 使用用户目录配置
/auto-writer --output-dir ~/articles

# 指定配置文件
/auto-writer --config /path/to/EXTEND.md

# 仅执行特定步骤
/auto-writer --step write
```
