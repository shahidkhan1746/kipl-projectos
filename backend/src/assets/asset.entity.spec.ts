import { DataSource } from 'typeorm'
import { OfficeAsset, OfficeAssetEvent } from './asset.entity'

describe('Asset PostgreSQL metadata', () => {
  it('validates column types without a database connection', async () => {
    const source = new DataSource({ type: 'postgres', entities: [OfficeAsset, OfficeAssetEvent] })
    await (source as unknown as { buildMetadatas(): Promise<void> }).buildMetadatas()
    expect(source.getMetadata(OfficeAsset).tableName).toBe('office_assets')
    expect(source.getMetadata(OfficeAsset).findColumnWithPropertyName('brand')?.type).toBe('varchar')
    expect(source.getMetadata(OfficeAssetEvent).findColumnWithPropertyName('after')?.type).toBe('jsonb')
  })
})
