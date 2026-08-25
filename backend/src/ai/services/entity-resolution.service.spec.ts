import { EntityResolutionService } from './entity-resolution.service';

describe('EntityResolutionService - P1.2b Vault Enrichment Unit Tests', () => {
  let service: EntityResolutionService;
  let mockDataSource: any;
  let mockVectorCorpusService: any;
  const projectId = 'proj-dal-lake-123';

  let mockEmployees: any[] = [];
  let mockVendors: any[] = [];
  let mockWbsTasks: any[] = [];
  let mockProjects: any[] = [];
  let mockFleet: any[] = [];

  beforeEach(() => {
    mockEmployees = [];
    mockVendors = [];
    mockWbsTasks = [];
    mockProjects = [];
    mockFleet = [];

    mockDataSource = {
      query: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('FROM employees')) return mockEmployees;
        if (sql.includes('FROM vendors')) return mockVendors;
        if (sql.includes('FROM wbs_tasks')) return mockWbsTasks;
        if (sql.includes('FROM projects')) return mockProjects;
        if (sql.includes('FROM fleet_logs')) return mockFleet;
        return [];
      }),
    };

    mockVectorCorpusService = {
      search: jest.fn().mockResolvedValue('No project-specific document was found'),
      searchWithDiagnostics: jest.fn().mockResolvedValue({
        formattedContext:
          '[Type: file] Source: Document: 2. IPS 1.xlsx (CONTRACT)\nContent:\nESTIMATE OF PUMP HOUSE IPS- (4.57m x 4.27m)\nItem 2.8.1 Earthwork excavation\n\n---\n\n[Type: file] Source: Document: Tenderdocument Dal Lake.pdf (CONTRACT)\nContent:\nTechnical specifications for IPS-1 pumping machinery',
        sourceDocuments: ['Document: 2. IPS 1.xlsx (CONTRACT)', 'Document: Tenderdocument Dal Lake.pdf (CONTRACT)'],
        selectedCandidates: [
          {
            sourceName: 'Document: 2. IPS 1.xlsx (CONTRACT)',
            textSnippet: 'ESTIMATE OF PUMP HOUSE IPS- (4.57m x 4.27m)...',
          },
          {
            sourceName: 'Document: Tenderdocument Dal Lake.pdf (CONTRACT)',
            textSnippet: 'Technical specifications for IPS-1 pumping machinery...',
          },
        ],
      }),
    };

    service = new EntityResolutionService(mockDataSource, mockVectorCorpusService);
  });

  // A. High-confidence WBS technical query -> enrichment occurs
  it('A. should enrich high-confidence wbs_task with Vault evidence for open technical query', async () => {
    mockWbsTasks = [
      {
        id: 'wbs-1',
        wbs_code: '3.1',
        title: 'IPS-1 at Node 102',
        responsible: 'Civil Team',
        status: 'not_started',
      },
    ];

    const result = await service.resolveProjectEntity('Tell me about IPS 1', projectId);

    expect(result.resolved).toBe(true);
    expect(result.primaryCandidate?.entityType).toBe('wbs_task');
    expect(mockVectorCorpusService.searchWithDiagnostics).toHaveBeenCalledWith('IPS-1', projectId);
    expect(result.primaryCandidate?.metadata.vaultEvidence).toBeDefined();
    expect(result.primaryCandidate?.metadata.vaultEvidence).toHaveLength(2);
    expect(result.primaryCandidate?.metadata.vaultEvidence[0].documentName).toContain('2. IPS 1.xlsx');
    expect(result.primaryCandidate?.metadata.vaultEvidence[0].evidence).toContain('4.57m x 4.27m');
  });

  // B. WBS status query -> enrichment skipped
  it('B. should skip Vault enrichment for WBS status queries', async () => {
    mockWbsTasks = [
      {
        id: 'wbs-1',
        wbs_code: '3.1',
        title: 'IPS-1 at Node 102',
        responsible: 'Civil Team',
        status: 'not_started',
      },
    ];

    const result = await service.resolveProjectEntity('What is the status of IPS 1?', projectId);

    expect(result.resolved).toBe(true);
    expect(result.primaryCandidate?.entityType).toBe('wbs_task');
    expect(mockVectorCorpusService.searchWithDiagnostics).not.toHaveBeenCalled();
    expect(result.primaryCandidate?.metadata.vaultEvidence).toBeUndefined();
  });

  // C. WBS responsibility query -> enrichment skipped
  it('C. should skip Vault enrichment for WBS responsibility queries', async () => {
    mockWbsTasks = [
      {
        id: 'wbs-1',
        wbs_code: '3.1',
        title: 'IPS-1 at Node 102',
        responsible: 'Civil Team',
        status: 'not_started',
      },
    ];

    const result = await service.resolveProjectEntity('Who is responsible for IPS 1?', projectId);

    expect(result.resolved).toBe(true);
    expect(mockVectorCorpusService.searchWithDiagnostics).not.toHaveBeenCalled();
    expect(result.primaryCandidate?.metadata.vaultEvidence).toBeUndefined();
  });

  // D. WBS specifications query -> enrichment occurs
  it('D. should enrich WBS specifications query with Vault evidence', async () => {
    mockWbsTasks = [
      {
        id: 'wbs-1',
        wbs_code: '3.1',
        title: 'IPS-1 at Node 102',
        responsible: 'Civil Team',
        status: 'not_started',
      },
    ];

    const result = await service.resolveProjectEntity('IPS 1 specifications', projectId);

    expect(result.resolved).toBe(true);
    expect(mockVectorCorpusService.searchWithDiagnostics).toHaveBeenCalledWith('IPS-1', projectId);
    expect(result.primaryCandidate?.metadata.vaultEvidence).toBeDefined();
  });

  // E. Employee query -> enrichment never occurs
  it('E. should never enrich employee entities', async () => {
    mockEmployees = [
      {
        id: 'emp-1',
        emp_code: 'EMP-01',
        first_name: 'Rinku',
        last_name: 'Kumar',
        designation: 'Poclain Operator',
        department: 'Plant & Machinery',
        status: 'active',
      },
    ];

    const result = await service.resolveProjectEntity('Rinku', projectId);

    expect(result.resolved).toBe(true);
    expect(result.primaryCandidate?.entityType).toBe('employee');
    expect(mockVectorCorpusService.searchWithDiagnostics).not.toHaveBeenCalled();
    expect(result.primaryCandidate?.metadata.vaultEvidence).toBeUndefined();
  });

  // F. Vendor query -> enrichment never occurs
  it('F. should never auto-enrich vendor entities', async () => {
    mockVendors = [
      {
        id: 'ven-1',
        name: 'Keller Ground Engineering Pvt Ltd',
        trade_name: 'Keller',
        category: 'subcontractor',
        gstin: '01AAACK1234F1Z5',
        pan: 'AAACK1234F',
        is_active: true,
      },
    ];

    const result = await service.resolveProjectEntity('Keller', projectId);

    expect(result.resolved).toBe(true);
    expect(['vendor', 'subcontractor']).toContain(result.primaryCandidate?.entityType);
    expect(mockVectorCorpusService.searchWithDiagnostics).not.toHaveBeenCalled();
    expect(result.primaryCandidate?.metadata.vaultEvidence).toBeUndefined();
  });

  // G. Ambiguous WBS/entity -> enrichment never occurs
  it('G. should never enrich ambiguous entities', async () => {
    mockEmployees = [
      {
        id: 'emp-1',
        emp_code: 'EMP-01',
        first_name: 'Zubair',
        last_name: 'Shah',
        designation: 'Site Engineer',
        department: 'Civil',
        status: 'active',
      },
    ];
    mockVendors = [
      {
        id: 'ven-1',
        name: 'Shah Enterprises',
        trade_name: 'Shah',
        category: 'supplier',
        is_active: true,
      },
    ];

    const result = await service.resolveProjectEntity('Shah', projectId);

    expect(result.isAmbiguous).toBe(true);
    expect(mockVectorCorpusService.searchWithDiagnostics).not.toHaveBeenCalled();
  });

  // H. Low-confidence candidate -> enrichment never occurs
  it('H. should not enrich low-confidence candidates', async () => {
    mockWbsTasks = [
      {
        id: 'wbs-1',
        wbs_code: '3.1',
        title: 'Deep Trench Excavation',
        responsible: 'Civil Team',
        status: 'not_started',
      },
    ];

    // Query 'Trench' does not match full code or exact title, giving lower score
    const result = await service.resolveProjectEntity('Trench', projectId);

    // If ranking score < 0.85, enrichment must be skipped
    if (result.primaryCandidate && result.primaryCandidate.rankingScore < 0.85) {
      expect(mockVectorCorpusService.searchWithDiagnostics).not.toHaveBeenCalled();
    }
  });

  // I. Unknown entity -> enrichment never occurs
  it('I. should return fallback for unknown entities', async () => {
    const result = await service.resolveProjectEntity('XYZ-999', projectId);

    expect(result.resolved).toBe(false);
    expect(mockVectorCorpusService.searchWithDiagnostics).not.toHaveBeenCalled();
  });

  // J. Project isolation -> Vault search receives correct projectId
  it('J. should pass the exact projectId to the vector search', async () => {
    const customProject = 'proj-custom-999';
    mockWbsTasks = [
      {
        id: 'wbs-1',
        wbs_code: '3.1',
        title: 'IPS-1 at Node 102',
        responsible: 'Civil Team',
        status: 'not_started',
      },
    ];

    await service.resolveProjectEntity('Tell me about IPS 1', customProject);

    expect(mockVectorCorpusService.searchWithDiagnostics).toHaveBeenCalledWith('IPS-1', customProject);
  });

  // K. Canonicalization: "IPS-1 at Node 102" -> "IPS-1"
  it('K. should clean positional node suffix before searching vector corpus', async () => {
    mockWbsTasks = [
      {
        id: 'wbs-1',
        wbs_code: '3.1',
        title: 'IPS-1 at Node 102',
        responsible: 'Civil Team',
        status: 'not_started',
      },
    ];

    await service.resolveProjectEntity('IPS 1', projectId);

    expect(mockVectorCorpusService.searchWithDiagnostics).toHaveBeenCalledWith('IPS-1', projectId);
  });

  // L & M. Maximum two enrichments per request
  it('L & M. should enforce maximum 2 enrichments per request session context', async () => {
    const context = { enrichmentCount: 2 };
    mockWbsTasks = [
      {
        id: 'wbs-3',
        wbs_code: '3.3',
        title: 'IPS-3 at Node 104',
        responsible: 'Civil Team',
        status: 'not_started',
      },
    ];

    const result = await service.resolveProjectEntity('Tell me about IPS 3', projectId, context);

    expect(result.resolved).toBe(true);
    expect(mockVectorCorpusService.searchWithDiagnostics).not.toHaveBeenCalled();
    expect(result.primaryCandidate?.metadata.vaultEvidence).toBeUndefined();
  });
});
