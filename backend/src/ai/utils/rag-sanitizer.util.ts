/**
 * Centralized Sanitizer for General RAG (Knowledge Vault / Vector Indexing).
 *
 * Security Invariants:
 * - Sensitive financial records (bank accounts, IFSC, base salary, CTC, payroll amounts) MUST NEVER be indexed.
 * - Sensitive government/identity numbers (PAN, Aadhaar, Passport) MUST NEVER be indexed.
 * - Authentication credentials (passwords, password hashes, reset tokens, API keys, secrets) MUST NEVER be indexed.
 * - Non-sensitive operational knowledge (names, designations, departments, project assignments, categories) is preserved.
 */

export interface EmployeeRagInput {
  first_name?: string
  last_name?: string
  name?: string
  emp_code?: string
  designation?: string
  department?: string
  employment_type?: string
  status?: string
  phone?: string
  email?: string
  date_of_joining?: string | Date
  project_id?: string
  // Sensitive fields that MUST be stripped:
  base_salary?: any
  salary?: any
  bank_account?: any
  ifsc?: any
  pan?: any
  aadhaar?: any
}

export interface VendorRagInput {
  name: string
  trade_name?: string
  category?: string
  address?: string
  phone?: string
  email?: string
  is_active?: boolean
  project_id?: string
  // Sensitive fields that MUST be stripped:
  bank_account?: any
  ifsc?: any
  pan?: any
  account_number?: any
}

export interface UserRagInput {
  name: string
  email?: string
  role?: string
  designation?: string
  // Sensitive fields that MUST be stripped:
  password?: any
  password_hash?: any
  reset_token?: any
  api_key?: any
}

export class RagSanitizer {
  /**
   * Sanitizes employee record for general semantic RAG.
   * Retains operational project facts (name, code, role, dept, employment type, status, DOJ).
   * Strips salary, bank details, PAN/Aadhaar, phone, email, and financial records.
   */
  static serializeEmployee(e: EmployeeRagInput): string {
    const empName = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.name || 'Unnamed Employee'
    const doj = e.date_of_joining ? String(e.date_of_joining).split('T')[0] : 'N/A'
    
    return [
      `Employee Name: ${empName}`,
      `Employee Code: ${e.emp_code || 'N/A'}`,
      `Designation / Role: ${e.designation || 'Staff'}`,
      `Department: ${e.department || 'Operations'}`,
      `Employment Type: ${e.employment_type || 'Full Time'}`,
      `Status: ${e.status || 'Active'}`,
      `Date of Joining: ${doj}`,
    ].join('\n')
  }

  /**
   * Sanitizes vendor/subcontractor record for general semantic RAG.
   * Strips bank accounts, IFSC, PAN, and payment account details.
   */
  static serializeVendor(v: VendorRagInput): string {
    const catLabel = v.category ? v.category.replace('_', ' ').toUpperCase() : 'VENDOR'
    
    return [
      `Vendor / Contractor Name: ${v.name}`,
      `Trade / Business Name: ${v.trade_name || 'N/A'}`,
      `Category / Role: ${catLabel} (${v.category || 'vendor'})`,
      `Address / Location: ${v.address || 'N/A'}`,
      `Contact Phone: ${v.phone || 'N/A'}`,
      `Contact Email: ${v.email || 'N/A'}`,
      `Active Status: ${v.is_active ? 'Active' : 'Inactive'}`,
      `Summary: ${v.name} is registered as a ${catLabel} on the Srinagar STP project.`,
    ].join('\n')
  }

  /**
   * Sanitizes system user record for general semantic RAG.
   * Strips password hashes, reset tokens, and credentials.
   */
  static serializeUser(u: UserRagInput): string {
    return [
      `User Name: ${u.name}`,
      `Email: ${u.email || 'N/A'}`,
      `System Role: ${u.role || 'User'}`,
      `Designation: ${u.designation || u.role || 'Staff'}`,
    ].join('\n')
  }

  /**
   * General text safety scrubber that removes any accidental credentials or secrets.
   */
  static sanitizeText(text: string): string {
    if (!text) return ''
    return text
      .replace(/(\b(?:api[_-]?key|secret|password|bearer|auth[_-]?token)\b\s*[:=]\s*)[^\s,;\n]+/gi, '$1[REDACTED]')
      .replace(/(\b(?:bank[_-]?account|account[_-]?no|ifsc|pan|aadhaar)\b\s*[:=]\s*)[^\s,;\n]+/gi, '$1[REDACTED]')
      .trim()
  }
}
