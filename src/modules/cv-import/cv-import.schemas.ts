import { z } from 'zod';

export const parseCvExperienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  highlights: z.array(z.string()).optional(),
});

export const parseCvEducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const parseCvLanguageSchema = z.object({
  name: z.string().min(1),
  level: z.string().optional(),
});

export const parseCvCertificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

export const parseCvResponseSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  experience: z.array(parseCvExperienceSchema).optional(),
  education: z.array(parseCvEducationSchema).optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(parseCvLanguageSchema).optional(),
  certifications: z.array(parseCvCertificationSchema).optional(),
});

export type ParseCvResponse = z.infer<typeof parseCvResponseSchema>;
