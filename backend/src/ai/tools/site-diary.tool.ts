import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';
import { SiteDiary } from '../../diary/diary.entity';

export const createSiteDiaryTools = (
  dataSource: DataSource,
  projectId: string,
  options?: { defaultYear?: number }
) => {
  const repo = dataSource.getRepository(SiteDiary);
  const activeProjectYear = options?.defaultYear || new Date().getFullYear();

  return {
    search_site_diaries: tool(<any>{
      description:
        'Search and retrieve daily site diary records, daily progress logs, site activities, labour counts, materials received, weather conditions, equipment usage, site issues, instructions given, and next-day plans by exact date (YYYY-MM-DD), date range, or activity keyword.',
      parameters: z.object({
        date: z
          .string()
          .optional()
          .describe(
            `Exact date in YYYY-MM-DD format (e.g. "${activeProjectYear}-08-07"). When the user query specifies a month/day without an explicit year, resolve it using the active project operational year (${activeProjectYear}). Preserve explicit user-provided years (e.g. "2025-08-07"). NEVER infer historical years from tender or contract document dates.`
          ),
        startDate: z
          .string()
          .optional()
          .describe(
            `Start date in YYYY-MM-DD format (e.g. "${activeProjectYear}-08-01"). When year is omitted, resolve using active project year (${activeProjectYear}).`
          ),
        endDate: z
          .string()
          .optional()
          .describe(
            `End date in YYYY-MM-DD format (e.g. "${activeProjectYear}-08-07"). When year is omitted, resolve using active project year (${activeProjectYear}).`
          ),
        keyword: z
          .string()
          .optional()
          .describe('Specific keyword filter (e.g. "dewatering", "excavation", "cement"). Pass dates into the date/startDate/endDate fields, not here.'),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of diary entries to return (default: 10).'),
      }),
      execute: async (args: any) => {
        try {
          const rawDate = (args?.date || '').trim();
          const rawStartDate = (args?.startDate || '').trim();
          const rawEndDate = (args?.endDate || '').trim();
          let keyword = (args?.keyword || args?.query || '').trim();
          const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 50);

          // Helper to normalize and validate date (YYYY-MM-DD) with project-aware temporal grounding
          const normalizeDate = (d: string): string | null => {
            if (!d) return null;
            const trimmed = d.trim();

            // 1. Exact ISO YYYY-MM-DD format (e.g. "2026-08-07", "2025-08-07")
            const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (isoMatch) {
              const year = isoMatch[1];
              const month = isoMatch[2].padStart(2, '0');
              const day = isoMatch[3].padStart(2, '0');
              return `${year}-${month}-${day}`;
            }

            // 2. Month-Day format without year: "MM-DD" or "M-D" (e.g. "08-07", "8-7")
            const mdMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})$/);
            if (mdMatch) {
              const month = mdMatch[1].padStart(2, '0');
              const day = mdMatch[2].padStart(2, '0');
              return `${activeProjectYear}-${month}-${day}`;
            }

            // 3. Natural language or month-name formats (e.g. "7th August", "August 7", "7 August 2025")
            const cleanNL = trimmed.replace(/(\d+)(st|nd|rd|th)/i, '$1');
            const hasMonth = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(cleanNL);
            const hasExplicitYear = /\b(19\d\d|20\d\d)\b/.test(cleanNL);

            if (hasMonth) {
              const dateStringToParse = hasExplicitYear ? cleanNL : `${cleanNL} ${activeProjectYear}`;
              const parsed = new Date(dateStringToParse);
              if (!isNaN(parsed.getTime())) {
                const year = parsed.getFullYear();
                const month = String(parsed.getMonth() + 1).padStart(2, '0');
                const day = String(parsed.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              }
            }

            const parsedDirect = new Date(cleanNL);
            if (!isNaN(parsedDirect.getTime()) && parsedDirect.getFullYear() > 1970) {
              const year = parsedDirect.getFullYear();
              const month = String(parsedDirect.getMonth() + 1).padStart(2, '0');
              const day = String(parsedDirect.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            }

            return null;
          };

          const extractDateFromText = (text: string): { date: string | null; cleanKeyword: string } => {
            if (!text) return { date: null, cleanKeyword: '' };
            let cleanKeyword = text.trim();

            const isoMatch = cleanKeyword.match(/\b(\d{4}-\d{1,2}-\d{1,2})\b/);
            if (isoMatch) {
              const parts = isoMatch[1].split('-');
              const d = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              cleanKeyword = cleanKeyword.replace(isoMatch[0], '').replace(/\b(on|for|dated?)\b/gi, '').trim();
              return { date: d, cleanKeyword };
            }

            const monthPattern = /\b(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{1,2})(?:st|nd|rd|th)?)?(?:\s+(\d{4}))?\b/i;
            const match = cleanKeyword.match(monthPattern);
            if (match) {
              const day = match[1] || match[3];
              const month = match[2];
              const explicitYear = match[4];
              if (day && month) {
                const yearToUse = explicitYear ? parseInt(explicitYear, 10) : activeProjectYear;
                const parsed = new Date(`${day} ${month} ${yearToUse}`);
                if (!isNaN(parsed.getTime())) {
                  const formatted = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
                  cleanKeyword = cleanKeyword.replace(match[0], '').replace(/\b(on|for|dated?|received|materials|activities)\b/gi, '').trim();
                  return { date: formatted, cleanKeyword };
                }
              }
            }

            return { date: null, cleanKeyword };
          };

          let date = normalizeDate(rawDate);
          let startDate = normalizeDate(rawStartDate);
          let endDate = normalizeDate(rawEndDate);

          // If date was not supplied in the date parameter, but embedded in keyword parameter
          if (!date && !startDate && !endDate && keyword) {
            const extracted = extractDateFromText(keyword);
            if (extracted.date) {
              date = extracted.date;
              keyword = extracted.cleanKeyword;
            }
          }

          if (rawDate && !date) {
            return {
              error: `Invalid date format: "${rawDate}". Please provide dates in YYYY-MM-DD format (e.g. "${activeProjectYear}-08-07").`,
            };
          }
          if (rawStartDate && !startDate) {
            return {
              error: `Invalid startDate format: "${rawStartDate}". Please provide dates in YYYY-MM-DD format (e.g. "${activeProjectYear}-08-01").`,
            };
          }
          if (rawEndDate && !endDate) {
            return {
              error: `Invalid endDate format: "${rawEndDate}". Please provide dates in YYYY-MM-DD format (e.g. "${activeProjectYear}-08-07").`,
            };
          }

          const qb = repo.createQueryBuilder('d').orderBy('d.date', 'DESC');

          // Strict Project Scoping
          if (projectId) {
            qb.andWhere('d.projectId = :projectId', { projectId });
          }

          // Exact Date vs Date Range
          if (date) {
            qb.andWhere('d.date = :date', { date });
          } else {
            if (startDate) {
              qb.andWhere('d.date >= :startDate', { startDate });
            }
            if (endDate) {
              qb.andWhere('d.date <= :endDate', { endDate });
            }
          }

          // Keyword Search across text & JSONB fields
          if (keyword) {
            qb.andWhere(
              '(d.issuesFaced ILIKE :kw OR d.instructionsGiven ILIKE :kw OR d.nextDayPlan ILIKE :kw OR CAST(d.workDone AS text) ILIKE :kw OR CAST(d.materialsReceived AS text) ILIKE :kw OR CAST(d.equipment AS text) ILIKE :kw)',
              { kw: `%${keyword}%` }
            );
          }

          qb.take(limit);

          const entries = await qb.getMany();

          if (!entries || entries.length === 0) {
            return {
              found: false,
              count: 0,
              message: 'No matching site diary records found for the specified project and criteria.',
              filter: {
                date: date || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                keyword: keyword || undefined,
              },
            };
          }

          return {
            found: true,
            count: entries.length,
            entries: entries.map((d) => ({
              id: d.id,
              date: typeof d.date === 'string' ? d.date : new Date(d.date).toISOString().split('T')[0],
              status: d.status,
              weather: {
                morning: d.weatherMorning,
                afternoon: d.weatherAfternoon,
                rainfallMm: Number(d.rainfallMm) || 0,
                workStoppedWeather: d.workStoppedWeather,
                hoursLost: Number(d.hoursLost) || 0,
              },
              labour: {
                skilled: d.labourSkilled,
                unskilled: d.labourUnskilled,
                supervisory: d.labourSupervisory,
                total: d.labourTotal,
              },
              workDone: d.workDone || [],
              materialsReceived: d.materialsReceived || [],
              equipment: d.equipment || [],
              visitors: d.visitors || [],
              issuesFaced: d.issuesFaced || '',
              instructionsGiven: d.instructionsGiven || '',
              nextDayPlan: d.nextDayPlan || '',
              submittedBy: d.submittedBy || '',
            })),
          };
        } catch (err: any) {
          return {
            error: `Failed to query site diaries: ${err.message || 'Unknown database error'}`,
          };
        }
      },
    }),
  };
};
