import { RagSanitizer } from './rag-sanitizer.util'

describe('RagSanitizer', () => {
  describe('serializeEmployee', () => {
    it('should serialize operational employee fields and exclude sensitive financial, PII, phone, and email fields', () => {
      const sensitiveEmployee = {
        first_name: 'John',
        last_name: 'Doe',
        emp_code: 'KIPL-001',
        designation: 'Project Engineer',
        department: 'Civil',
        employment_type: 'Full Time',
        status: 'Active',
        phone: '+919999999999',
        email: 'john.doe@kipl.com',
        date_of_joining: '2024-01-15',
        // Sensitive data that must NEVER appear:
        base_salary: 150000,
        salary: '1.5 Lakhs/month',
        bank_account: { account_no: '123456789012', bank_name: 'HDFC Bank' },
        ifsc: 'HDFC0001234',
        pan: 'ABCDE1234F',
        aadhaar: '1234-5678-9012',
      }

      const result = RagSanitizer.serializeEmployee(sensitiveEmployee)

      // Must contain operational fields:
      expect(result).toContain('Employee Name: John Doe')
      expect(result).toContain('Employee Code: KIPL-001')
      expect(result).toContain('Designation / Role: Project Engineer')
      expect(result).toContain('Department: Civil')
      expect(result).toContain('Employment Type: Full Time')
      expect(result).toContain('Status: Active')
      expect(result).toContain('Date of Joining: 2024-01-15')

      // Must NOT contain direct phone or email (tightened P0-3 privacy boundary):
      expect(result).not.toContain('+919999999999')
      expect(result).not.toContain('john.doe@kipl.com')
      expect(result).not.toContain('Phone')
      expect(result).not.toContain('Email')

      // Must NOT contain sensitive financial/identity fields:
      expect(result).not.toContain('150000')
      expect(result).not.toContain('1.5 Lakhs')
      expect(result).not.toContain('123456789012')
      expect(result).not.toContain('HDFC0001234')
      expect(result).not.toContain('ABCDE1234F')
      expect(result).not.toContain('1234-5678-9012')
      expect(result).not.toContain('Salary')
      expect(result).not.toContain('Bank')
      expect(result).not.toContain('IFSC')
      expect(result).not.toContain('PAN')
    })
  })

  describe('serializeVendor', () => {
    it('should serialize operational vendor fields and exclude sensitive financial/bank details', () => {
      const sensitiveVendor = {
        name: 'Keller Ground Engineering Pvt Ltd',
        trade_name: 'Keller',
        category: 'subcontractor',
        address: 'Srinagar, J&K',
        phone: '+919876543210',
        email: 'info@keller.com',
        is_active: true,
        // Sensitive data:
        bank_account: {
          account_no: '987654321098',
          bank_name: 'State Bank of India',
          ifsc: 'SBIN0005678',
        },
        ifsc: 'SBIN0005678',
        pan: 'KLLR1234Z',
        account_number: '987654321098',
      }

      const result = RagSanitizer.serializeVendor(sensitiveVendor)

      // Must contain operational fields:
      expect(result).toContain('Vendor / Contractor Name: Keller Ground Engineering Pvt Ltd')
      expect(result).toContain('Trade / Business Name: Keller')
      expect(result).toContain('Category / Role: SUBCONTRACTOR (subcontractor)')
      expect(result).toContain('Active Status: Active')
      expect(result).toContain('Contact Phone: +919876543210')
      expect(result).toContain('Contact Email: info@keller.com')

      // Must NOT contain sensitive fields:
      expect(result).not.toContain('987654321098')
      expect(result).not.toContain('SBIN0005678')
      expect(result).not.toContain('KLLR1234Z')
      expect(result).not.toContain('Bank Details')
      expect(result).not.toContain('State Bank of India')
    })
  })

  describe('serializeUser', () => {
    it('should serialize public user info and exclude passwords, reset tokens, and credentials', () => {
      const sensitiveUser = {
        name: 'Admin User',
        email: 'admin@kipl.com',
        role: 'super_admin',
        designation: 'Project Director',
        // Sensitive credentials:
        password: 'plaintext_password_123',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
        reset_token: 'tok_sec_9988776655',
        api_key: 'sk-proj-super-secret-key',
      }

      const result = RagSanitizer.serializeUser(sensitiveUser)

      expect(result).toContain('User Name: Admin User')
      expect(result).toContain('Email: admin@kipl.com')
      expect(result).toContain('System Role: super_admin')
      expect(result).toContain('Designation: Project Director')

      expect(result).not.toContain('plaintext_password_123')
      expect(result).not.toContain('$2b$10$')
      expect(result).not.toContain('tok_sec_9988776655')
      expect(result).not.toContain('sk-proj-super-secret-key')
    })
  })

  describe('sanitizeText', () => {
    it('should scrub accidental API keys and credentials from freeform text', () => {
      const rawText = 'System config: api_key: AIzaSyD1234567890 and secret: my_secret_token_abc'
      const sanitized = RagSanitizer.sanitizeText(rawText)

      expect(sanitized).not.toContain('AIzaSyD1234567890')
      expect(sanitized).not.toContain('my_secret_token_abc')
      expect(sanitized).toContain('api_key: [REDACTED]')
      expect(sanitized).toContain('secret: [REDACTED]')
    })
  })
})
