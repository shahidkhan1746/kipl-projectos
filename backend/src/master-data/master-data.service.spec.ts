import { MasterDataService } from './master-data.service';
import { MasterDropdownOption } from './master-data.entity';

describe('MasterDataService', () => {
  let svc: MasterDataService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: '1', dropdownType: 'unit', label: 'Cu.m', value: 'Cu.m', isActive: true },
          { id: '2', dropdownType: 'material', label: '63mm Downgrade', value: '63mm Downgrade', category: 'aggregate_sand', unit: 'Cu.m', isActive: true },
        ]),
      }),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'saved-id', ...entity })),
      remove: jest.fn((entity) => Promise.resolve(entity)),
    };
    svc = new MasterDataService(mockRepo);
  });

  it('findAll returns options', async () => {
    const res = await svc.findAll({ dropdownType: 'unit' });
    expect(res).toHaveLength(2);
    expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('getAllGrouped groups options by dropdownType', async () => {
    const grouped = await svc.getAllGrouped(true);
    expect(grouped.unit).toBeDefined();
    expect(grouped.material).toBeDefined();
    expect(grouped.unit).toHaveLength(1);
    expect(grouped.material).toHaveLength(1);
  });

  it('create saves new option', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    const res = await svc.create({
      dropdownType: 'material',
      label: 'New Material',
      value: 'New Material',
      category: 'aggregate_sand',
      unit: 'Cu.m',
    });
    expect(res.id).toBe('saved-id');
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('create throws conflict if already exists', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'existing' });
    await expect(
      svc.create({
        dropdownType: 'material',
        label: 'Existing Material',
        value: 'Existing Material',
      }),
    ).rejects.toThrow();
  });

  it('toggleActive switches isActive boolean', async () => {
    mockRepo.findOne.mockResolvedValue({ id: '1', isActive: true });
    const res = await svc.toggleActive('1');
    expect(res.isActive).toBe(false);
  });
});
