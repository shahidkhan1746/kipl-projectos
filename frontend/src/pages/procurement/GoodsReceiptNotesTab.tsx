import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { procurementApi } from '@/api/procurement.api';
import {
  Truck,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  WarningCircle,
  FileText,
  Warehouse,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import { formatDate } from '@/lib/date';
import { toast } from '@/lib/notify';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

const C = {
  card: '#fff',
  border: '#e2e8f0',
  text1: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  green: '#059669',
  greenBg: '#f0fdf4',
  amber: '#d97706',
  amberBg: '#fffbeb',
  red: '#dc2626',
  redBg: '#fef2f2',
  navy: '#1a2540',
  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
};

interface GrnItemInput {
  purchaseOrderItemId?: string;
  itemDescription: string;
  quantityOrdered: number;
  receivedQty: number;
  unit: string;
  remarks: string;
}

export function GoodsReceiptNotesTab({ activeProjectId }: { activeProjectId: string }) {
  const qc = useQueryClient();

  const [showNewGrnModal, setShowNewGrnModal] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<any | null>(null);

  // New GRN form state
  const [selectedPoId, setSelectedPoId] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [challanNumber, setChallanNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [remarks, setRemarks] = useState('Materials received in sound condition at site stores.');
  const [writeToMaterialRegister, setWriteToMaterialRegister] = useState(true);
  const [grnItems, setGrnItems] = useState<GrnItemInput[]>([]);

  // Queries
  const { data: grns = [], isLoading: loadingGrns } = useQuery({
    queryKey: ['procurement-grns', activeProjectId],
    queryFn: () => procurementApi.getAllGrns(activeProjectId).then((r: any) => r.data),
    enabled: !!activeProjectId,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['procurement-orders', activeProjectId],
    queryFn: () => procurementApi.getPurchaseOrders(activeProjectId).then((r: any) => r.data),
    enabled: !!activeProjectId,
  });

  // Filter approved/issued orders for receipt
  const receivableOrders = orders.filter(
    (o: any) => o.status === 'issued' || o.status === 'partially_delivered',
  );

  function handleSelectPo(poId: string) {
    setSelectedPoId(poId);
    const po = orders.find((o: any) => o.id === poId);
    if (!po) {
      setGrnItems([]);
      return;
    }

    const items: GrnItemInput[] = (po.items || []).map((it: any) => ({
      purchaseOrderItemId: it.id,
      itemDescription: it.itemDescription,
      quantityOrdered: Number(it.quantity) || 0,
      receivedQty: Number(it.quantity) || 0,
      unit: it.unit || 'Nos',
      remarks: 'Inspected and verified against delivery challan',
    }));
    setGrnItems(items);
  }

  // Create GRN Mutation
  const createGrnM = useMutation({
    mutationFn: () => {
      if (!selectedPoId) throw new Error('Please select a Purchase Order');
      if (!challanNumber.trim()) throw new Error('Delivery Challan Number is required');

      const itemsPayload = grnItems.map((i) => ({
        purchaseOrderItemId: i.purchaseOrderItemId,
        itemDescription: i.itemDescription,
        receivedQty: Number(i.receivedQty) || 0,
        unit: i.unit,
        remarks: i.remarks,
      }));

      return procurementApi.createGoodsReceiptNote(selectedPoId, {
        receivedDate,
        challanNumber: challanNumber.trim(),
        invoiceNumber: invoiceNumber.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        writeToMaterialRegister,
        items: itemsPayload,
      });
    },
    onSuccess: () => {
      toast.success('Goods Receipt Note (GRN) created & synced to stock successfully!');
      qc.invalidateQueries({ queryKey: ['procurement-grns'] });
      qc.invalidateQueries({ queryKey: ['procurement-orders'] });
      qc.invalidateQueries({ queryKey: ['material-register'] });
      setShowNewGrnModal(false);
      resetForm();
    },
    onError: (err: any) => toast.error('Error creating GRN: ' + (err?.response?.data?.message ?? err?.message)),
  });

  function resetForm() {
    setSelectedPoId('');
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setChallanNumber('');
    setInvoiceNumber('');
    setVehicleNumber('');
    setRemarks('Materials received in sound condition at site stores.');
    setWriteToMaterialRegister(true);
    setGrnItems([]);
  }

  const selectedPo = orders.find((o: any) => o.id === selectedPoId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text1, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={22} color={C.blue} weight="duotone" />
            Goods Receipt Notes (GRN) &amp; Site Deliveries
          </h2>
          <p style={{ fontSize: 13, color: C.text3, margin: '2px 0 0 0' }}>
            Physical Gate Deliveries · Delivery Challan &amp; Vehicle Tracking · Direct Bridge to Clause 55 Material Register
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus size={16} />}
          onClick={() => {
            resetForm();
            if (receivableOrders.length > 0) {
              handleSelectPo(receivableOrders[0].id);
            }
            setShowNewGrnModal(true);
          }}
        >
          Record Site Delivery (GRN)
        </Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text3 }}>Total Deliveries Received</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginTop: 4 }}>{grns.length}</div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>Awaiting Site Delivery</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, marginTop: 4 }}>{receivableOrders.length} POs</div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.green }}>Material Register Synced</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>
            {grns.filter((g: any) => g.status === 'received').length} Receipts
          </div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Active Fleet Inbound</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.purple, marginTop: 4 }}>
            {new Set(grns.map((g: any) => g.vehicleNumber).filter(Boolean)).size} Vehicles
          </div>
        </div>
      </div>

      {/* GRN Table */}
      <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {loadingGrns ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
        ) : grns.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: C.text3 }}>
            <Truck size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text2 }}>No Goods Receipt Notes (GRN) found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Record site gate deliveries against open purchase orders to automatically reconcile stock.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${C.border}`, textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>GRN # / Date</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Purchase Order</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Vendor / Supplier</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Challan # / Vehicle</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Items Received</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Received By</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Stock Register Status</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {grns.map((grn: any) => (
                  <tr key={grn.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: C.text1 }}>{grn.grnNumber}</div>
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{formatDate(grn.receivedDate)}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 600, color: C.blue }}>
                        {grn.purchaseOrder?.poNumber || 'Direct GRN'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: C.text1 }}>
                      {grn.purchaseOrder?.vendorName || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: C.text1 }}>Challan: {grn.challanNumber || '-'}</div>
                      <div style={{ fontSize: 11, color: C.text3 }}>Vehicle: {grn.vehicleNumber || 'Site Hand Delivery'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.text2 }}>
                      {grn.items?.length || 0} items
                    </td>
                    <td style={{ padding: '12px 16px', color: C.text2 }}>
                      {grn.receivedByName || 'Storekeeper / Site Eng.'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: C.green,
                          background: C.greenBg,
                          padding: '2px 8px',
                          borderRadius: 12,
                        }}
                      >
                        <CheckCircle size={13} weight="fill" /> Synced to Clause 55
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye size={13} />}
                        onClick={() => setSelectedGrn(grn)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: RECORD SITE DELIVERY (NEW GRN)
      ───────────────────────────────────────────────────────────── */}
      {showNewGrnModal && (
        <Modal
          open={showNewGrnModal}
          onClose={() => setShowNewGrnModal(false)}
          title="Record Site Goods Delivery (Goods Receipt Note)"
          width={900}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Row 1: Select PO */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>
                Select Purchase Order (Issued / In-Delivery) *
              </label>
              {receivableOrders.length === 0 ? (
                <div style={{ padding: 12, borderRadius: 8, background: C.amberBg, color: C.amber, fontSize: 13 }}>
                  No open or issued purchase orders available for receipt. Issue a PO first.
                </div>
              ) : (
                <select
                  value={selectedPoId}
                  onChange={(e) => handleSelectPo(e.target.value)}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #d1d5db',
                    fontSize: 13,
                    background: '#fff',
                    color: '#111827',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Choose Purchase Order --</option>
                  {receivableOrders.map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.poNumber} — {o.vendorName} ({o.items?.length || 0} items, Grand Total: ₹{Number(o.grandTotal).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedPo && (
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: C.text2, border: `1px solid ${C.border}` }}>
                <strong>Vendor:</strong> {selectedPo.vendorName} | <strong>Ordered:</strong> {formatDate(selectedPo.orderDate)} |{' '}
                <strong>Terms:</strong> {selectedPo.deliveryTerms || 'FOR Site Srinagar'}
              </div>
            )}

            {/* Row 2: Challan, Vehicle, Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 12 }}>
              <Input
                label="Delivery Challan Number *"
                placeholder="e.g. DC-2026-987"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
              />

              <Input
                label="Transporter / Vehicle Number"
                placeholder="e.g. JK-01-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />

              <Input
                type="date"
                label="Received Date *"
                value={receivedDate}
                onChange={(e: any) => setReceivedDate(e.target.value)}
              />
            </div>

            {/* Row 3: Invoice Number & Remarks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <Input
                label="Vendor Invoice # (If accompanied)"
                placeholder="e.g. INV-1098"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />

              <Input
                label="Site Inspection Remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {/* Checkbox: Clause 55 Material Register Sync */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text1, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={writeToMaterialRegister}
                onChange={(e) => setWriteToMaterialRegister(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>
                <strong>Automatically update Clause 55 Material Register</strong> (Records incoming cement, steel, pipes, or valves directly into stock register with Challan &amp; Vehicle metadata)
              </span>
            </label>

            {/* Line Items Received Checklist */}
            {grnItems.length > 0 && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
                  Ordered Items &amp; Physical Received Quantities
                </label>
                <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>Item Description</th>
                        <th style={{ padding: '8px 12px', width: 90 }}>Ordered Qty</th>
                        <th style={{ padding: '8px 12px', width: 110 }}>Received Qty *</th>
                        <th style={{ padding: '8px 12px', width: 70 }}>Unit</th>
                        <th style={{ padding: '8px 12px' }}>Condition / Inspection Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grnItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.itemDescription}</td>
                          <td style={{ padding: '8px 12px', color: C.text2 }}>{item.quantityOrdered}</td>
                          <td style={{ padding: '6px 12px' }}>
                            <input
                              type="number"
                              value={item.receivedQty}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setGrnItems((prev) => {
                                  const copy = [...prev];
                                  copy[idx].receivedQty = val;
                                  return copy;
                                });
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: 4,
                                border: '1px solid #d1d5db',
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', color: C.text2 }}>{item.unit}</td>
                          <td style={{ padding: '6px 12px' }}>
                            <input
                              value={item.remarks}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGrnItems((prev) => {
                                  const copy = [...prev];
                                  copy[idx].remarks = val;
                                  return copy;
                                });
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: 4,
                                border: '1px solid #d1d5db',
                                fontSize: 12,
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <Button variant="secondary" onClick={() => setShowNewGrnModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => createGrnM.mutate()}
                disabled={createGrnM.isPending || !selectedPoId || !challanNumber.trim()}
              >
                Accept Delivery &amp; Issue GRN
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VIEW GRN DETAILS
      ───────────────────────────────────────────────────────────── */}
      {selectedGrn && (
        <Modal
          open={!!selectedGrn}
          onClose={() => setSelectedGrn(null)}
          title={`Goods Receipt Note - ${selectedGrn.grnNumber}`}
          width={780}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Meta Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, background: '#f8fafc', padding: 14, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 11, color: C.text3 }}>GRN Number</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{selectedGrn.grnNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.text3 }}>Date Received</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>{formatDate(selectedGrn.receivedDate)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.text3 }}>Linked PO</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>{selectedGrn.purchaseOrder?.poNumber || 'Direct'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.text3 }}>Delivery Challan #</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{selectedGrn.challanNumber || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.text3 }}>Transporter Vehicle #</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{selectedGrn.vehicleNumber || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.text3 }}>Received By</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{selectedGrn.receivedByName || 'Storekeeper'}</div>
              </div>
            </div>

            {selectedGrn.remarks && (
              <div style={{ fontSize: 13, color: C.text2, background: '#fff', padding: '10px 14px', borderRadius: 6, border: `1px solid ${C.border}` }}>
                <strong>Remarks:</strong> {selectedGrn.remarks}
              </div>
            )}

            {/* Received Items */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 8 }}>
                Physically Received Items
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: `1px solid ${C.border}` }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Item Description</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: 110 }}>Received Qty</th>
                    <th style={{ padding: '8px 12px', width: 80 }}>Unit</th>
                    <th style={{ padding: '8px 12px' }}>Inspection Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedGrn.items || []).map((it: any, idx: number) => (
                    <tr key={it.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.itemDescription}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: C.green }}>{it.receivedQty}</td>
                      <td style={{ padding: '8px 12px', color: C.text2 }}>{it.unit || 'Nos'}</td>
                      <td style={{ padding: '8px 12px', color: C.text2 }}>{it.remarks || 'Accepted in good condition'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="primary" onClick={() => setSelectedGrn(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
