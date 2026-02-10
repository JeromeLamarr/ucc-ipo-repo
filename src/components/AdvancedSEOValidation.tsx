/**
 * Advanced SEO & Content Validation (Phase 3)
 * Comprehensive validation for SEO best practices and readability
 */

import { AlertCircle, CheckCircle2, TrendingUp, BookOpen } from 'lucide-react';
import { useState, useMemo } from 'react';

interface SEOValidationProps {
  content: Record<string, any>;
}

interface ValidationResult {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: ValidationIssue[];
}

interface ValidationIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'suggestion';
  fix?: string;
}

// Flesch-Kincaid Readability Grade Level calculation
function calculateReadabilityGrade(text: string): number {
  const cleanText = text.replace(/<[^>]*>/g, '');
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = cleanText.split(/\s+/).filter(w => w.length > 0).length;
  const syllables = countSyllables(cleanText);

  if (sentences === 0 || words === 0) return 0;

  // Flesch-Kincaid formula
  const grade = (0.39 * (words / sentences)) + (11.8 * (syllables / words)) - 15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

// Estimate syllable count (simplified)
function countSyllables(text: string): number {
  let count = 0;
  text = text.toLowerCase();
  const syllableRules = [
    /[^aeiou]ough/g,
    /[^aeiouy]e$/g,
    /[aeiouy]{2}/g,
    /[aeiouy]/g,
    /e[d|t]$/g,
  ];

  for (const rule of syllableRules) {
    const matches = text.match(rule);
    count += matches ? matches.length : 0;
  }

  return Math.max(1, count);
}

// Calculate keywordDensity
function calculateKeywordDensity(text: string, keyword: string): number {
  if (!keyword || keyword.length === 0) return 0;
  const cleanText = text.toLowerCase().replace(/<[^>]*>/g, '');
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  const keywordLower = keyword.toLowerCase();
  const keywordCount = words.filter(w => w.includes(keywordLower)).length;
  return (keywordCount / words.length) * 100;
}

export function AdvancedSEOValidation({ content }: SEOValidationProps) {
  const [selectedKeyword, setSelectedKeyword] = useState('');

  const validation = useMemo(() => {
    return validateSEO(content, selectedKeyword);
  }, [content, selectedKeyword]);

  const gradeColor = {
    A: 'text-green-600 bg-green-50',
    B: 'text-blue-600 bg-blue-50',
    C: 'text-yellow-600 bg-yellow-50',
    D: 'text-orange-600 bg-orange-50',
    F: 'text-red-600 bg-red-50',
  };

  return (
    <div className="space-y-4">
      {/* SEO Score Card */}
      <div className={`p-6 rounded-lg border-2 text-center ${gradeColor[validation.grade]}`}>
        <div className="text-5xl font-bold mb-2">{validation.grade}</div>
        <div className="text-lg font-semibold mb-1">SEO Score: {validation.score}/100</div>
        <div className="text-sm opacity-75">
          {validation.score >= 80
            ? 'Excellent! Ready to publish'
            : validation.score >= 60
              ? 'Good. Consider improvements below'
              : 'Fair. Address critical issues first'}
        </div>
      </div>

      {/* Keyword Focus (Optional) */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Main Keyword (Optional)
          <span className="text-xs font-normal text-gray-600 ml-2">
            for keyword density analysis
          </span>
        </label>
        <input
          type="text"
          value={selectedKeyword}
          onChange={(e) => setSelectedKeyword(e.target.value)}
          placeholder="e.g., text block editor, content creation"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Readability Metrics */}
      <ReadabilityMetrics content={content} />

      {/* Critical Issues */}
      {validation.issues.length > 0 && (
        <ValidationSection
          title="🔴 Critical Issues"
          issues={validation.issues}
          color="red"
        />
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <ValidationSection
          title="🟡 Warnings"
          issues={validation.warnings}
          color="yellow"
        />
      )}

      {/* Suggestions */}
      {validation.suggestions.length > 0 && (
        <ValidationSection
          title="💡 Suggestions"
          issues={validation.suggestions}
          color="blue"
        />
      )}

      {/* All Checks Passed */}
      {validation.issues.length === 0 && validation.warnings.length === 0 && validation.suggestions.length === 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">All SEO checks passed! 🎉</span>
          </div>
        </div>
      )}

      {/* SEO Best Practices */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          SEO Best Practices
        </h4>
        <ul className="text-xs text-gray-700 space-y-2">
          <li>✅ Optimal word count: 300-2500 words</li>
          <li>✅ Use descriptive headings (H1, H2, H3)</li>
          <li>✅ Include keyword in title and first paragraph</li>
          <li>✅ Keep paragraphs short (2-4 sentences)</li>
          <li>✅ Use active voice when possible</li>
          <li>✅ Add internal links to related content</li>
          <li>✅ Use bullet points for scannability</li>
          <li>✅ Meta description: 50-160 characters</li>
        </ul>
      </div>
    </div>
  );
}

function validateSEO(content: Record<string, any>, keyword: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const suggestions: ValidationIssue[] = [];

  const body = content.body || '';
  const title = content.title || '';
  const cleanBody = body.replace(/<[^>]*>/g, '');
  const words = cleanBody.split(/\s+/).filter((w: string) => w.length > 0);
  const sentences = cleanBody.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

  // Check word count
  if (wordCount < 100) {
    issues.push({
      id: 'word-count-low',
      title: 'Content Too Short',
      description: `Current: ${wordCount} words. Recommended: 300+ words for better SEO.`,
      severity: 'critical',
      fix: 'Expand your content with more details and information',
    });
  } else if (wordCount > 3000) {
    warnings.push({
      id: 'word-count-high',
      title: 'Content Very Long',
      description: `Current: ${wordCount} words. Consider breaking into multiple sections.`,
      severity: 'warning',
    });
  }

  // Check title
  if (!title) {
    warnings.push({
      id: 'no-title',
      title: 'Missing Section Title',
      description: 'Adding a title improves structure and SEO',
      severity: 'warning',
      fix: 'Add a descriptive title for this section',
    });
  } else if (title.length < 10) {
    suggestions.push({
      id: 'title-short',
      title: 'Title Could Be More Descriptive',
      description: `Current: "${title}". Make it more specific.`,
      severity: 'suggestion',
    });
  } else if (title.length > 100) {
    warnings.push({
      id: 'title-long',
      title: 'Title Is Too Long',
      description: `Current: ${title.length} characters. Keep titles under 100 characters.`,
      severity: 'warning',
    });
  }

  // Check paragraph length
  const paragraphs = cleanBody.split('\n\n').filter((p: string) => p.trim().length > 0);
  const longParagraphs = paragraphs.filter((p: string) => p.split(/\s+/).length > 100);
  if (longParagraphs.length > 0) {
    suggestions.push({
      id: 'long-paragraphs',
      title: 'Some Paragraphs Are Very Long',
      description: `${longParagraphs.length} paragraph(s) exceed 100 words. Break them up for readability.`,
      severity: 'suggestion',
    });
  }

  // Check sentence length
  if (avgWordsPerSentence > 20) {
    warnings.push({
      id: 'long-sentences',
      title: 'Sentences Are Too Long',
      description: `Average: ${avgWordsPerSentence.toFixed(1)} words/sentence. Keep sentences under 15 words.`,
      severity: 'warning',
      fix: 'Break long sentences into shorter ones',
    });
  }

  // Check keyword
  if (keyword && keyword.length > 0) {
    const density = calculateKeywordDensity(cleanBody, keyword);
    if (density < 0.5) {
      suggestions.push({
        id: 'low-keyword-density',
        title: 'Keyword Not Mentioned Enough',
        description: `Keyword density: ${density.toFixed(2)}%. Include your keyword more naturally (1-3%).`,
        severity: 'suggestion',
      });
    } else if (density > 5) {
      issues.push({
        id: 'high-keyword-density',
        title: 'Keyword Overuse',
        description: `Keyword density: ${density.toFixed(2)}%. Too high - avoid keyword stuffing.`,
        severity: 'critical',
        fix: 'Use your keyword more naturally, aim for 1-3%',
      });
    }
  }

  // Check for diversity
  const uniqueWords = new Set(words.map((w: string) => w.toLowerCase()));
  const diversity = (uniqueWords.size / words.length) * 100;
  if (diversity < 40) {
    warnings.push({
      id: 'low-diversity',
      title: 'Limited Vocabulary',
      description: `Word diversity: ${diversity.toFixed(1)}%. Use more varied vocabulary.`,
      severity: 'warning',
    });
  }

  // Calculate score
  let score = 100;
  issues.forEach(() => (score -= 25));
  warnings.forEach(() => (score -= 10));
  suggestions.forEach(() => (score -= 5));
  score = Math.max(0, Math.min(100, score));

  // Determine grade
  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  return { score, grade, issues, warnings, suggestions };
}

function ReadabilityMetrics({ content }: { content: Record<string, any> }) {
  const body = (content.body || '').replace(/<[^>]*>/g, '');
  const words = body.split(/\s+/).filter(w => w.length > 0);
  const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = body.split('\n\n').filter(p => p.trim().length > 0);

  const grade = calculateReadabilityGrade(body);
  const gradeDesc =
    grade < 6 ? 'Elementary School' : grade < 9 ? 'Middle School' : grade < 13 ? 'High School' : grade < 16 ? 'College' : 'Graduate';

  return (
    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-4">
      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-indigo-600" />
        Readability Analysis
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white rounded border border-indigo-200">
          <div className="text-2xl font-bold text-indigo-600">{grade.toFixed(1)}</div>
          <div className="text-xs text-gray-600">Grade Level</div>
          <div className="text-xs text-gray-500 mt-1">{gradeDesc}</div>
        </div>

        <div className="p-3 bg-white rounded border border-indigo-200">
          <div className="text-2xl font-bold text-blue-600">
            {Math.ceil((words.length / 200)) || 1}
          </div>
          <div className="text-xs text-gray-600">Min Read Time</div>
          <div className="text-xs text-gray-500 mt-1">At 200 words/min</div>
        </div>

        <div className="p-3 bg-white rounded border border-indigo-200">
          <div className="text-2xl font-bold text-purple-600">{words.length}</div>
          <div className="text-xs text-gray-600">Words</div>
        </div>

        <div className="p-3 bg-white rounded border border-indigo-200">
          <div className="text-2xl font-bold text-green-600">{sentences.length}</div>
          <div className="text-xs text-gray-600">Sentences</div>
        </div>
      </div>

      <div className="p-3 bg-white rounded border border-indigo-200">
        <div className="text-sm font-semibold text-gray-800 mb-2">Readability Tips</div>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>
            • Grade {grade < 6 ? '🟢' : grade < 9 ? '🟡' : '🔴'} {grade.toFixed(1)}: {gradeDesc} level (aim for 5-8)
          </li>
          <li>• Avg. sentence: {(words.length / sentences.length).toFixed(1)} words (aim for &lt;15)</li>
          <li>• Avg. paragraph: {(words.length / paragraphs.length).toFixed(0)} words (aim for &lt;100)</li>
        </ul>
      </div>
    </div>
  );
}

function ValidationSection({
  title,
  issues,
  color,
}: {
  title: string;
  issues: ValidationIssue[];
  color: 'red' | 'yellow' | 'blue';
}) {
  const bgClass = {
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
  }[color];

  const iconColor = {
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
  }[color];

  return (
    <div className={`p-4 ${bgClass} border rounded-lg space-y-2`}>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <div className="space-y-2">
        {issues.map(issue => (
          <div key={issue.id} className="p-3 bg-white rounded border border-gray-200">
            <div className="flex items-start gap-2">
              <AlertCircle className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{issue.title}</div>
                <p className="text-xs text-gray-600 mt-1">{issue.description}</p>
                {issue.fix && (
                  <p className="text-xs text-gray-700 mt-2 italic">
                    💡 <strong>Fix:</strong> {issue.fix}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
