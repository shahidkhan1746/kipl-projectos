import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { procurementApi } from '@/api/procurement.api';
import {
  Scales,
  CheckCircle,
  Clock,
  WarningCircle,
  XCircle,
  Truck,
  FileText,
  CaretDown,
  CaretUp,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { formatDate } from '@/lib/date';
import { Button } from '@/components/ui/Button';
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

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  FULLY_MATCHED: { label: 'Fully Matched (3-Way OK)', color: C.green, bg: C.greenBg },
  PARTIALLY_DELIVERED: { label: 'Partial Delivery', color: C.amber, bg: C.amberBg },
  PENDING_GRN: { label: 'Awaiting Site Receipt', color: C.blue, bg: C.blueBg },
  PENDING_PAYMENT_REQUISITION: { label: 'Delivered (Pending Invoice)', color: C.purple, bg: C.purpleBg },
  EXCESS_BILLING: { label: 'Billed Beyond Order Value', color: C.red, bg: C.redBg },
  // Paying for goods that have not arrived. Named for the fact rather than as
  // an accusation: an advance against an order is legitimate, and the report's
  // job is to put the two figures in front of someone, not to judge which it is.
  BILLED_AHEAD_OF_RECEIPT: { label: 'Billed Ahead of Receipt', color: C.red, bg: C.redBg },
};

const fmtR = (n: any) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtL = (n: any) => '₹' + ((Number(n) || 0) / 100000).toFixed(2) + ' L';

export function ThreeWayMatchTab({ activeProjectId }: { activeProjectId: string }) {
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);

  const { data: reports = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['three-way-match', activeProjectId],
    queryFn: () => procurementApi.getThreeWayMatch(activeProjectId).then((r: any) => r.data),
    enabled: !!activeProjectId,
  });

  // Calculate Aggregates
  const totalOrders = reports.length;
  let fullyMatchedCount = 0;
  let partialDeliveryCount = 0;
  let pendingGrnCount = 0;
  let excessBillingCount = 0;

  // The status comes from the server, which is the only place that can compute
  // it: billing attaches to a purchase order, not to a line within it. This
  // used to be re-derived here from per-line statuses that were themselves
  // guessed by substring-matching descriptions.
  reports.forEach((po: any) => {
    if (po.status === 'EXCESS_BILLING' || po.status === 'BILLED_AHEAD_OF_RECEIPT') excessBillingCount++;
    else if (po.status === 'PARTIALLY_DELIVERED') partialDeliveryCount++;
    else if (po.status === 'PENDING_GRN') pendingGrnCount++;
    else if (po.status === 'FULLY_MATCHED') fullyMatchedCount++;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text1, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scales size={22} color={C.blue} weight="duotone" />
            3-Way Matching Reconciliation Engine
          </h2>
          <p style={{ fontSize: 13, color: C.text3, margin: '2px 0 0 0' }}>
            Live side-by-side reconciliation between Purchase Orders (PO) · Physical Site Receipts (GRN) · Payment Requisitions / Invoices
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          icon={<ArrowsClockwise size={16} className={isFetching ? 'spin' : ''} />}
          onClick={() => refetch()}
        >
          Re-check Variances
        </Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text3 }}>Orders Analyzed</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginTop: 4 }}>{totalOrders}</div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.green }}>100% Reconciled (3-Way)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>{fullyMatchedCount}</div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.amber }}>Partial Site Delivery</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.amber, marginTop: 4 }}>{partialDeliveryCount}</div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>Awaiting Site Receipts</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, marginTop: 4 }}>{pendingGrnCount}</div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: excessBillingCount > 0 ? C.red : C.text3 }}>Excess Billing Alerts</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: excessBillingCount > 0 ? C.red : C.text1, marginTop: 4 }}>
            {excessBillingCount}
          </div>
        </div>
      </div>

      {/* Main Reconciliation Table */}
      <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
        ) : reports.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: C.text3 }}>
            <Scales size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text2 }}>No purchase orders to reconcile</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Issue purchase orders and record site deliveries to view live 3-way matching.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${C.border}`, textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>PO # / Date</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Vendor</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>1. PO Commitment</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>2. Physical Receipts (GRN)</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>3. Billed in Requisitions</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Reconciliation Status</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600, textAlign: 'right' }}>Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((po: any) => {
                  const isExpanded = expandedPoId === po.poId;
                  const totalItems = po.items?.length || 0;
                  const totalOrderedQty = (po.items || []).reduce((s: number, i: any) => s + i.orderedQty, 0);
                  const totalReceivedQty = (po.items || []).reduce((s: number, i: any) => s + i.receivedQty, 0);
                  // Order level, from the server. Billing attaches to a
                  // purchase order and nothing finer, so there is no honest way
                  // to total it from the lines.
                  const totalBilled = Number(po.billedAmount) || 0;
                  const receivedValue = Number(po.receivedValue) || 0;
                  const aheadOfReceipt = Number(po.billedAheadOfReceipt) || 0;

                  const deliveryPct = totalOrderedQty > 0 ? Math.min(100, Math.round((totalReceivedQty / totalOrderedQty) * 100)) : 0;
                  const billingPct = po.grandTotal > 0 ? Math.min(100, Math.round((totalBilled / po.grandTotal) * 100)) : 0;

                  const meta = STATUS_META[po.status] || STATUS_META.FULLY_MATCHED;

                  return (
                    <Fragment key={po.poId}>
                      <tr
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          background: isExpanded ? '#f8fafc' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedPoId(isExpanded ? null : po.poId)}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: C.text1 }}>{po.poNumber}</div>
                          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{formatDate(po.orderDate)}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: C.text1 }}>
                          {po.vendorName}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: C.text1 }}>{fmtR(po.grandTotal)}</div>
                          <div style={{ fontSize: 11, color: C.text3 }}>{totalItems} line items</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: totalReceivedQty >= totalOrderedQty ? C.green : C.amber }}>
                              {totalReceivedQty} / {totalOrderedQty}
                            </span>
                            <span style={{ fontSize: 11, color: C.text3 }}>({deliveryPct}%)</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                            {po.grnCount} Gate Delivery Receipts
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: totalBilled > po.grandTotal ? C.red : C.green }}>
                            {fmtR(totalBilled)}
                          </div>
                          <div style={{ fontSize: 11, color: C.text3 }}>
                            {billingPct}% of Order Value
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: 20,
                              background: meta.bg,
                              color: meta.color,
                            }}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <Button variant="secondary" size="sm" icon={isExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />}>
                            {isExpanded ? 'Hide' : 'Lines'}
                          </Button>
                        </td>
                      </tr>

                      {/* Expanded Item-by-Item Breakdown */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: `2px solid ${C.border}` }}>
                            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                              <div style={{ padding: '10px 14px', background: '#f1f5f9', fontWeight: 700, fontSize: 12, color: C.text2, borderBottom: `1px solid ${C.border}` }}>
                                Line-by-Line 3-Way Reconciliation for {po.poNumber}
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>
                                    <th style={{ padding: '8px 12px', color: C.text3 }}>Material Description</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', color: C.text3 }}>PO Ordered Qty</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', color: C.text3 }}>GRN Received Qty</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', color: C.text3 }}>Qty Variance</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', color: C.text3 }}>PO Total Cost</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', color: C.text3 }}>Received Value</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center', color: C.text3 }}>Delivery</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(po.items || []).map((item: any) => {
                                    // Lines reconcile on QUANTITY. There is no
                                    // per-line billed figure because nothing in
                                    // a payment requisition points at a line.
                                    const delivered = item.receivedQty >= item.orderedQty;
                                    const lineLabel = item.overDelivered
                                      ? 'Over-delivered'
                                      : delivered ? 'Received in full'
                                      : item.receivedQty > 0 ? 'Part received' : 'Awaiting receipt';
                                    const lineTone = item.overDelivered
                                      ? { bg: C.amberBg, color: C.amber }
                                      : delivered ? { bg: C.greenBg, color: C.green }
                                      : { bg: C.blueBg, color: C.blue };
                                    return (
                                      <tr key={item.itemId} style={{ borderBottom: `1px solid ${C.border}` }}>
                                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                                          {item.description} ({item.unit})
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                          {item.orderedQty}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: item.receivedQty >= item.orderedQty ? C.green : C.amber }}>
                                          {item.receivedQty}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: item.qtyVariance === 0 ? C.green : C.amber }}>
                                          {item.qtyVariance === 0 ? '0.000 (Exact)' : `${item.qtyVariance} ${item.unit} Pending`}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                          {fmtR(item.totalOrderedAmount)}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: item.overDelivered ? C.amber : C.text2 }}>
                                          {fmtR(item.receivedValue)}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                          <span
                                            style={{
                                              display: 'inline-block',
                                              fontSize: 10,
                                              fontWeight: 700,
                                              padding: '2px 8px',
                                              borderRadius: 12,
                                              background: lineTone.bg,
                                              color: lineTone.color,
                                            }}
                                          >
                                            {lineLabel}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
