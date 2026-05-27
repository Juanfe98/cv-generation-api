import type { AIProvider } from './ai-provider';
import type {
  AnalyzeCvInput,
  AnalyzeCvResult,
  GenerateExperienceBulletsInput,
  GenerateExperienceBulletsResult,
  ImproveTextInput,
  ImproveTextResult,
} from '../ai.types';
import type { ParseCvResponse } from '../../cv-import/cv-import.schemas';

export class MockAIProvider implements AIProvider {
  async generateExperienceBullets(
    input: GenerateExperienceBulletsInput,
  ): Promise<GenerateExperienceBulletsResult> {
    const role = input.role;
    const company = input.company ?? 'the company';

    return {
      suggestions: [
        {
          text: `Led the design and delivery of core ${role} features at ${company}, reducing time-to-production by 35% through process improvements and close collaboration with product and QA teams.`,
          reason:
            'Opens with ownership, names the role and company, and quantifies business impact.',
        },
        {
          text: `Mentored 3 junior engineers and ran bi-weekly technical reviews, raising team code quality scores from 62% to 89% over two quarters.`,
          reason:
            'Highlights leadership and measurable quality improvement with a before/after metric.',
        },
        {
          text: `Refactored the legacy data pipeline to an event-driven architecture, cutting average processing time from 8 minutes to under 40 seconds and eliminating a recurring class of production incidents.`,
          reason: 'Shows technical depth with concrete before/after numbers and a solved problem.',
        },
      ],
    };
  }

  async improveText(input: ImproveTextInput): Promise<ImproveTextResult> {
    const sectionSuggestions: Record<string, ImproveTextResult['suggestions']> = {
      summary: [
        {
          text: `Results-driven ${input.targetRole ?? 'software engineer'} with a track record of delivering scalable systems and cross-functional collaboration. Passionate about clean architecture and measurable business outcomes.`,
          reason:
            'Leads with value proposition, avoids filler phrases, and ends with a specific focus area.',
        },
        {
          text: `${input.targetRole ?? 'Engineer'} specialising in building reliable, high-throughput systems. Known for translating complex requirements into clear technical plans and shipping with quality.`,
          reason: 'More concise framing with a distinct differentiator.',
        },
      ],
      experience: [
        {
          text: input.text.replace(/^(i |we )/i, '').replace(/responsible for/i, 'owned'),
          reason:
            'Removes first-person language and replaces passive phrasing with an action verb.',
        },
        {
          text: `${input.text.trim()} — delivered on time and within scope, contributing to a 20% improvement in team velocity.`,
          reason: 'Appends a business outcome to anchor the statement with measurable impact.',
        },
        {
          text:
            input.text.charAt(0).toUpperCase() +
            input.text.slice(1).replace(/\.$/, '') +
            ', resulting in improved reliability and reduced on-call burden.',
          reason: 'Adds a consequence that signals operational maturity.',
        },
      ],
      project: [
        {
          text: `Built and shipped ${input.text.trim()}, handling end-to-end ownership from design through production deployment.`,
          reason: 'Frames ownership clearly and signals full-cycle delivery experience.',
        },
        {
          text: `${input.text.trim()} — designed with extensibility in mind, enabling the team to onboard two additional use-cases without rework.`,
          reason: 'Adds forward-looking design thinking to a project statement.',
        },
      ],
      education: [
        {
          text:
            input.text.trim() +
            ' Graduated with distinction; coursework focused on distributed systems and software design.',
          reason: 'Adds academic context and relevant specialisation to a bare education entry.',
        },
        {
          text:
            input.text.trim() +
            ' Completed final-year project on machine learning pipelines, earning highest departmental grade.',
          reason: 'Anchors the entry with a standout achievement relevant to technical roles.',
        },
      ],
      skills: [
        {
          text: input.text.trim().replace(/,\s*/g, ' · '),
          reason: 'Uses separator dots for better visual scannability in skills sections.',
        },
        {
          text: `Languages & Frameworks: ${input.text.trim()}. Comfortable working across the full stack in fast-paced environments.`,
          reason: 'Groups and contextualises skills to signal adaptability.',
        },
      ],
    };

    return {
      suggestions: sectionSuggestions[input.section] ?? sectionSuggestions.experience,
    };
  }

  async parseCv(_cvText: string): Promise<ParseCvResponse> {
    return {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '+1 555 000 1234',
      location: 'San Francisco, CA',
      summary:
        'Senior Software Engineer with 8 years of experience building scalable web applications.',
      experience: [
        {
          company: 'Acme Corp',
          role: 'Senior Software Engineer',
          startDate: '2020-03',
          endDate: undefined,
          current: true,
          highlights: [
            'Led migration of monolith to microservices, reducing deployment time by 60%',
            'Mentored 4 junior engineers and ran weekly technical reviews',
          ],
        },
        {
          company: 'Startup Inc',
          role: 'Software Engineer',
          startDate: '2017-06',
          endDate: '2020-02',
          current: false,
          highlights: ['Built the core API serving 1M+ daily requests'],
        },
      ],
      education: [
        {
          institution: 'University of California, Berkeley',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          startDate: '2013-09',
          endDate: '2017-05',
        },
      ],
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
      languages: [
        { name: 'English', level: 'Native' },
        { name: 'Spanish', level: 'Conversational' },
      ],
      certifications: [{ name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2022-04' }],
    };
  }

  async analyzeCv(input: AnalyzeCvInput): Promise<AnalyzeCvResult> {
    const role = input.targetRole ?? 'the target role';

    return {
      score: 68,
      strengths: [
        'Clear and chronological work history with named companies and dates.',
        'Good use of technical keywords relevant to modern software engineering roles.',
        'At least one quantified achievement present in the experience section.',
      ],
      improvements: [
        {
          section: 'summary',
          message: `The summary is generic. Tailor it explicitly to ${role} and lead with your strongest differentiator.`,
          priority: 'high',
        },
        {
          section: 'experience',
          message:
            'Several bullets start with passive phrases ("responsible for", "involved in"). Replace each with an action verb and add a measurable result.',
          priority: 'high',
        },
        {
          section: 'skills',
          message:
            'Skills are listed as a flat block. Group them by category (Languages, Frameworks, Tools, Platforms) to improve scannability.',
          priority: 'medium',
        },
        {
          section: 'experience',
          message:
            'Only one role includes a quantified metric. Aim for at least one number per bullet (%, time saved, team size, scale).',
          priority: 'medium',
        },
        {
          section: 'education',
          message:
            'If you graduated within the last 5 years, move education below experience. Otherwise, consider removing GPA if not above 3.7.',
          priority: 'low',
        },
      ],
    };
  }
}
