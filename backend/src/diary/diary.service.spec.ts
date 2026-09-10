jest.mock('../storage/storage.service', () => ({
  StorageService: class StorageService {},
}))

import { BadRequestException } from '@nestjs/common'
import { DiaryStatus } from './diary.entity'
import { DiaryService } from './diary.service'

describe('DiaryService update integrity', () => {
  function createService(entry: Record<string, any>) {
    const repo = {
      findOne: jest.fn().mockResolvedValue(entry),
      update: jest.fn().mockResolvedValue(undefined),
    }
    return { service: new DiaryService(repo as any), repo }
  }

  it('preserves omitted labour values when recalculating a partial update', async () => {
    const entry = {
      id: 'diary-1',
      status: DiaryStatus.DRAFT,
      labourSkilled: 10,
      labourUnskilled: 20,
      labourSupervisory: 3,
    }
    const { service, repo } = createService(entry)

    await service.update('diary-1', { labourSkilled: 12 })

    expect(repo.update).toHaveBeenCalledWith('diary-1', {
      labourSkilled: 12,
      labourTotal: 35,
    })
  })

  it('does not overwrite labour total when no labour field is supplied', async () => {
    const entry = {
      id: 'diary-1',
      status: DiaryStatus.SUBMITTED,
      labourSkilled: 10,
      labourUnskilled: 20,
      labourSupervisory: 3,
    }
    const { service, repo } = createService(entry)

    await service.update('diary-1', { issuesFaced: 'Access delayed' })

    expect(repo.update).toHaveBeenCalledWith('diary-1', { issuesFaced: 'Access delayed' })
  })

  it('blocks edits after approval', async () => {
    const { service, repo } = createService({ id: 'diary-1', status: DiaryStatus.APPROVED })

    await expect(service.update('diary-1', { issuesFaced: 'Changed' }))
      .rejects.toBeInstanceOf(BadRequestException)
    expect(repo.update).not.toHaveBeenCalled()
  })
})
