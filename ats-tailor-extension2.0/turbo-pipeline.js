// turbo-pipeline.js - Ultra-fast ATS Tailoring Pipeline (≤2.4s total)
// Optimized for LazyApply rapid-fire job applications

(function(global) {
  'use strict';

  // ============ TIMING TARGETS ============
  const TIMING_TARGETS = {
    EXTRACT_KEYWORDS: 400,    // 400ms (down from 800ms)
    TAILOR_CV: 600,           // 600ms (down from 1s)
    GENERATE_PDF: 800,        // 800ms (down from 1s)
    ATTACH_FILES: 200,        // 200ms
    TOTAL: 2400               // 2.4s total
  };

  // ============ FAST KEYWORD CACHE ============
  const keywordCache = new Map();
  const MAX_CACHE_SIZE = 50;

  function getCacheKey(text) {
    // Fast hash based on first 500 chars + length
    return text.substring(0, 500).length + '_' + text.length + '_' + text.charCodeAt(0);
  }

  // ============ TURBO KEYWORD EXTRACTION (≤400ms) ============
  async function turboExtractKeywords(jobDescription, maxKeywords = 35) {
    const startTime = performance.now();
    
    if (!jobDescription || jobDescription.length < 50) {
      return { all: [], highPriority: [], mediumPriority: [], lowPriority: [], total: 0, timing: 0 };
    }

    // Check cache first (instant)
    const cacheKey = getCacheKey(jobDescription);
    if (keywordCache.has(cacheKey)) {
      console.log('[TurboPipeline] Cache hit for keywords');
      return { ...keywordCache.get(cacheKey), timing: performance.now() - startTime };
    }

    // Use ReliableExtractor if available (optimized)
    let result;
    if (global.ReliableExtractor) {
      result = global.ReliableExtractor.extractReliableKeywords(jobDescription, maxKeywords);
    } else if (global.KeywordExtractor) {
      const extracted = global.KeywordExtractor.extractKeywords(jobDescription, maxKeywords);
      const highCount = Math.min(12, Math.ceil(extracted.all.length * 0.35));
      const mediumCount = Math.min(10, Math.ceil(extracted.all.length * 0.35));
      result = {
        all: extracted.all.slice(0, maxKeywords),
        highPriority: extracted.all.slice(0, highCount),
        mediumPriority: extracted.all.slice(highCount, highCount + mediumCount),
        lowPriority: extracted.all.slice(highCount + mediumCount),
        total: extracted.all.length
      };
    } else {
      // Ultra-fast fallback extraction
      result = ultraFastExtraction(jobDescription, maxKeywords);
    }

    // Cache result
    if (keywordCache.size >= MAX_CACHE_SIZE) {
      const firstKey = keywordCache.keys().next().value;
      keywordCache.delete(firstKey);
    }
    keywordCache.set(cacheKey, result);

    const timing = performance.now() - startTime;
    console.log(`[TurboPipeline] Keywords extracted in ${timing.toFixed(0)}ms (target: ${TIMING_TARGETS.EXTRACT_KEYWORDS}ms)`);
    
    return { ...result, timing };
  }

  // Ultra-fast fallback extraction (synchronous, no dependencies)
  function ultraFastExtraction(text, maxKeywords) {
    const stopWords = new Set([
      'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from',
      'as','is','was','are','were','been','be','have','has','had','do','does','did',
      'will','would','could','should','may','might','must','can','need','this','that',
      'you','your','we','our','they','their','work','working','job','position','role',
      'team','company','opportunity','looking','seeking','required','requirements',
      'preferred','ability','able','experience','years','year','including','new'
    ]);

    const techBoost = new Set([
      'python','java','javascript','typescript','sql','aws','azure','gcp','kubernetes',
      'docker','terraform','react','angular','vue','node','spark','kafka','airflow',
      'tableau','snowflake','machine learning','deep learning','ai','ml','nlp',
      'agile','scrum','ci/cd','devops','api','rest','graphql','microservices'
    ]);

    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s\-\/]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopWords.has(w));

    // Single-pass frequency count with tech boost
    const freq = new Map();
    words.forEach(word => {
      const count = (freq.get(word) || 0) + 1;
      const boost = techBoost.has(word) ? 3 : 1;
      freq.set(word, count * boost);
    });

    const sorted = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, maxKeywords);

    const highCount = Math.ceil(sorted.length * 0.35);
    const mediumCount = Math.ceil(sorted.length * 0.35);

    return {
      all: sorted,
      highPriority: sorted.slice(0, highCount),
      mediumPriority: sorted.slice(highCount, highCount + mediumCount),
      lowPriority: sorted.slice(highCount + mediumCount),
      total: sorted.length
    };
  }

  // ============ TURBO CV TAILORING (≤600ms) ============
  async function turboTailorCV(cvText, keywords, options = {}) {
    const startTime = performance.now();
    
    if (!cvText || !keywords?.all?.length) {
      return { tailoredCV: cvText, injectedKeywords: [], timing: 0, stats: {} };
    }

    // Use TailorUniversal if available
    let result;
    if (global.TailorUniversal) {
      result = await global.TailorUniversal.tailorCV(cvText, keywords, options);
    } else {
      result = fastTailorFallback(cvText, keywords);
    }

    const timing = performance.now() - startTime;
    console.log(`[TurboPipeline] CV tailored in ${timing.toFixed(0)}ms (target: ${TIMING_TARGETS.TAILOR_CV}ms)`);
    
    return { ...result, timing };
  }

  // Fast CV tailoring fallback
  function fastTailorFallback(cvText, keywords) {
    const cvLower = cvText.toLowerCase();
    const missing = keywords.all.filter(kw => !cvLower.includes(kw.toLowerCase()));
    
    if (missing.length === 0) {
      return { tailoredCV: cvText, injectedKeywords: [], stats: { total: 0 } };
    }

    let tailoredCV = cvText;
    const injected = [];

    // Fast skills injection
    const skillsMatch = /^(SKILLS|TECHNICAL SKILLS|CORE SKILLS)[\s:]*$/im.exec(tailoredCV);
    if (skillsMatch) {
      const insertPos = tailoredCV.indexOf('\n', skillsMatch.index);
      if (insertPos > -1) {
        const skillsToAdd = missing.slice(0, 15);
        // Comma-separated format per requirements
        const skillsLine = `\n${skillsToAdd.join(', ')}\n`;
        tailoredCV = tailoredCV.slice(0, insertPos + 1) + skillsLine + tailoredCV.slice(insertPos + 1);
        injected.push(...skillsToAdd);
      }
    } else {
      // Create new skills section
      const educationMatch = /^(EDUCATION|ACADEMIC)[\s:]*$/im.exec(tailoredCV);
      const skillsToAdd = missing.slice(0, 15);
      const newSkillsSection = `\nSKILLS\n${skillsToAdd.join(', ')}\n\n`;
      
      if (educationMatch) {
        tailoredCV = tailoredCV.slice(0, educationMatch.index) + newSkillsSection + tailoredCV.slice(educationMatch.index);
      } else {
        tailoredCV = tailoredCV + newSkillsSection;
      }
      injected.push(...skillsToAdd);
    }

    return {
      tailoredCV,
      originalCV: cvText,
      injectedKeywords: injected,
      stats: { total: injected.length, skills: injected.length }
    };
  }

  // ============ PARALLEL OPERATIONS ============
  async function runParallel(tasks) {
    const results = await Promise.all(tasks.map(async (task) => {
      try {
        return { success: true, result: await task.fn() };
      } catch (error) {
        console.error(`[TurboPipeline] Task failed:`, error);
        return { success: false, error };
      }
    }));
    return results;
  }

  // ============ COMPLETE TURBO PIPELINE (≤2.4s total) ============
  async function executeTurboPipeline(jobInfo, candidateData, baseCV, options = {}) {
    const pipelineStart = performance.now();
    const timings = {};
    
    console.log('[TurboPipeline] Starting turbo pipeline for:', jobInfo.title);
    
    // PHASE 1: Extract keywords (≤400ms)
    const jdText = jobInfo.description || '';
    const keywordsResult = await turboExtractKeywords(jdText);
    timings.extraction = keywordsResult.timing;

    if (!keywordsResult.all?.length) {
      console.warn('[TurboPipeline] No keywords extracted');
      return { success: false, error: 'No keywords extracted' };
    }

    // PHASE 2: Tailor CV (≤600ms)
    const tailorResult = await turboTailorCV(baseCV, keywordsResult, { targetScore: 95 });
    timings.tailoring = tailorResult.timing;

    // PHASE 3: Generate PDF will happen in pdf-ats-turbo.js (≤800ms)
    // PHASE 4: Attach files will happen in content.js (≤200ms)

    const totalTime = performance.now() - pipelineStart;
    timings.total = totalTime;

    console.log(`[TurboPipeline] Pipeline complete in ${totalTime.toFixed(0)}ms (target: ${TIMING_TARGETS.TOTAL}ms)`);
    console.log('[TurboPipeline] Timings:', timings);

    return {
      success: true,
      keywords: keywordsResult,
      tailoredCV: tailorResult.tailoredCV,
      injectedKeywords: tailorResult.injectedKeywords,
      stats: tailorResult.stats,
      timings,
      meetsTarget: totalTime <= TIMING_TARGETS.TOTAL
    };
  }

  // ============ EXPORTS ============
  global.TurboPipeline = {
    executeTurboPipeline,
    turboExtractKeywords,
    turboTailorCV,
    runParallel,
    TIMING_TARGETS,
    clearCache: () => keywordCache.clear()
  };

})(typeof window !== 'undefined' ? window : global);
