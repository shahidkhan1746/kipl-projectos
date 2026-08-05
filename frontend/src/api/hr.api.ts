import api from './client'

export const hrApi = {
  dashboard:        (projectId?: string) =>
    api.get('/api/v1/hr/dashboard', { params: { projectId } }),

  // Employees
    nextEmpCode:       () => api.get('/api/v1/hr/employees/next-code'),
  employees:        (p?: any) => api.get('/api/v1/hr/employees', { params: p }),
  employee:         (id: string) => api.get('/api/v1/hr/employees/' + id),
  idCardHtml:       (id: string) => api.get('/api/v1/hr/id-card/' + id, { responseType: 'blob' }),
  idCardServerPdf:  (id: string) => api.get('/api/v1/hr/id-card/' + id + '/pdf', { responseType: 'blob' }),
  createEmployee:   (d: any) => api.post('/api/v1/hr/employees', d),
  updateEmployee:   (id: string, d: any) => api.patch('/api/v1/hr/employees/' + id, d),
  deleteEmployee:   (id: string) => api.delete('/api/v1/hr/employees/' + id),

  // Attendance
  attendance:       (p?: any) => api.get('/api/v1/hr/attendance', { params: p }),
  todayAttendance:  (projectId?: string) =>
    api.get('/api/v1/hr/attendance/today', { params: { projectId } }),
  markAttendance:   (d: any) => api.post('/api/v1/hr/attendance', d),
  bulkAttendance:   (records: any[]) => api.post('/api/v1/hr/attendance/bulk', { records }),
  monthlyReport:    (empId: string, year: number, month: number) =>
    api.get('/api/v1/hr/attendance/report/' + empId + '/' + year + '/' + month),

  // Salary
  salaryList:       (p?: any) => api.get('/api/v1/hr/salary', { params: p }),
  generateSalary:   (d: any) => api.post('/api/v1/hr/salary/generate', d),
  approveSalary:    (id: string) => api.patch('/api/v1/hr/salary/' + id + '/approve', {}),
  markPaid:         (id: string, paymentMode: string) =>
    api.patch('/api/v1/hr/salary/' + id + '/paid', { paymentMode }),

  // Timesheets
    timesheets:       (p?: any) => api.get('/api/v1/hr/timesheets', { params: p }),
    submitTimesheet:  (d: any) => api.post('/api/v1/hr/timesheets', d),
    manpower:         (projectId: string, date: string) => api.get('/api/v1/hr/manpower', { params: { projectId, date } }),
    manpowerRange:    (projectId: string, from: string, to: string) => api.get('/api/v1/hr/manpower-range', { params: { projectId, from, to } }),
    approveTimesheet: (id: string) => api.patch('/api/v1/hr/timesheets/' + id + '/approve', {}),
    rejectTimesheet:  (id: string, reason: string) => api.patch('/api/v1/hr/timesheets/' + id + '/reject', { reason }),
  
    // Leave
  leaves:           (p?: any) => api.get('/api/v1/hr/leave', { params: p }),
  applyLeave:       (d: any) => api.post('/api/v1/hr/leave', d),
  approveLeave:     (id: string) => api.patch('/api/v1/hr/leave/' + id + '/approve', {}),
  rejectLeave:      (id: string) => api.patch('/api/v1/hr/leave/' + id + '/reject', {}),
  getEmployee: (id: string) => api.get(`/api/v1/hr/employees/${id}`),
}