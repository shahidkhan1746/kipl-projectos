import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import { MaterialRegister } from './material-register.entity'
import { resolveListLimit } from '../common/list-limit'
import { canonicalMaterialName, stockKey } from './material-key'
import { valueOf, type Valuation } from './valuation'

@Injectable()
export class MaterialRegisterService {
  constructor(@InjectRepository(MaterialRegister) private repo: Repository<MaterialRegister>) {}

  private validate(data: Partial<MaterialRegister>) {
    if (!data.projectId) throw new BadRequestException('projectId is required')
    if (!data.material?.trim()) throw new BadRequestException('material is required')
    if (Number(data.receivedQty ?? 0) < 0 || Number(data.consumedQty ?? 0) < 0) {
      throw new BadRequestException('Material quantities cannot be negative')
    }
    if (Number(data.receivedQty ?? 0) === 0 && Number(data.consumedQty ?? 0) === 0) {
      throw new BadRequestException('A received or consumed quantity is required')
    }
    // Consumption without a purpose is a quantity leaving stock with no account
    // of where it went. That is the first question a client's engineer asks of
    // a Clause 55 register, and a nudge in the form does not answer it — the
    // row is written either way and the gap is only found months later, when
    // whoever issued the material has no memory of it. Required at the API, so
    // it holds for the mobile app and the diary sync too.
    if (Number(data.consumedQty ?? 0) > 0 && !data.purpose?.trim()) {
      throw new BadRequestException(
        'A purpose is required when material is consumed: say what work it was used on.',
      )
    }
  }

  /**
   * `manager` lets a caller enlist this write in its own transaction — the GRN
   * bridge does, so a receipt and the stock it creates either both land or
   * neither does. Validation and canonicalisation stay here either way.
   */
  async create(data: Partial<MaterialRegister>, manager?: EntityManager) {
    this.validate(data)
    const repo = manager ? manager.getRepository(MaterialRegister) : this.repo
    // A receipt's value is stored, not derived on read: it must not move when
    // the same material is bought at a different rate next month.
    const qty = Number(data.receivedQty ?? 0) || Number(data.consumedQty ?? 0)
    const rate = data.rate == null ? null : Number(data.rate)
    const amount = data.amount != null && Number(data.amount) !== 0
      ? Number(data.amount)
      : rate != null && Number.isFinite(rate) && qty > 0
        ? +(rate * qty).toFixed(2)
        : (data.amount ?? null)
    // Stored canonical. validate() trimmed the name only to check it was not
    // empty and then saved whatever was passed, so a trailing space opened a
    // second stock line for the same material.
    return repo.save(repo.create({ ...data, material: canonicalMaterialName(data.material), amount }))
  }
  async update(id: string, data: Partial<MaterialRegister>) {
    const existing = await this.repo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('Entry not found')
    this.validate({ ...existing, ...data })
    const patch = data.material === undefined
      ? data
      : { ...data, material: canonicalMaterialName(data.material) }
    await this.repo.update(id, patch)
    return this.repo.findOne({ where: { id } })
  }
  /**
   * Withdraws an entry. See the note on MaterialRegister.deletedAt for why
   * these are not destroyed.
   *
   * Who withdrew it and why are recorded on the row itself rather than left to
   * the audit trail, which knows the request and not the record.
   */
  async remove(id: string, withdrawnBy?: { userId?: string; reason?: string }) {
    const existing = await this.repo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('Entry not found')
    await this.repo.update(id, {
      deletedById: withdrawnBy?.userId ?? null,
      deletedReason: withdrawnBy?.reason?.trim() || null,
    })
    await this.repo.softDelete(id)
    return { id, withdrawn: true }
  }

  /**
   * Fills in rate, purpose and WBS across many rows at once.
   *
   * Rows written before these fields existed have none of them, and the
   * register cannot say what anything cost or what it was for until somebody
   * enters it. One row at a time through the edit modal is a hundred clicks
   * nobody will make, so the data stays missing and the register stays
   * unanswerable.
   *
   * Only these three fields. A bulk editor that can reach quantities or dates
   * is a way to rewrite a signed register in one action, which is exactly what
   * the audit trail and the soft delete exist to prevent.
   */
  async completeEntries(
    patches: Array<{ id: string; rate?: number | null; purpose?: string | null; wbsCode?: string | null }>,
  ) {
    if (!Array.isArray(patches) || !patches.length) {
      throw new BadRequestException('Nothing to update.')
    }
    if (patches.length > 500) {
      throw new BadRequestException('Update at most 500 entries at a time.')
    }

    const updated: string[] = []
    const skipped: Array<{ id: string; reason: string }> = []

    for (const patch of patches) {
      if (!patch?.id) { skipped.push({ id: String(patch?.id), reason: 'No id given.' }); continue }
      const existing = await this.repo.findOne({ where: { id: patch.id } })
      if (!existing) { skipped.push({ id: patch.id, reason: 'Entry not found.' }); continue }

      const next: Partial<MaterialRegister> = {}
      if (patch.rate !== undefined) {
        const rate = patch.rate === null ? null : Number(patch.rate)
        if (rate !== null && (!Number.isFinite(rate) || rate < 0)) {
          skipped.push({ id: patch.id, reason: 'Rate must be a positive number.' })
          continue
        }
        next.rate = rate
        // Recomputed from the rate being entered, since the whole point is that
        // these rows have no value yet. An existing amount is a receipt's
        // historical value and is left alone.
        const qty = Number(existing.receivedQty) || Number(existing.consumedQty) || 0
        if (rate !== null && qty > 0 && !Number(existing.amount)) {
          next.amount = +(rate * qty).toFixed(2)
        }
      }
      if (patch.purpose !== undefined) next.purpose = patch.purpose?.trim() || null
      if (patch.wbsCode !== undefined) next.wbsCode = patch.wbsCode?.trim() || null

      if (!Object.keys(next).length) { skipped.push({ id: patch.id, reason: 'No changes given.' }); continue }

      // Consumption cannot be left without a purpose, whichever door it came
      // through.
      const purposeAfter = next.purpose !== undefined ? next.purpose : existing.purpose
      if (Number(existing.consumedQty) > 0 && !purposeAfter?.trim()) {
        skipped.push({ id: patch.id, reason: 'Consumption needs a purpose.' })
        continue
      }

      await this.repo.update(patch.id, next)
      updated.push(patch.id)
    }

    return { updated: updated.length, skipped }
  }

  /** Withdrawn entries, for reconstructing the register as it stood. */
  async listWithdrawn(projectId?: string) {
    return this.repo.find({
      where: projectId ? { projectId } : {},
      withDeleted: true,
      order: { deletedAt: 'DESC' },
    }).then(rows => rows.filter(r => r.deletedAt != null))
  }

  // Running balance-in-hand per material (received − consumed, cumulative by date).
  async list(projectId?: string, limit?: string | number) {
    const rows = await this.repo.find({
      where: projectId ? { projectId } : {},
      order: { material: 'ASC', date: 'ASC', createdAt: 'ASC' },
    })
    const running: Record<string, number> = {}
    const out = rows.map(r => {
      // Per project AND material. Keyed on the name alone, a call without a
      // projectId ran one project's receipts into another's balance.
      const key = stockKey(r.projectId, r.material)
      const prev = running[key] ?? 0
      const rec = Number(r.receivedQty) || 0
      const con = Number(r.consumedQty) || 0
      running[key] = +(prev + rec - con).toFixed(3)
      return { ...r, balance: running[key] }
    })
    // The running balance above must accumulate over EVERY row for a material,
    // so any requested display slice is applied after accumulation.
    // When viewing a project's material register, the full register history
    // must be returned so grouping, stock cards, and category tabs reflect
    // all materials rather than truncating older materials.
    const sorted = out.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return (a.createdAt || '') < (b.createdAt || '') ? 1 : -1
    })
    if (limit !== undefined && limit !== null && limit !== '' && limit !== 'all') {
      return sorted.slice(0, resolveListLimit(limit))
    }
    return sorted
  }

  /**
   * Stock per material, per project, per unit.
   *
   * The previous version added every row for a material together and labelled
   * the total with whichever unit the last row happened to carry. A delivery
   * of 400 cft followed by one of 400 KG reported "800 KG" — cubic feet added
   * to kilograms, on the register the contract requires both parties to sign.
   *
   * Quantities in different units are never added now. A material recorded in
   * more than one unit reports each unit separately and is flagged, because
   * there is no correct single number for it — it is a data-entry fault to be
   * corrected, not a sum to be computed.
   */
  async summary(projectId?: string) {
    const rows = await this.repo.find({ where: projectId ? { projectId } : {} })

    type UnitTotals = { received: number; consumed: number; balance: number }
    const perMaterial = new Map<string, {
      display: string
      byUnit: Map<string, UnitTotals>
      rowsPerUnit: Map<string, number>
      rowsByUnit: Map<string, MaterialRegister[]>
    }>()

    for (const r of rows) {
      const key = stockKey(r.projectId, r.material)
      let entry = perMaterial.get(key)
      if (!entry) {
        entry = { display: canonicalMaterialName(r.material), byUnit: new Map(), rowsPerUnit: new Map(), rowsByUnit: new Map() }
        perMaterial.set(key, entry)
      }
      const unit = (r.unit ?? '').trim()
      const totals = entry.byUnit.get(unit) ?? { received: 0, consumed: 0, balance: 0 }
      totals.received = +(totals.received + (Number(r.receivedQty) || 0)).toFixed(3)
      totals.consumed = +(totals.consumed + (Number(r.consumedQty) || 0)).toFixed(3)
      totals.balance = +(totals.received - totals.consumed).toFixed(3)
      entry.byUnit.set(unit, totals)
      entry.rowsPerUnit.set(unit, (entry.rowsPerUnit.get(unit) ?? 0) + 1)
      const bucket = entry.rowsByUnit.get(unit) ?? []
      bucket.push(r)
      entry.rowsByUnit.set(unit, bucket)
    }

    const out: Record<string, any> = {}
    for (const entry of perMaterial.values()) {
      const units = [...entry.byUnit.keys()]
      // The unit most rows were entered in. With one unit that is simply the
      // unit; with several it is the one the figures below belong to, and the
      // rest are in byUnit for the caller to show rather than to add.
      const primary = units.reduce((best, u) =>
        (entry.rowsPerUnit.get(u) ?? 0) > (entry.rowsPerUnit.get(best) ?? 0) ? u : best, units[0] ?? '')
      const totals = entry.byUnit.get(primary) ?? { received: 0, consumed: 0, balance: 0 }

      out[entry.display] = {
        ...totals,
        unit: primary,
        units,
        unitConflict: units.length > 1,
        byUnit: Object.fromEntries(entry.byUnit),
        // Valued on the rows of the primary unit only: a rate per cubic foot
        // and a rate per kilogram do not average into anything.
        ...(entry.rowsByUnit.get(primary) ? valueOf(entry.rowsByUnit.get(primary)!) : {}),
      }
    }
    return out
  }
}
