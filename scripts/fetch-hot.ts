#!/usr/bin/env bun
/**
 * 热点抓取脚本 - 集成 6551 API + 本地缓存
 * 支持多种数据源，自动读取 OpenClaw cron 任务缓存
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";

// 配置
const OPENCLAW_CACHE = "/Users/aixx/.openclaw/workspace/cache";
const OUTPUT_DIR = "/tmp/auto-writer-hot";

interface HotTopic {
  rank: number;
  title: string;
  source: string;
  domain: string;
  url?: string;
  metrics?: {
    likes?: number;
    retweets?: number;
    views?: number;
  };
}

// 判断领域
function detectDomain(title: string): string {
  const keywords: Record<string, string[]> = {
    tech: ["AI", "GPT", "Claude", "芯片", "模型", "DeepSeek", "科技", "互联网", "OpenAI", "Anthropic", "Cursor", "GitHub"],
    finance: ["股价", "股市", "投资", "基金", "股票", "财经", "金融", "经济", "IPO", "billion"],
    society: ["社会", "政策", "教育", "医疗", "住房", "就业", "jobs"],
    entertainment: ["明星", "电影", "综艺", "音乐", "娱乐"],
    sports: ["足球", "篮球", "比赛", "冠军", "奥运", "体育"],
    international: ["美国", "日本", "国际", "外交", "全球", "world"]
  };

  const lowerTitle = title.toLowerCase();
  for (const [domain, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (lowerTitle.includes(word.toLowerCase()) || title.includes(word)) return domain;
    }
  }
  return "other";
}

// 从 OpenClaw 缓存读取 Twitter 热点
async function readTwitterCache(): Promise<HotTopic[]> {
  const cacheFile = join(OPENCLAW_CACHE, "twitter_hot_samples.json");

  try {
    await access(cacheFile);
    const content = await readFile(cacheFile, "utf-8");
    const data = JSON.parse(content);

    if (data.status !== "ok" || !data.raw) {
      console.log("Twitter cache: 无有效数据");
      return [];
    }

    const topics: HotTopic[] = [];
    let rank = 1;

    // 从 raw 数据中提取热门推文
    for (const result of data.raw) {
      if (result.status !== "ok" || !result.tweets) continue;

      for (const tweet of result.tweets.slice(0, 5)) {
        const title = tweet.text?.substring(0, 100) || "";
        if (!title) continue;

        topics.push({
          rank: rank++,
          title: title.replace(/\n/g, " ").trim(),
          source: "twitter_6551",
          domain: detectDomain(title),
          url: `https://x.com/status/${tweet.id}`,
          metrics: {
            likes: tweet.favoriteCount || tweet.retweetCount || 0,
            retweets: tweet.retweetCount || 0,
            views: 0
          }
        });
      }
    }

    console.log(`Twitter缓存: ${topics.length} 条热点`);
    return topics;
  } catch (error) {
    console.log(`Twitter缓存读取失败: ${error}`);
    return [];
  }
}

// 从 OpenClaw 缓存读取 Binance 加密货币热点
async function readBinanceCache(): Promise<HotTopic[]> {
  const cacheFile = join(OPENCLAW_CACHE, "binance_crypto_hot_tokens.json");

  try {
    await access(cacheFile);
    const content = await readFile(cacheFile, "utf-8");
    const data = JSON.parse(content);

    if (!data.hot_tokens) {
      console.log("Binance cache: 无有效数据");
      return [];
    }

    const topics: HotTopic[] = [];
    let rank = 1;

    for (const token of data.hot_tokens.slice(0, 5)) {
      topics.push({
        rank: rank++,
        title: `${token.symbol || token.name} 价格上涨 ${(token.change || 0).toFixed(1)}%`,
        source: "binance",
        domain: "finance",
        url: `https://www.binance.com/zh-CN/trade/${token.symbol}`
      });
    }

    console.log(`Binance缓存: ${topics.length} 条热点`);
    return topics;
  } catch (error) {
    console.log(`Binance缓存读取失败: ${error}`);
    return [];
  }
}

// 备用热点（当缓存为空时）
function getFallbackData(): HotTopic[] {
  return [
    { rank: 1, title: "OpenAI reportedly offering 17.5% guaranteed return to investors", source: "fallback", domain: "tech" },
    { rank: 2, title: "SoftBank tests borrowing limits with $30bn bet on OpenAI", source: "fallback", domain: "finance" },
    { rank: 3, title: "Anthropic launches Science Blog to accelerate research", source: "fallback", domain: "tech" },
    { rank: 4, title: "Cursor taking on Anthropic and OpenAI with new AI coding model", source: "fallback", domain: "tech" },
    { rank: 5, title: "Google Gemini app coming to Apple Mac lineup", source: "fallback", domain: "tech" }
  ];
}

// 去重合并
function deduplicateTopics(topics: HotTopic[]): HotTopic[] {
  const seen = new Set<string>();
  return topics.filter(topic => {
    const key = topic.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 主函数
async function main() {
  const outputDir = process.argv[2] || OUTPUT_DIR;
  await mkdir(outputDir, { recursive: true });

  console.log("=== 热点抓取开始 ===");
  console.log(`输出目录: ${outputDir}`);

  // 读取所有缓存
  const twitterTopics = await readTwitterCache();
  const binanceTopics = await readBinanceCache();

  // 合并
  let allTopics = [...twitterTopics, ...binanceTopics];

  // 如果缓存为空，使用备用数据
  if (allTopics.length === 0) {
    console.log("缓存为空，使用备用数据");
    allTopics = getFallbackData();
  }

  // 去重
  const uniqueTopics = deduplicateTopics(allTopics);

  // 按热度排序（有 metrics 的优先）
  uniqueTopics.sort((a, b) => {
    const scoreA = (a.metrics?.likes || 0) + (a.metrics?.retweets || 0) * 2;
    const scoreB = (b.metrics?.likes || 0) + (b.metrics?.retweets || 0) * 2;
    return scoreB - scoreA;
  });

  // 重新编号
  uniqueTopics.forEach((topic, index) => {
    topic.rank = index + 1;
  });

  // 保存 JSON
  const report = {
    timestamp: new Date().toISOString(),
    total: uniqueTopics.length,
    sources: ["twitter_6551", "binance", "fallback"],
    topics: uniqueTopics
  };

  await writeFile(
    join(outputDir, "hot-topics.json"),
    JSON.stringify(report, null, 2)
  );

  // 保存 Markdown
  const mdContent = generateMarkdown(uniqueTopics);
  await writeFile(join(outputDir, "01-topics.md"), mdContent);

  console.log(`\n=== 抓取完成 ===`);
  console.log(`保存了 ${uniqueTopics.length} 条热点`);
  console.log(`JSON: ${join(outputDir, "hot-topics.json")}`);
  console.log(`Markdown: ${join(outputDir, "01-topics.md")}`);
}

function generateMarkdown(topics: HotTopic[]): string {
  const lines = [
    `# 热点话题列表 (${new Date().toLocaleDateString("zh-CN")} 抓取)`,
    "",
    "## 来源分类",
    ""
  ];

  const bySource: Record<string, HotTopic[]> = {};
  for (const topic of topics) {
    if (!bySource[topic.source]) bySource[topic.source] = [];
    bySource[topic.source].push(topic);
  }

  for (const [source, sourceTopics] of Object.entries(bySource)) {
    lines.push(`### ${source.toUpperCase()}`);
    for (const t of sourceTopics) {
      const metrics = t.metrics
        ? ` (${t.metrics.likes || 0} likes, ${t.metrics.retweets || 0} RT)`
        : "";
      lines.push(`${t.rank}. [${t.domain}] ${t.title}${metrics}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`总计: ${topics.length} 条热点`);

  return lines.join("\n");
}

main().catch(console.error);
