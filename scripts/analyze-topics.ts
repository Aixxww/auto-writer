#!/usr/bin/env bun
/**
 * 热点分析与选题模块
 * 对抓取的热点进行领域分类、可创作性评估、读者心理分析
 */

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// 类型定义
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
}

interface CreativityScore {
  information_richness: number;  // 信息丰富度
  extension_space: number;       // 延展空间
  timeliness: number;            // 时效持久性
  controversy: number;           // 争议深度
  audience_breadth: number;      // 受众广度
  total: number;                 // 加权总分
}

interface ReaderPsychology {
  core_emotion: string[];        // 核心情绪
  reading_motivation: string[];  // 阅读动机
  expected_gain: string[];       // 预期收获
  share_willingness: string;     // 传播意愿
  share_triggers: string[];      // 分享触发条件
}

interface AnalyzedTopic extends HotTopic {
  category: string;
  category_confidence: number;
  creativity_score: CreativityScore;
  reader_psychology: ReaderPsychology;
  keywords: string[];
  title_length: number;
  estimated_read_time: number;
}

interface AnalysisResult {
  analysis_time: string;
  total_topics: number;
  topics: AnalyzedTopic[];
}

interface SelectedTopic extends AnalyzedTopic {
  selection_score: number;
  selection_rank: number;
  selection_reasons: string[];
}

// 领域关键词映射
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  tech: ['AI', '人工智能', '大模型', 'GPT', 'Claude', 'DeepSeek', '算法', '编程', '代码', '软件', 'APP', '手机', '互联网', '科技', '芯片', '量子', '机器人', '自动驾驶', '云计算', '大数据'],
  finance: ['股市', '股票', '基金', '投资', '经济', '金融', '利率', '降息', '加息', 'GDP', '通胀', '加密货币', '比特币', '区块链', '银行', '理财', '财富'],
  entertainment: ['明星', '演员', '电影', '综艺', '音乐', '演唱会', '歌手', '偶像', '娱乐圈', '八卦', '绯闻', '红毯', '颁奖'],
  society: ['政策', '教育', '医疗', '交通', '住房', '社保', '婚姻', '生育', '养老', '就业', '法律', '民生', '社区'],
  sports: ['足球', '篮球', 'NBA', '世界杯', '奥运', '比赛', '体育', '冠军', '联赛', '运动员', '金牌'],
  international: ['国际', '外交', '美国', '欧洲', '日本', '韩国', '战争', '冲突', '联合国', '总统', '选举'],
};

// 情绪词映射
const EMOTION_KEYWORDS: Record<string, string[]> = {
  '好奇': ['新', '首次', '突破', '创新', '发现', '揭秘', '曝光', '神秘'],
  '焦虑': ['危机', '风险', '警告', '威胁', '下跌', '失业', '裁员', '破产'],
  '愤怒': ['不公', '丑闻', '腐败', '欺压', '违法', '违规', '无良'],
  '共鸣': ['普通人', '打工人', '家长', '孩子', '压力', '内卷', '躺平'],
  '认同': ['厉害', '骄傲', '国产', '突破', '第一', '领先', '创新'],
};

// 评估话题领域
function classifyTopic(topic: HotTopic): { category: string; confidence: number } {
  const title = topic.title.toLowerCase();
  let bestMatch = 'society';
  let bestConfidence = 0;

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let matchCount = 0;
    for (const kw of keywords) {
      if (title.includes(kw.toLowerCase())) {
        matchCount++;
      }
    }

    const confidence = matchCount / Math.max(keywords.length, 1);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = domain;
    }
  }

  // 如果没有明显匹配，根据热度来源推测
  if (bestConfidence < 0.1) {
    if (topic.source === '36kr') bestMatch = 'tech';
    else if (topic.source === 'weibo') bestMatch = 'entertainment';
  }

  return { category: bestMatch, confidence: Math.min(bestConfidence * 5, 1) };
}

// 提取关键词
function extractKeywords(title: string): string[] {
  const keywords: string[] = [];

  // 从所有领域关键词中匹配
  for (const kws of Object.values(DOMAIN_KEYWORDS)) {
    for (const kw of kws) {
      if (title.includes(kw) && !keywords.includes(kw)) {
        keywords.push(kw);
      }
    }
  }

  // 提取标题中的实体词（简单启发式）
  const entityMatches = title.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  for (const match of entityMatches) {
    if (!keywords.includes(match) && match.length >= 2) {
      keywords.push(match);
    }
  }

  return [...new Set(keywords)].slice(0, 5);
}

// 计算可创作性评分
function calculateCreativityScore(topic: HotTopic): CreativityScore {
  const title = topic.title;
  const titleLength = title.length;

  // 信息丰富度（标题长度 + 关键实体）
  const entityCount = extractKeywords(title).length;
  const information = Math.min(20, titleLength / 3 + entityCount * 4);

  // 延展空间（是否有可关联话题）
  const hasExtension = /新|首|最|突破|创新|变化|升级|降价|发布/.test(title);
  const extension = hasExtension ? 16 : 10;

  // 时效持久性
  const hasLongTerm = /趋势|发展|变化|时代|革命|未来/.test(title);
  const timeliness = hasLongTerm ? 18 : 12;

  // 争议深度（是否有对立观点）
  const hasControversy = /争议|反对|质疑|批评|vs|对比|选择/.test(title);
  const controversy = hasControversy ? 17 : 10;

  // 受众广度
  const broadKeywords = /人|生活|健康|钱|房|车|孩子|教育|工作/.test(title);
  const audience = broadKeywords ? 18 : 12;

  // 加权总分
  const total =
    information * 0.2 +
    extension * 0.25 +
    timeliness * 0.2 +
    controversy * 0.2 +
    audience * 0.15;

  return {
    information_richness: Math.round(information),
    extension_space: Math.round(extension),
    timeliness: Math.round(timeliness),
    controversy: Math.round(controversy),
    audience_breadth: Math.round(audience),
    total: Math.round(total),
  };
}

// 分析读者心理
function analyzeReaderPsychology(topic: HotTopic): ReaderPsychology {
  const title = topic.title;
  const emotions: string[] = [];
  const motivations: string[] = [];
  const gains: string[] = [];

  // 检测情绪
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (title.includes(kw)) {
        emotions.push(emotion);
        break;
      }
    }
  }

  if (emotions.length === 0) {
    emotions.push('好奇');
  }

  // 阅读动机
  if (/如何|怎么|方法|技巧|教程|攻略/.test(title)) {
    motivations.push('解决问题');
    gains.push('实用技能');
  }
  if (/新|首|突破|创新/.test(title)) {
    motivations.push('获取信息');
    gains.push('知识增量');
  }
  if (/曝光|揭秘|真相|背后/.test(title)) {
    motivations.push('满足八卦');
    gains.push('信息优势');
  }

  // 默认值
  if (motivations.length === 0) {
    motivations.push('获取信息', '寻求认同');
    gains.push('知识增量', '社交资本');
  }

  // 传播意愿
  let willingness = '中';
  let triggers: string[] = [];

  if (/震惊|必看|绝了|牛|厉害|第一/.test(title)) {
    willingness = '高';
    triggers.push('内容有冲击力', '能引发讨论');
  } else if (/实用|干货|收藏|建议/.test(title)) {
    willingness = '中';
    triggers.push('对他人有价值');
  }

  return {
    core_emotion: [...new Set(emotions)],
    reading_motivation: [...new Set(motivations)],
    expected_gain: [...new Set(gains)],
    share_willingness: willingness,
    share_triggers: triggers.length > 0 ? triggers : ['内容有价值时'],
  };
}

// 选题算法
function selectTopic(topics: AnalyzedTopic[], preferredDomains: string[] = [], excludedDomains: string[] = []): SelectedTopic {
  // 过滤排除的领域
  let candidates = topics.filter(t => !excludedDomains.includes(t.category));

  // 计算综合评分
  candidates.forEach(topic => {
    const heatRank = candidates.filter(t => t.heat > topic.heat).length + 1;
    const heatRankPercent = 1 - (heatRank / candidates.length);
    const creativityPercent = topic.creativity_score.total / 100;
    const domainMatch = preferredDomains.length === 0 || preferredDomains.includes(topic.category);

    // 综合评分公式
    const score =
      creativityPercent * 0.4 +
      heatRankPercent * 0.25 +
      (domainMatch ? 0.15 : 0) +
      (topic.category_confidence > 0.5 ? 0.1 : 0) +
      (topic.keywords.length >= 3 ? 0.1 : topic.keywords.length * 0.03);

    (topic as SelectedTopic).selection_score = score;
  });

  // 排序并选择
  candidates.sort((a, b) => (b as SelectedTopic).selection_score - (a as SelectedTopic).selection_score);

  // 取前10%
  const topCount = Math.max(1, Math.floor(candidates.length * 0.1));
  const topCandidates = candidates.slice(0, topCount);

  // 从前10%中随机选择一个（增加多样性）
  const selectedIndex = 0; // 可以改成 Math.floor(Math.random() * topCandidates.length)
  const selected = topCandidates[selectedIndex] as SelectedTopic;

  // 添加选择原因
  selected.selection_rank = candidates.indexOf(selected) + 1;
  selected.selection_reasons = [];

  if (selected.creativity_score.total >= 75) {
    selected.selection_reasons.push('高可创作性');
  }
  if (selected.heat > candidates.reduce((a, b) => a + b.heat, 0) / candidates.length) {
    selected.selection_reasons.push('热度排名靠前');
  }
  if (preferredDomains.includes(selected.category)) {
    selected.selection_reasons.push('领域匹配偏好');
  }

  return selected;
}

// 主函数
async function main() {
  const inputDir = process.env.INPUT_DIR || './output';
  const outputDir = process.env.OUTPUT_DIR || inputDir;
  const configFile = process.env.CONFIG_FILE || '';

  console.log('=== Auto Writer - Topic Analyzer ===');

  // 读取配置（如果存在）
  let preferredDomains: string[] = [];
  let excludedDomains: string[] = [];

  if (configFile && existsSync(configFile)) {
    try {
      const configContent = await readFile(configFile, 'utf-8');
      const config = JSON.parse(configContent);
      preferredDomains = config.preferred_domains || [];
      excludedDomains = config.excluded_domains || [];
      console.log(`Loaded config: preferred=${preferredDomains.join(',')}, excluded=${excludedDomains.join(',')}`);
    } catch {
      console.warn('Failed to parse config file, using defaults');
    }
  }

  // 读取热点数据
  const inputPath = join(inputDir, '01-hot-topics.json');
  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    console.log('Please run fetch-topics first');
    process.exit(1);
  }

  const rawData = await readFile(inputPath, 'utf-8');
  const fetchData: FetchResult = JSON.parse(rawData);

  console.log(`\nAnalyzing ${fetchData.topics.length} topics...`);

  // 分析每个话题
  const analyzedTopics: AnalyzedTopic[] = fetchData.topics.map(topic => {
    const classification = classifyTopic(topic);
    const creativity = calculateCreativityScore(topic);
    const psychology = analyzeReaderPsychology(topic);
    const keywords = extractKeywords(topic.title);

    return {
      ...topic,
      category: classification.category,
      category_confidence: classification.confidence,
      creativity_score: creativity,
      reader_psychology: psychology,
      keywords,
      title_length: topic.title.length,
      estimated_read_time: Math.ceil(topic.title.length / 500),
    };
  });

  // 保存分析结果
  const analysisResult: AnalysisResult = {
    analysis_time: new Date().toISOString(),
    total_topics: analyzedTopics.length,
    topics: analyzedTopics,
  };

  const analysisPath = join(outputDir, '02-topic-analysis.json');
  await writeFile(analysisPath, JSON.stringify(analysisResult, null, 2), 'utf-8');
  console.log(`Saved analysis to: ${analysisPath}`);

  // 选题
  const selected = selectTopic(analyzedTopics, preferredDomains, excludedDomains);

  const selectionResult = {
    selection_time: new Date().toISOString(),
    total_candidates: analyzedTopics.length,
    selected_topic: selected,
    selection_criteria: {
      'creativity_weight': 0.4,
      'heat_rank_weight': 0.25,
      'domain_preference_weight': 0.15,
      'confidence_weight': 0.1,
      'keyword_richness_weight': 0.1,
    },
  };

  const selectionPath = join(outputDir, '03-selected-topic.json');
  await writeFile(selectionPath, JSON.stringify(selectionResult, null, 2), 'utf-8');
  console.log(`Saved selection to: ${selectionPath}`);

  // 打印结果
  console.log('\n=== Selected Topic ===');
  console.log(`Title: ${selected.title}`);
  console.log(`Source: ${selected.source}`);
  console.log(`Category: ${selected.category}`);
  console.log(`Creativity Score: ${selected.creativity_score.total}/100`);
  console.log(`Heat: ${selected.heat.toLocaleString()}`);
  console.log(`Keywords: ${selected.keywords.join(', ')}`);
  console.log(`Emotions: ${selected.reader_psychology.core_emotion.join(', ')}`);
  console.log(`Selection Score: ${selected.selection_score.toFixed(3)}`);
  console.log(`Reasons: ${selected.selection_reasons.join('; ')}`);
}

main().catch(console.error);
