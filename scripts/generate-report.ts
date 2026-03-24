#!/usr/bin/env bun
/**
 * 写作与润色模块
 * 根据选定话题生成文章框架、写作、润色并去AI味
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// 类型定义
interface SelectedTopicData {
  selection_time: string;
  total_candidates: number;
  selected_topic: {
    id: string;
    title: string;
    source: string;
    heat: number;
    url: string;
    category: string;
    category_confidence: number;
    creativity_score: {
      information_richness: number;
      extension_space: number;
      timeliness: number;
      controversy: number;
      audience_breadth: number;
      total: number;
    };
    reader_psychology: {
      core_emotion: string[];
      reading_motivation: string[];
      expected_gain: string[];
      share_willingness: string;
      share_triggers: string[];
    };
    keywords: string[];
    selection_score: number;
    selection_rank: number;
    selection_reasons: string[];
  };
}

interface ArticleOutline {
  title: string;
  category: string;
  style: string;
  framework_type: string;
  structure: OutlineSection[];
  tone: string;
  target_length: number;
  seo_keywords: string[];
}

interface OutlineSection {
  heading: string;
  key_points: string[];
  estimated_words: number;
  writing_tips: string[];
}

// 框架模板
const FRAMEWORK_TEMPLATES: Record<string, (topic: string, keywords: string[]) => OutlineSection[]> = {
  // 问题解决型（科技）
  'problem_solution': (topic, keywords) => [
    {
      heading: '现象：发生了什么',
      key_points: ['开门见山，直接切入事件', '用具体数据或场景引入', '设置悬念或痛点'],
      estimated_words: 300,
      writing_tips: ['避免"首先"，用故事或场景开头', '用短句增强节奏感'],
    },
    {
      heading: '背景：来龙去脉',
      key_points: ['为什么这件事值得关注', '相关行业/领域背景', '相关人物/公司介绍'],
      estimated_words: 400,
      writing_tips: ['用类比解释复杂概念', '加入具体案例'],
    },
    {
      heading: '分析：深度解读',
      key_points: ['核心看点是什么', '有哪些技术创新/独特之处', '和竞品/过往方案对比'],
      estimated_words: 600,
      writing_tips: ['用数据支撑观点', '引用专家观点或用户反馈'],
    },
    {
      heading: '影响：意味着什么',
      key_points: ['对行业/用户有什么影响', '短期和长期分别会产生什么变化', '可能面临哪些挑战'],
      estimated_words: 400,
      writing_tips: ['加入'我认为'等主观视角', '避免过度总结'],
    },
    {
      heading: '展望或建议',
      key_points: ['接下来会发生什么', '读者可以做什么', '留下思考点'],
      estimated_words: 200,
      writing_tips: ['不说'综上所述''总而言之'', '用具体问题或展望收尾'],
    },
  ],

  // 数据驱动型（财经）
  'data_driven': (topic, keywords) => [
    {
      heading: '数据速览',
      key_points: ['核心数据直接呈现', '对比基准数据', '最惊人/最有价值的数字'],
      estimated_words: 250,
      writing_tips: ['让数据自己说话', '用具体数字替代模糊描述'],
    },
    {
      heading: '现象还原',
      key_points: ['数据背后反映的现象', '这个趋势从什么时候开始', '谁受影响最大'],
      estimated_words: 350,
      writing_tips: ['用故事解读数据', '避免学术化语言'],
    },
    {
      heading: '原因剖析',
      key_points: ['为什么会出现这个数据', '深层因素有哪些', '是否会持续'],
      estimated_words: 500,
      writing_tips: ['多用比喻', '把复杂逻辑拆解简单'],
    },
    {
      heading: '影响预判',
      key_points: ['对我们意味着什么', '可能的后续发展', '历史类似案例'],
      estimated_words: 400,
      writing_tips: ['加入'个人看法'增加可信度', '避免绝对预测'],
    },
    {
      heading: '行动建议',
      key_points: ['普通人应该怎么做', '不同人群的不同策略', '关键时机节点'],
      estimated_words: 200,
      writing_tips: ['建议要具体可操作', '承认不确定性'],
    },
  ],

  // 观点分析型（社会）
  'opinion_analysis': (topic, keywords) => [
    {
      heading: '事件概述',
      key_points: ['什么事引发讨论', '各方观点概览', '争议焦点'],
      estimated_words: 300,
      writing_tips: ['引述多方声音', '用直接引语增加真实感'],
    },
    {
      heading: '各方声音',
      key_points: ['支持者怎么说', '反对者怎么说', '中立者怎么看'],
      estimated_words: 500,
      writing_tips: ['呈现不同立场', '引用权威来源'],
    },
    {
      heading: '深度解读',
      key_points: ['争议的本质是什么', '背后反映的社会问题', '历史类似案例'],
      estimated_words: 600,
      writing_tips: ['加入个人分析视角', '避免简单二元对立'],
    },
    {
      heading: '可能的走向',
      key_points: ['各方可能如何妥协', '最终可能的结果', '长期影响'],
      estimated_words: 300,
      writing_tips: ['预判而非裁决', '保持开放性'],
    },
  ],

  // 故事叙述型（娱乐/情感）
  'story_narrative': (topic, keywords) => [
    {
      heading: '开篇引子',
      key_points: ['最吸引人的细节', '悬念设置', '情感钩子'],
      estimated_words: 200,
      writing_tips: ['用场景而非概念开头', '制造好奇心'],
    },
    {
      heading: '前情回顾',
      key_points: ['相关背景', '人物/事件演变', '关键转折点'],
      estimated_words: 400,
      writing_tips: ['像讲故事一样叙述', '加入具体细节和场景'],
    },
    {
      heading: '核心事件',
      key_points: ['发生了什么', '关键人物做了什么', '高潮场景'],
      estimated_words: 500,
      writing_tips: ['多用直接引语', '场景化描写'],
    },
    {
      heading: '反应与影响',
      key_points: ['各方反应', '网友评论', '后续发展'],
      estimated_words: 400,
      writing_tips: ['引用真实声音', '避免主观评价'],
    },
    {
      heading: '延伸思考',
      key_points: ['这件事让人思考什么', '对普通人有什么启发', '类似案例对比'],
      estimated_words: 200,
      writing_tips: ['点到即止', '不说教'],
    },
  ],
};

// AI味句式检测
const AI_PATTERNS = [
  { pattern: /^首先[，,]/, replacement: '', reason: 'AI式过渡' },
  { pattern: /^其次[，,]/, replacement: '', reason: 'AI式过渡' },
  { pattern: /^然后[，,]/, replacement: '这里', reason: 'AI式过渡' },
  { pattern: /^总之[，,]/, replacement: '', reason: '总结过显' },
  { pattern: /^综上所述[，,]/, replacement: '', reason: '总结过显' },
  { pattern: /^总而言之[，,]/, replacement: '', reason: '总结过显' },
  { pattern: /^让我们来看看/, replacement: '来看', reason: 'AI式引入' },
  { pattern: /值得注意的是[，,]/, replacement: '', reason: '空洞过渡' },
  { pattern: /需要指出的是[，,]/, replacement: '', reason: '空洞过渡' },
  { pattern: /值得一提的是[，,]/, replacement: '有意思的是，', reason: '空洞过渡' },
  { pattern: /不难发现[，,]/, replacement: '可以看到，', reason: 'AI式表达' },
  { pattern: /不可否认[，,]/, replacement: '', reason: '过度套话' },
  { pattern: /毋庸置疑[，,]/, replacement: '', reason: '过度套话' },
  { pattern: /由此可见[，,]/, replacement: '从中可以看到，', reason: 'AI式推导' },
];

// SEO检查项
interface SEOCheck {
  item: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

// 人味检查项
interface HumanCheck {
  item: string;
  status: 'pass' | 'fail';
  message: string;
}

// 根据领域选择框架
function selectFramework(category: string): string {
  const frameworkMap: Record<string, string> = {
    tech: 'problem_solution',
    finance: 'data_driven',
    society: 'opinion_analysis',
    entertainment: 'story_narrative',
    sports: 'story_narrative',
    international: 'opinion_analysis',
  };
  return frameworkMap[category] || 'problem_solution';
}

// 选择写作风格
function selectStyle(category: string, emotion: string[]): string {
  if (category === 'tech' || category === 'finance') {
    return 'depth_analysis';
  }
  if (category === 'entertainment') {
    if (emotion.includes('好奇')) return 'relaxed';
    return 'warm';
  }
  return 'depth_analysis';
}

// 生成文章大纲
function generateOutline(topicData: SelectedTopicData): ArticleOutline {
  const topic = topicData.selected_topic;
  const framework = selectFramework(topic.category);
  const style = selectStyle(topic.category, topic.reader_psychology.core_emotion);

  const structure = FRAMEWORK_TEMPLATES[framework](topic.title, topic.keywords);

  // 计算目标字数
  const targetLength = structure.reduce((sum, s) => sum + s.estimated_words, 0);

  return {
    title: topic.title,
    category: topic.category,
    style,
    framework_type: framework,
    structure,
    tone: style === 'depth_analysis' ? '专业但有温度' : style === 'relaxed' ? '轻松自然' : '真诚直接',
    target_length: targetLength,
    seo_keywords: [...new Set([topic.title.split(' ').slice(0, 3).join(''), ...topic.keywords])],
  };
}

// 去AI味处理
function humanizeText(text: string): { text: string; changes: string[] } {
  const changes: string[] = [];
  let processed = text;

  for (const { pattern, replacement, reason } of AI_PATTERNS) {
    const matches = processed.match(pattern);
    if (matches) {
      changes.push(`替换"${matches[0]}" → "${replacement || '删除'}"（${reason}）`);
      processed = processed.replace(pattern, replacement);
    }
  }

  // 清理多余空格和标点
  processed = processed.replace(/\s{2,}/g, ' ');
  processed = processed.replace(/[，,]{2,}/g, '，');
  processed = processed.replace(/。{2,}/g, '。');

  return { text: processed, changes };
}

// SEO检查
function checkSEO(content: string, keywords: string[]): SEOCheck[] {
  const checks: SEOCheck[] = [];
  const lines = content.split('\n');

  // 检查标题是否包含关键词
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    const hasKeyword = keywords.some(kw => titleMatch![1].includes(kw));
    checks.push({
      item: '标题包含关键词',
      status: hasKeyword ? 'pass' : 'warning',
      message: hasKeyword ? `标题包含关键词` : `标题缺少核心关键词`,
    });
  }

  // 检查开头200字
  const first200 = content.slice(0, 400).replace(/[#*\s]/g, '');
  const keywordInIntro = keywords.some(kw => first200.includes(kw));
  checks.push({
    item: '开头包含关键词',
    status: keywordInIntro ? 'pass' : 'warning',
    message: keywordInIntro ? '开头包含关键词' : '建议在开头包含关键词',
  });

  // 检查关键词密度
  const pureText = content.replace(/[#*\s\n]/g, '');
  let keywordCount = 0;
  for (const kw of keywords) {
    const matches = pureText.match(new RegExp(kw, 'g'));
    keywordCount += matches ? matches.length : 0;
  }
  const density = (keywordCount * keywords[0].length) / pureText.length * 100;
  checks.push({
    item: '关键词密度',
    status: density >= 2 && density <= 4 ? 'pass' : density < 2 ? 'warning' : 'fail',
    message: `关键词密度 ${density.toFixed(1)}%（建议2-4%）`,
  });

  // 检查小标题数量
  const subheadings = (content.match(/^##\s+/gm) || []).length;
  checks.push({
    item: '小标题分布',
    status: subheadings >= 3 ? 'pass' : 'warning',
    message: `共${subheadings}个小标题（建议3个以上）`,
  });

  return checks;
}

// 人味检查
function checkHuman(content: string): HumanCheck[] {
  const checks: HumanCheck[] = [];

  // 检查是否有个人观点
  const hasPersonalOpinion = /我认为|我觉得|在我看来|就我观察|据我了解/.test(content);
  checks.push({
    item: '有个人观点表达',
    status: hasPersonalOpinion ? 'pass' : 'fail',
    message: hasPersonalOpinion ? '检测到主观视角表达' : '缺少主观视角，建议加入"我认为"等表达',
  });

  // 检查是否有具体案例/数据
  const hasExamples = /例如|比如|以|据统计|数据显示|实际|具体/.test(content);
  checks.push({
    item: '有具体案例/数据',
    status: hasExamples ? 'pass' : 'fail',
    message: hasExamples ? '检测到具体案例或数据' : '建议加入具体案例或数据支撑',
  });

  // 检查是否有口语化表达
  const hasColloquial = /其实|当然|不过|说实话|有趣的是|这点很有意思/.test(content);
  checks.push({
    item: '有口语化表达',
    status: hasColloquial ? 'pass' : 'fail',
    message: hasColloquial ? '检测到口语化风格' : '内容偏书面，建议加入口语化表达',
  });

  // 检查是否有AI式过渡句
  const hasAITransition = new RegExp(AI_PATTERNS.map(p => p.pattern.source).join('|')).test(content);
  checks.push({
    item: '无AI式过渡句',
    status: hasAITransition ? 'fail' : 'pass',
    message: hasAITransition ? '检测到AI式过渡句，需处理' : '无AI式过渡句',
  });

  // 检查段落长度
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim() && !p.startsWith('#'));
  const longParas = paragraphs.filter(p => p.length > 200);
  checks.push({
    item: '段落长度适中',
    status: longParas.length < paragraphs.length * 0.3 ? 'pass' : 'fail',
    message: `${longParas.length}/${paragraphs.length}个段落过长（移动端建议每段<150字）`,
  });

  return checks;
}

// 生成三标题
function generateThreeTitles(topic: string, keywords: string[]): { explosive: string; professional: string; emotional: string } {
  const mainKeyword = keywords[0] || topic;

  return {
    explosive: `${topic}，背后到底发生了什么？`,
    professional: `${mainKeyword}深度解析：影响与展望`,
    emotional: `当${mainKeyword}成为热点，我们看到了什么`,
  };
}

// 生成标签
function generateTags(topic: string, category: string, keywords: string[]): string[] {
  const tags: string[] = [];

  // 领域标签
  const categoryTagMap: Record<string, string> = {
    tech: '科技',
    finance: '财经',
    entertainment: '娱乐',
    society: '社会',
    sports: '体育',
    international: '国际',
  };
  tags.push(categoryTagMap[category] || '综合');

  // 关键词标签
  tags.push(...keywords.slice(0, 3));

  // 时效标签
  const year = new Date().getFullYear();
  tags.push(`${year}新动态`);

  return [...new Set(tags)].slice(0, 6);
}

// 生成摘要
function generateSummary(topic: string, keywords: string[]): string {
  return `近日${topic}引发热议。本文从${keywords.slice(0, 2).join('、')}等角度，深入分析其背后的原因与影响。`;
}

// 主函数
async function main() {
  const inputDir = process.env.INPUT_DIR || './output';
  const outputDir = process.env.OUTPUT_DIR || inputDir;

  console.log('=== Auto Writer - Writing Module ===');

  // 读取选题数据
  const selectionPath = join(inputDir, '03-selected-topic.json');
  if (!existsSync(selectionPath)) {
    console.error(`Selection file not found: ${selectionPath}`);
    console.log('Please run analyze-topics first');
    process.exit(1);
  }

  const rawData = await readFile(selectionPath, 'utf-8');
  const topicData: SelectedTopicData = JSON.parse(rawData);

  console.log(`\nProcessing topic: ${topicData.selected_topic.title}`);

  // 生成大纲
  const outline = generateOutline(topicData);
  const outlinePath = join(outputDir, '04-outline.md');
  await writeFile(outlinePath, JSON.stringify(outline, null, 2), 'utf-8');
  console.log(`Saved outline to: ${outlinePath}`);

  // 提示用户需要手动进行写作（因为需要AI生成内容）
  console.log('\n=== Next Step: Content Generation ===');
  console.log('The outline has been generated. To complete the writing,');
  console.log('use Claude to generate content following the outline structure.');
  console.log('\nOutline structure:');
  outline.structure.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.heading} (~${s.estimated_words} words)`);
    s.key_points.forEach(p => console.log(`     - ${p}`));
  });

  // 生成元数据（三标题、标签、摘要）
  const titles = generateThreeTitles(topicData.selected_topic.title, topicData.selected_topic.keywords);
  const tags = generateTags(topicData.selected_topic.title, topicData.selected_topic.category, topicData.selected_topic.keywords);
  const summary = generateSummary(topicData.selected_topic.title, topicData.selected_topic.keywords);

  const metadata = {
    generated_at: new Date().toISOString(),
    topic_id: topicData.selected_topic.id,
    titles,
    tags,
    summary,
    seo_keywords: outline.seo_keywords,
  };

  const metadataPath = join(outputDir, '07-metadata.json');
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`\nSaved metadata to: ${metadataPath}`);

  console.log('\n=== Generated Metadata ===');
  console.log('\nTitles:');
  console.log(`  1. [爆点型] ${titles.explosive}`);
  console.log(`  2. [专业型] ${titles.professional}`);
  console.log(`  3. [情感型] ${titles.emotional}`);
  console.log(`\nTags: ${tags.join(', ')}`);
  console.log(`\nSummary: ${summary}`);
}

main().catch(console.error);
