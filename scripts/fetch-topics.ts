#!/usr/bin/env bun
/**
 * 热点抓取模块
 * 从多个源头抓取当日热点话题
 */

import { writeFile } from "fs/promises";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

interface HotTopic {
  id: string;
  title: string;
  source: string;
  heat: number;
  url: string;
  category: string | null;
  keywords: string[];
  fetchTime: string;
}

interface FetchResult {
  fetch_time: string;
  sources: string[];
  topics: HotTopic[];
  total_count: number;
  errors: { source: string; error: string }[];
}

// 配置代理
const PROXY_URL = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || null;

// 通用fetch wrapper，支持代理
async function fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    ...options.headers,
  };

  if (PROXY_URL) {
    // 使用代理时通过环境变量让bun/fetch自动处理
    process.env.HTTP_PROXY = PROXY_URL;
    process.env.HTTPS_PROXY = PROXY_URL;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    return response;
  } catch (error) {
    throw new Error(`Fetch failed: ${error}`);
  }
}

// 微博热搜抓取
async function fetchWeiboHot(): Promise<HotTopic[]> {
  const topics: HotTopic[] = [];
  try {
    const url = 'https://weibo.com/ajax/side/hotSearch';
    const response = await fetchWithProxy(url);

    if (!response.ok) {
      console.warn(`[weibo] HTTP ${response.status}`);
      return topics;
    }

    const data = await response.json() as { data?: { realtime?: Array<{
      note?: string;
      num?: number;
      desc?: string;
    }> } };

    const hotList = data?.data?.realtime || [];

    for (let i = 0; i < hotList.length; i++) {
      const item = hotList[i];
      if (item.note) {
        topics.push({
          id: `weibo-${String(i).padStart(3, '0')}`,
          title: item.note,
          source: 'weibo',
          heat: item.num || 0,
          url: `https://s.weibo.com/weibo?q=%23${encodeURIComponent(item.note)}%23`,
          category: null,
          keywords: [],
          fetchTime: new Date().toISOString(),
        });
      }
    }

    console.log(`[weibo] Fetched ${topics.length} topics`);
  } catch (error) {
    console.error(`[weibo] Error: ${error}`);
  }

  return topics;
}

// 知乎热榜抓取
async function fetchZhihuHot(): Promise<HotTopic[]> {
  const topics: HotTopic[] = [];
  try {
    const url = 'https://www.zhihu.com/api/v3/feed/topstory/hot-list.json?limit=50';
    const response = await fetchWithProxy(url);

    if (!response.ok) {
      console.warn(`[zhihu] HTTP ${response.status}`);
      return topics;
    }

    const data = await response.json() as Array<{
      target?: {
        title?: string;
        url?: string;
        excerpt?: string;
      };
      detail_text?: string;
      followers?: number;
    }>;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item.target?.title) {
        const heatText = item.detail_text || '';
        const heatMatch = heatText.match(/(\d+)/);
        const heat = heatMatch ? parseInt(heatMatch[1]) * 10000 : (item.followers || 0);

        topics.push({
          id: `zhihu-${String(i).padStart(3, '0')}`,
          title: item.target.title,
          source: 'zhihu',
          heat: heat,
          url: item.target.url || `https://www.zhihu.com/search?q=${encodeURIComponent(item.target.title)}`,
          category: null,
          keywords: [],
          fetchTime: new Date().toISOString(),
        });
      }
    }

    console.log(`[zhihu] Fetched ${topics.length} topics`);
  } catch (error) {
    console.error(`[zhihu] Error: ${error}`);
  }

  return topics;
}

// 百度热搜抓取
async function fetchBaiduHot(): Promise<HotTopic[]> {
  const topics: HotTopic[] = [];
  try {
    const url = 'https://top.baidu.com/board?tab=realtime&api=1';
    const response = await fetchWithProxy(url);

    if (!response.ok) {
      console.warn(`[baidu] HTTP ${response.status}`);
      return topics;
    }

    const text = await response.text();

    // 尝试解析JSON或从HTML提取
    try {
      const data = JSON.parse(text);
      const list = data?.data?.list || [];

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item.word) {
          topics.push({
            id: `baidu-${String(i).padStart(3, '0')}`,
            title: item.word,
            source: 'baidu',
            heat: item.hotScore || item.rawHot || 0,
            url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.word)}`,
            category: null,
            keywords: [],
            fetchTime: new Date().toISOString(),
          });
        }
      }
    } catch {
      // HTML解析后备
      const titleMatches = text.matchAll(/<div[^>]*class="[^"]*content[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g);
      let idx = 0;
      for (const match of titleMatches) {
        const title = match[1].trim();
        if (title && title.length > 2 && title.length < 50) {
          topics.push({
            id: `baidu-${String(idx).padStart(3, '0')}`,
            title: title,
            source: 'baidu',
            heat: 100000 - idx * 1000,
            url: `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
            category: null,
            keywords: [],
            fetchTime: new Date().toISOString(),
          });
          idx++;
        }
      }
    }

    console.log(`[baidu] Fetched ${topics.length} topics`);
  } catch (error) {
    console.error(`[baidu] Error: ${error}`);
  }

  return topics;
}

// 36氪快讯抓取
async function fetch36KrHot(): Promise<HotTopic[]> {
  const topics: HotTopic[] = [];
  try {
    const url = 'https://36kr.com/api/newsflashes';
    const response = await fetchWithProxy(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Referer': 'https://36kr.com/',
      },
    });

    if (!response.ok) {
      console.warn(`[36kr] HTTP ${response.status}`);
      return topics;
    }

    const data = await response.json() as {
      data?: {
        items?: Array<{
          title?: string;
          id?: string | number;
          published_at?: string;
          description?: string;
        }>;
      }
    };

    const items = data?.data?.items || [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.title) {
        topics.push({
          id: `36kr-${String(i).padStart(3, '0')}`,
          title: item.title,
          source: '36kr',
          heat: 50000 - i * 1000,
          url: `https://36kr.com/newsflashes/${item.id || ''}`,
          category: 'tech',
          keywords: [],
          fetchTime: new Date().toISOString(),
        });
      }
    }

    console.log(`[36kr] Fetched ${topics.length} topics`);
  } catch (error) {
    console.error(`[36kr] Error: ${error}`);
  }

  return topics;
}

// 今日头条热榜抓取
async function fetchToutiaoHot(): Promise<HotTopic[]> {
  const topics: HotTopic[] = [];
  try {
    const url = 'https://www.toutiao.com/hot-event/hot-board/';
    const response = await fetchWithProxy(url);

    if (!response.ok) {
      console.warn(`[toutiao] HTTP ${response.status}`);
      return topics;
    }

    const text = await response.text();

    // 从页面提取数据
    const dataMatch = text.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1]);
        const list = data?.hotBoard || [];

        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (item.Title || item.title) {
            topics.push({
              id: `toutiao-${String(i).padStart(3, '0')}`,
              title: item.Title || item.title,
              source: 'toutiao',
              heat: item.HotValue || item.hotValue || 100000 - i * 1000,
              url: item.Url || `https://www.toutiao.com/search?keyword=${encodeURIComponent(item.Title || item.title)}`,
              category: null,
              keywords: [],
              fetchTime: new Date().toISOString(),
            });
          }
        }
      } catch {
        // 忽略解析错误
      }
    }

    console.log(`[toutiao] Fetched ${topics.length} topics`);
  } catch (error) {
    console.error(`[toutiao] Error: ${error}`);
  }

  return topics;
}

// 标题相似度计算（简单版）
function similarity(a: string, b: string): number {
  const aWords = a.toLowerCase().split(/\s+/);
  const bWords = b.toLowerCase().split(/\s+/);

  const intersection = aWords.filter(w => bWords.includes(w));
  const union = [...new Set([...aWords, ...bWords])];

  return intersection.length / union.length;
}

// 去重
function deduplicate(topics: HotTopic[], threshold = 0.8): HotTopic[] {
  const result: HotTopic[] = [];

  for (const topic of topics) {
    const isDuplicate = result.some(t => similarity(t.title, topic.title) > threshold);
    if (!isDuplicate) {
      result.push(topic);
    }
  }

  return result;
}

// 主函数
async function main() {
  const outputDir = process.env.OUTPUT_DIR || './output';
  const proxyUrl = process.env.HTTP_PROXY;

  console.log('=== Auto Writer - Hot Topics Fetcher ===');
  console.log(`Output directory: ${outputDir}`);
  if (proxyUrl) {
    console.log(`Using proxy: ${proxyUrl}`);
  }

  // 创建输出目录
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 并行抓取所有源
  const [weiboTopics, zhihuTopics, baiduTopics, kr36Topics, toutiaoTopics] = await Promise.all([
    fetchWeiboHot(),
    fetchZhihuHot(),
    fetchBaiduHot(),
    fetch36KrHot(),
    fetchToutiaoHot(),
  ]);

  // 合并所有话题
  const allTopics = [
    ...weiboTopics,
    ...zhihuTopics,
    ...baiduTopics,
    ...kr36Topics,
    ...toutiaoTopics,
  ];

  console.log(`\nTotal fetched: ${allTopics.length} topics`);

  // 去重
  const uniqueTopics = deduplicate(allTopics);
  console.log(`After deduplication: ${uniqueTopics.length} topics`);

  // 按热度排序
  uniqueTopics.sort((a, b) => b.heat - a.heat);

  // 构建结果
  const result: FetchResult = {
    fetch_time: new Date().toISOString(),
    sources: ['weibo', 'zhihu', 'baidu', '36kr', 'toutiao'],
    topics: uniqueTopics,
    total_count: uniqueTopics.length,
    errors: [],
  };

  // 保存结果
  const outputPath = join(outputDir, '01-hot-topics.json');
  await writeFile(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`\nSaved to: ${outputPath}`);
  console.log('\nTop 10 topics:');
  uniqueTopics.slice(0, 10).forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.source}] ${t.title} (heat: ${t.heat.toLocaleString()})`);
  });
}

main().catch(console.error);
