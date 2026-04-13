import api from './client'

// Helper: download PDF blob
async function downloadPdf(endpoint: string, data: any, filename: string) {
  const res = await api.post(endpoint, data, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

export const pdfApi = {
  salarySlip: (data: {
    employee: any
    record: any
    month: number
    year: number
    daysPresent: number
    totalDays: number
  }) => downloadPdf('/api/v1/pdf/salary-slip', data,
    'SalarySlip_' + data.employee?.empCode + '_' + data.month + '_' + data.year + '.pdf'),

  raBill: (data: { bill: any; project?: any }) =>
    downloadPdf('/api/v1/pdf/ra-bill', data, 'RaBill_' + (data.bill?.billNo ?? 'RA') + '.pdf'),

  inspection: (data: { inspection: any; checklist?: any }) =>
    downloadPdf('/api/v1/pdf/inspection', data, 'Inspection_' + data.inspection?.date + '.pdf'),
}
