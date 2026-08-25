jest.mock('ai', () => ({
  tool: (config: any) => config,
}));

import { createSiteDiaryTools } from './site-diary.tool';
import { WeatherCondition, DiaryStatus } from '../../diary/diary.entity';

describe('createSiteDiaryTools - Unit Tests', () => {
  let mockRepo: any;
  let mockDataSource: any;
  let mockQueryBuilder: any;
  const projectId = 'proj-dal-lake-123';

  const sampleDiaries = [
    {
      id: 'diary-1',
      projectId,
      date: '2026-08-08',
      submittedBy: 'Shahid Parvez Khan',
      status: DiaryStatus.APPROVED,
      weatherMorning: WeatherCondition.SUNNY,
      weatherAfternoon: WeatherCondition.CLOUDY,
      rainfallMm: 0,
      workStoppedWeather: false,
      hoursLost: 0,
      labourSkilled: 5,
      labourUnskilled: 10,
      labourSupervisory: 2,
      labourTotal: 17,
      workDone: [
        { zone: 'IPS-1', activity: 'Earthwork excavation for pump house sump', quantity: '45', unit: 'cum', remarks: 'Good progress' },
        { zone: 'SBR-2', activity: 'Dewatering waterlogged area', quantity: '1', unit: 'job', remarks: 'Pump operational' }
      ],
      materialsReceived: [
        { material: 'Cement OPC 43', quantity: '200', unit: 'bags', supplier: 'Khyber' }
      ],
      equipment: [
        { type: 'JCB 3DX', count: 1, hours: 8, remarks: 'Excavation' }
      ],
      visitors: [
        { name: 'Chief Engineer', organisation: 'UEED', purpose: 'General Site Visit' }
      ],
      issuesFaced: 'Minor seepage encountered at 3m depth',
      instructionsGiven: 'Deploy secondary dewatering pump',
      nextDayPlan: 'Continue PCC preparation for sump base',
    },
    {
      id: 'diary-2',
      projectId,
      date: '2026-08-07',
      submittedBy: 'Shahid Parvez Khan',
      status: DiaryStatus.DRAFT,
      weatherMorning: WeatherCondition.RAINY,
      weatherAfternoon: WeatherCondition.RAINY,
      rainfallMm: 25.5,
      workStoppedWeather: true,
      hoursLost: 4,
      labourSkilled: 2,
      labourUnskilled: 4,
      labourSupervisory: 1,
      labourTotal: 7,
      workDone: [
        { zone: 'Compound Wall', activity: 'Brick masonry', quantity: '10', unit: 'sqm', remarks: 'Stopped due to rain' }
      ],
      materialsReceived: [],
      equipment: [],
      visitors: [],
      issuesFaced: 'Heavy downpour caused localized waterlogging',
      instructionsGiven: 'Cover fresh masonry with tarpaulins',
      nextDayPlan: 'Resume once water is cleared',
    }
  ];

  beforeEach(() => {
    mockQueryBuilder = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(sampleDiaries),
    };

    mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepo),
    };
  });

  // 1. Exact date query & projection of visitors and submittedBy
  it('1. should query site diaries by exact date and project visitors and submittedBy', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId);
    mockQueryBuilder.getMany.mockResolvedValue([sampleDiaries[0]]);

    const result: any = await (tools.search_site_diaries as any).execute({ date: '2026-08-08' });

    expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('d');
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.projectId = :projectId', { projectId });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date = :date', { date: '2026-08-08' });
    expect(result.found).toBe(true);
    expect(result.count).toBe(1);
    expect(result.entries[0].date).toBe('2026-08-08');
    expect(result.entries[0].submittedBy).toBe('Shahid Parvez Khan');
    expect(result.entries[0].visitors).toEqual([
      { name: 'Chief Engineer', organisation: 'UEED', purpose: 'General Site Visit' }
    ]);
    expect(result.entries[0].workDone[0].activity).toContain('Earthwork excavation');
  });

  // 2. Date-range query
  it('2. should query site diaries across a date range', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId);
    mockQueryBuilder.getMany.mockResolvedValue(sampleDiaries);

    const result: any = await (tools.search_site_diaries as any).execute({ startDate: '2026-08-01', endDate: '2026-08-08' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.projectId = :projectId', { projectId });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date >= :startDate', { startDate: '2026-08-01' });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date <= :endDate', { endDate: '2026-08-08' });
    expect(result.found).toBe(true);
    expect(result.count).toBe(2);
  });

  // 3. Keyword query
  it('3. should search site diaries by keyword', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId);
    mockQueryBuilder.getMany.mockResolvedValue([sampleDiaries[0]]);

    const result: any = await (tools.search_site_diaries as any).execute({ keyword: 'dewatering' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('d.issuesFaced ILIKE :kw'),
      { kw: '%dewatering%' }
    );
    expect(result.found).toBe(true);
    expect(result.entries[0].workDone[1].activity).toContain('Dewatering');
  });

  // 4. Date + keyword query
  it('4. should filter by both date and keyword', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId);
    mockQueryBuilder.getMany.mockResolvedValue([sampleDiaries[0]]);

    const result: any = await (tools.search_site_diaries as any).execute({ date: '2026-08-08', keyword: 'excavation' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date = :date', { date: '2026-08-08' });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('CAST(d.workDone AS text) ILIKE :kw'),
      { kw: '%excavation%' }
    );
    expect(result.found).toBe(true);
    expect(result.count).toBe(1);
  });

  // 5. No results found
  it('5. should return structured not-found response when no entries match', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId);
    mockQueryBuilder.getMany.mockResolvedValue([]);

    const result: any = await (tools.search_site_diaries as any).execute({ date: '2026-08-15' });

    expect(result.found).toBe(false);
    expect(result.count).toBe(0);
    expect(result.message).toContain('No matching site diary records found');
  });

  // 6. Project isolation
  it('6. should enforce strict project isolation', async () => {
    const customProjectId = 'proj-other-456';
    const tools = createSiteDiaryTools(mockDataSource, customProjectId);

    await (tools.search_site_diaries as any).execute({ date: '2026-08-08' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.projectId = :projectId', { projectId: customProjectId });
  });

  // 7. Invalid date format handling
  it('7. should return clear validation error for invalid date format', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId);

    const result: any = await (tools.search_site_diaries as any).execute({ date: 'invalid-not-a-date' });

    expect(result.error).toContain('Invalid date format');
    expect(mockRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  // 8. Multiple diary records on the same date / pagination limit
  it('8. should respect custom limit parameter', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId);
    mockQueryBuilder.getMany.mockResolvedValue(sampleDiaries);

    await (tools.search_site_diaries as any).execute({ limit: 5 });

    expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
  });

  // 9. Temporal Grounding: "7 August" resolves to active project year (e.g. 2026)
  it('9. should resolve natural language "7 August" using active project year', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId, { defaultYear: 2026 });
    mockQueryBuilder.getMany.mockResolvedValue([sampleDiaries[1]]);

    await (tools.search_site_diaries as any).execute({ date: '7th August' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date = :date', { date: '2026-08-07' });
  });

  // 10. Temporal Grounding: "7 August" resolves to future active project year (2027)
  it('10. should resolve "7 August" dynamically when active project year moves to 2027', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId, { defaultYear: 2027 });
    mockQueryBuilder.getMany.mockResolvedValue([]);

    await (tools.search_site_diaries as any).execute({ date: 'August 7' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date = :date', { date: '2027-08-07' });
  });

  // 11. Temporal Grounding: Explicit historical year preserved ("7 August 2025")
  it('11. should preserve explicit user-provided year "7 August 2025"', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId, { defaultYear: 2026 });
    mockQueryBuilder.getMany.mockResolvedValue([]);

    await (tools.search_site_diaries as any).execute({ date: '7 August 2025' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date = :date', { date: '2025-08-07' });
  });

  // 12. Temporal Grounding: Date range with omitted year resolves both boundaries to active year
  it('12. should resolve date range boundaries to active project year when omitted', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId, { defaultYear: 2026 });
    mockQueryBuilder.getMany.mockResolvedValue(sampleDiaries);

    await (tools.search_site_diaries as any).execute({ startDate: '1 August', endDate: '7 August' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date >= :startDate', { startDate: '2026-08-01' });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date <= :endDate', { endDate: '2026-08-07' });
  });

  // 13. Temporal Grounding: Date range with explicit historical year preserved
  it('13. should preserve explicit historical years across date range', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId, { defaultYear: 2026 });
    mockQueryBuilder.getMany.mockResolvedValue([]);

    await (tools.search_site_diaries as any).execute({ startDate: '1 August 2025', endDate: '7 August 2025' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date >= :startDate', { startDate: '2025-08-01' });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date <= :endDate', { endDate: '2025-08-07' });
  });

  // 14. Exact ISO format preserved
  it('14. should preserve exact ISO formatted dates without modification', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId, { defaultYear: 2026 });
    mockQueryBuilder.getMany.mockResolvedValue([sampleDiaries[0]]);

    await (tools.search_site_diaries as any).execute({ date: '2026-08-08' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date = :date', { date: '2026-08-08' });
  });

  // 15. Invalid non-date strings rejected
  it('15. should reject arbitrary non-date strings', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId, { defaultYear: 2026 });

    const result: any = await (tools.search_site_diaries as any).execute({ date: 'random text 999' });

    expect(result.error).toContain('Invalid date format');
  });

  // 16. Fallback date extraction when date is passed inside keyword
  it('16. should extract date when passed inside keyword string', async () => {
    const tools = createSiteDiaryTools(mockDataSource, projectId, { defaultYear: 2026 });
    mockQueryBuilder.getMany.mockResolvedValue([sampleDiaries[1]]);

    await (tools.search_site_diaries as any).execute({ keyword: 'materials received on 7 August' });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.date = :date', { date: '2026-08-07' });
  });
});
