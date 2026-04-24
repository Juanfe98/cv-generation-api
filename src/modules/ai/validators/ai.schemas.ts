import { z } from 'zod';

// ─── Shared enums ─────────────────────────────────────────────────────────────
// Exported so routes, use-cases, and normalizers import from one place.

export const toneSchema = z.enum(['professional', 'concise', 'impactful']);

export const cvSectionSchema = z.enum(['summary', 'experience', 'project', 'education', 'skills']);

export const prioritySchema = z.enum(['low', 'medium', 'high']);

// ─── Request schemas ──────────────────────────────────────────────────────────

export const generateExperienceBulletsRequestSchema = z.object({
  role: z.string().min(1).max(120),
  company: z.string().max(120).optional(),
  seniority: z.string().max(80).optional(),
  technologies: z.array(z.string().max(60)).max(20).optional(),
  responsibilities: z.string().max(2000).optional(),
  targetRole: z.string().max(120).optional(),
  tone: toneSchema.optional(),
});

export const improveTextRequestSchema = z.object({
  text: z.string().min(1).max(3000),
  section: cvSectionSchema,
  tone: toneSchema.optional(),
  targetRole: z.string().max(120).optional(),
});

// cv stays flexible until CvModel is defined; swap z.record(...) for the model schema then.
export const analyzeCvRequestSchema = z.object({
  cv: z.record(z.string(), z.unknown()),
  targetRole: z.string().max(120).optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────────────

export const aiSuggestionSchema = z.object({
  text: z.string().min(1).max(600),
  reason: z.string().max(400).optional(),
});

export const suggestionsResponseSchema = z.object({
  suggestions: z.array(aiSuggestionSchema).min(1).max(5),
});

export const cvImprovementSchema = z.object({
  section: z.string().min(1),
  message: z.string().min(1),
  priority: prioritySchema,
});

export const analyzeCvResponseSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string().min(1)).max(10),
  improvements: z.array(cvImprovementSchema),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type Tone = z.infer<typeof toneSchema>;
export type CvSection = z.infer<typeof cvSectionSchema>;
export type Priority = z.infer<typeof prioritySchema>;

export type GenerateExperienceBulletsRequest = z.infer<typeof generateExperienceBulletsRequestSchema>;
export type ImproveTextRequest = z.infer<typeof improveTextRequestSchema>;
export type AnalyzeCvRequest = z.infer<typeof analyzeCvRequestSchema>;

export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;
export type SuggestionsResponse = z.infer<typeof suggestionsResponseSchema>;
export type CvImprovement = z.infer<typeof cvImprovementSchema>;
export type AnalyzeCvResponse = z.infer<typeof analyzeCvResponseSchema>;
