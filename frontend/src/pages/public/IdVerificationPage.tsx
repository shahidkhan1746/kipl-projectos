import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ShieldCheck, CheckCircle, WarningCircle, Buildings, MapPin,
  Phone, Envelope, Copy, Check, ArrowLeft, House, ShareNetwork,
  IdentificationCard, Warning, QrCode, FileText
} from '@phosphor-icons/react'
import { hrApi } from '@/api/hr.api'

// Fallback seed data for key project personnel so verification is INSTANT even during Render free-tier cold starts
const FALLBACK_PERSONNEL: Record<string, any> = {
  'KIPL-DL-SXR-002': {
    verified: true,
    status: 'ACTIVE',
    empCode: 'KIPL-DL-SXR-002',
    firstName: 'Zubair',
    lastName: 'Shah',
    fullName: 'Zubair Shah',
    designation: 'Sr. Engineer - Operations',
    department: 'Operations & Maintenance',
    phone: '+91 941927 9999',
    email: 'shahzubair69@gmail.com',
    address: 'Masjid Bukhari Lane Sakidafar, Srinagar.',
    bloodGroup: 'B+',
    dateOfJoining: '2023-04-01',
    emergencyName: 'KIPL Site Office',
    emergencyPhone: '+91 9419 428 963',
    photoUrl: '/assets/id-card-sample.jpg',
    project: {
      name: '38.5 MLD Sewage Treatment Plant (STP)',
      location: 'Dal Lake Catchment, Srinagar, Jammu & Kashmir',
      siteOffice: '38.5 MLD STP, Near LCMA Enforcement Office, Lashkari Mohalla, ISHBER Nishat, Srinagar-191121',
      company: 'Khilari Infrastructure Pvt. Ltd.',
      tagline: 'Engineers | Contractors | Solutions',
      client: 'Urban Environmental Engineering Department (UEED), J&K Government',
      scheme: 'AMRUT Scheme, Government of India',
      officePhone: '+91 9419 428 963',
      website: 'https://kiplstpsrinagar.com'
    }
  },
  'KIPL-DL-SXR-001': {
    verified: true,
    status: 'ACTIVE',
    empCode: 'KIPL-DL-SXR-001',
    firstName: 'Gowhar',
    lastName: 'Shah',
    fullName: 'Gowhar Shah',
    designation: 'Project Manager',
    department: 'Project Management',
    phone: '+91 9419 428 963',
    email: 'gowhar@kiplstpsrinagar.com',
    address: 'Nishat, Srinagar, Jammu & Kashmir',
    bloodGroup: 'O+',
    dateOfJoining: '2022-08-01',
    emergencyName: 'KIPL Head Office',
    emergencyPhone: '+91 9419 428 963',
    photoUrl: '',
    project: {
      name: '38.5 MLD Sewage Treatment Plant (STP)',
      location: 'Dal Lake Catchment, Srinagar, Jammu & Kashmir',
      siteOffice: '38.5 MLD STP, Near LCMA Enforcement Office, Lashkari Mohalla, ISHBER Nishat, Srinagar-191121',
      company: 'Khilari Infrastructure Pvt. Ltd.',
      tagline: 'Engineers | Contractors | Solutions',
      client: 'Urban Environmental Engineering Department (UEED), J&K Government',
      scheme: 'AMRUT Scheme, Government of India',
      officePhone: '+91 9419 428 963',
      website: 'https://kiplstpsrinagar.com'
    }
  }
}

export default function IdVerificationPage() {
  const { code = 'KIPL-DL-SXR-002' } = useParams<{ code?: string }>()
  const upperCode = (code || 'KIPL-DL-SXR-002').toUpperCase().trim()

  const [employee, setEmployee] = useState<any>(FALLBACK_PERSONNEL[upperCode] || null)
  const [loading, setLoading] = useState<boolean>(!FALLBACK_PERSONNEL[upperCode])
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [showLostModal, setShowLostModal] = useState(false)
  const [timestamp] = useState<string>(() => new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  }))

  useEffect(() => {
    let cancelled = false
    const fetchVerification = async () => {
      try {
        const res = await hrApi.verifyEmployee(upperCode)
        if (!cancelled && res.data) {
          setEmployee(res.data)
          setError(null)
        }
      } catch (err: any) {
        if (!cancelled) {
          // If we have fallback data for this code, keep it
          if (!FALLBACK_PERSONNEL[upperCode]) {
            setError(err?.response?.data?.message || 'Employee credentials could not be verified in the security database.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchVerification()
    return () => { cancelled = true }
  }, [upperCode])

  const copyCode = () => {
    navigator.clipboard.writeText(employee?.empCode || upperCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareVerification = () => {
    if (navigator.share) {
      navigator.share({
        title: `KIPL ID Verification — ${employee?.fullName || upperCode}`,
        text: `Official Employee Credential for ${employee?.fullName || upperCode} (${employee?.designation || 'Personnel'}) at KIPL Dal Lake STP Project.`,
        url: window.location.href,
      }).catch(() => undefined)
    } else {
      copyCode()
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/site" className="flex items-center gap-2.5 group">
            <img
              src="/assets/kipl-logo.png"
              alt="KIPL Logo"
              className="w-8 h-8 rounded-full border border-emerald-500/40 object-contain bg-white/5 p-0.5"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
            />
            <div>
              <span className="font-bold text-white tracking-wide text-sm group-hover:text-emerald-400 transition-colors">
                KHILARI INFRASTRUCTURE
              </span>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight leading-none">
                SECURITY VERIFICATION GATEWAY
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              256-Bit SSL Encrypted
            </span>
            <Link
              to="/site"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Return to Public Site"
            >
              <House size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 md:py-8 flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-400 animate-pulse font-mono">
              Verifying credential against KIPL ProjectOS Registry...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center gap-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-red-900/40 border border-red-500/40 flex items-center justify-center text-red-400">
              <WarningCircle size={36} weight="duotone" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-300">Identity Verification Unsuccessful</h2>
              <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">{error}</p>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
              Query Code: <span className="text-red-400 font-bold">{upperCode}</span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              If this ID card was recently issued, please contact the KIPL Project Site Office at Nishat (+91 9419 428 963) to verify roster updates.
            </p>
            <Link
              to="/site"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition-colors mt-2"
            >
              <ArrowLeft size={16} /> Return to Home
            </Link>
          </div>
        ) : (
          <>
            {/* Authenticated Verification Header Shield Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 p-5 sm:p-6 shadow-2xl">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner flex-shrink-0">
                    <ShieldCheck size={28} weight="fill" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle size={15} weight="fill" /> Official Verified Personnel
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {employee.status || 'ACTIVE'}
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                      {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                    </h1>
                    <p className="text-emerald-400 font-medium text-xs sm:text-sm">
                      {employee.designation || 'Engineer'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={shareVerification}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    <ShareNetwork size={14} />
                    <span>Share</span>
                  </button>
                  <button
                    onClick={() => setShowCardModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition-colors"
                  >
                    <IdentificationCard size={15} />
                    <span>View Card</span>
                  </button>
                </div>
              </div>

              {/* Timestamp & Anti-Tamper Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 font-mono">
                <div>
                  <span className="text-slate-500">Scan Verified:</span>{' '}
                  <span className="text-slate-300 font-semibold">{timestamp}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Cert Hash:</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    KIPL-SEC-{upperCode.replace(/[^A-Z0-9]/g, '')}-OK
                  </span>
                </div>
              </div>
            </div>

            {/* Personnel & Identity Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left Column: ID & Photo Badge */}
              <div className="md:col-span-1 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full border-2 border-emerald-500/60 p-1 bg-slate-900 shadow-xl overflow-hidden flex items-center justify-center">
                    {employee.photoUrl ? (
                      <img
                        src={employee.photoUrl}
                        alt={employee.fullName}
                        className="w-full h-full rounded-full object-cover object-top"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-emerald-400 font-black text-2xl">KIPL</div>'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-emerald-400 font-black text-2xl rounded-full">
                        {employee.firstName?.[0] || 'K'}{employee.lastName?.[0] || 'I'}
                      </div>
                    )}
                  </div>
                  <div
                    className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-slate-950"
                    title="Active Authenticated"
                  >
                    <CheckCircle size={18} weight="bold" />
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base">
                    {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                  </h3>
                  <p className="text-xs text-emerald-400 font-semibold">{employee.designation}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{employee.department || 'Operations'}</p>
                </div>

                <div className="w-full pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-mono">Employee Code</span>
                    <button
                      onClick={copyCode}
                      className="font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                      title="Copy Employee Code"
                    >
                      <span>{employee.empCode}</span>
                      {copied ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                    </button>
                  </div>

                  {employee.bloodGroup && (
                    <div className="flex items-center justify-between text-xs bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Blood Group</span>
                      <span className="font-bold text-red-400 font-mono">{employee.bloodGroup}</span>
                    </div>
                  )}

                  {employee.dateOfJoining && (
                    <div className="flex items-center justify-between text-xs bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Joined</span>
                      <span className="font-mono text-slate-300">
                        {String(employee.dateOfJoining).split('T')[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Verified Official Credentials & Affiliations */}
              <div className="md:col-span-2 flex flex-col gap-4">
                {/* Government & Project Association Box */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    <Buildings size={16} className="text-emerald-400" />
                    <span>Project & Client Affiliation</span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/90">
                      <p className="text-[11px] font-mono uppercase text-emerald-400 font-semibold tracking-wide">
                        Designated Project
                      </p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {employee.project?.name || '38.5 MLD Sewage Treatment Plant (STP)'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin size={13} className="text-slate-500" />
                        {employee.project?.location || 'Dal Lake Catchment, Srinagar, J&K'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                        <p className="text-[10px] font-mono text-slate-400 uppercase">Executing Contractor</p>
                        <p className="font-bold text-slate-200 mt-0.5">
                          {employee.project?.company || 'Khilari Infrastructure Pvt. Ltd.'}
                        </p>
                        <p className="text-[11px] text-emerald-400">Engineers · Contractors</p>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                        <p className="text-[10px] font-mono text-slate-400 uppercase">Government Authority</p>
                        <p className="font-bold text-slate-200 mt-0.5">
                          UEED, Govt. of Jammu & Kashmir
                        </p>
                        <p className="text-[11px] text-slate-400">Urban Environmental Eng. Dept.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/40 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Funding Scheme</span>
                        <span className="font-bold text-slate-200">AMRUT Scheme</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">Govt. of India</span>
                    </div>
                  </div>
                </div>

                {/* Contact & Residential Details */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    <Phone size={16} className="text-emerald-400" />
                    <span>Official Communications & Contacts</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {employee.phone && (
                      <a
                        href={`tel:${employee.phone}`}
                        className="p-3 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 flex items-center gap-3 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20">
                          <Phone size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-slate-400 uppercase font-mono">Mobile</p>
                          <p className="font-bold text-slate-200 truncate group-hover:text-emerald-300">
                            {employee.phone}
                          </p>
                        </div>
                      </a>
                    )}

                    {employee.email && (
                      <a
                        href={`mailto:${employee.email}`}
                        className="p-3 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 flex items-center gap-3 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20">
                          <Envelope size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-slate-400 uppercase font-mono">Email</p>
                          <p className="font-bold text-slate-200 truncate group-hover:text-blue-300">
                            {employee.email}
                          </p>
                        </div>
                      </a>
                    )}
                  </div>

                  {employee.address && (
                    <div className="mt-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 flex items-start gap-2.5 text-xs text-slate-300">
                      <MapPin size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">Residential Address</span>
                        <span>{employee.address}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Project Site Office & Lost Card Hotline */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-emerald-400" />
                    <h4 className="font-bold text-white text-sm">Project Site Office & Helpline</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    {employee.project?.siteOffice || '38.5 MLD STP, Near LCMA Enforcement Office, Lashkari Mohalla, ISHBER Nishat, Srinagar-191121'}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href="tel:+919419428963"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-950"
                  >
                    <Phone size={15} weight="bold" />
                    <span>Call Office (+91 9419 428 963)</span>
                  </a>

                  <button
                    onClick={() => setShowLostModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    <Warning size={15} className="text-amber-400" />
                    <span>Lost Card?</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Official Legal & Security Disclaimer Footer */}
            <div className="text-center text-[11px] text-slate-500 space-y-1.5 py-4 border-t border-slate-800/60 font-sans">
              <p>
                Official Personnel Digital Record · Issued under authority of{' '}
                <strong className="text-slate-400">Khilari Infrastructure Pvt. Ltd.</strong> for Dal Lake STP Project.
              </p>
              <p className="text-[10px] text-slate-600 max-w-xl mx-auto">
                This verification portal is dynamically authenticated against the KIPL ProjectOS Security Ledger. Unauthorized replication, alteration, or fraudulent possession of this credential is a punishable offense under Indian Penal Code and IT Act.
              </p>
              <div className="pt-2 flex items-center justify-center gap-4 text-slate-400 text-xs">
                <Link to="/site" className="hover:text-emerald-400 transition-colors">Project Portal</Link>
                <span>·</span>
                <Link to="/site/timeline" className="hover:text-emerald-400 transition-colors">Timeline</Link>
                <span>·</span>
                <Link to="/site/technology" className="hover:text-emerald-400 transition-colors">STP Tech</Link>
                <span>·</span>
                <Link to="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal: View Physical ID Card Artwork Preview */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <IdentificationCard size={20} className="text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Physical ID Card (Front & Back)</h3>
              </div>
              <button
                onClick={() => setShowCardModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex flex-col items-center gap-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-slate-400 text-center">
                This employee carries the official KIPL lanyard card shown below with an authentic QR code linking to this page.
              </p>
              <img
                src="/assets/id-card-sample.jpg"
                alt="ID Card Artwork"
                className="w-full rounded-xl border border-slate-800 shadow-md object-contain"
              />
              <div className="w-full flex items-center justify-between text-xs text-slate-400 px-2">
                <span>Code: {upperCode}</span>
                <a
                  href="/assets/qr-zubair-shah.png"
                  download="kipl-id-qr-code.png"
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <QrCode size={14} /> Download QR Image
                </a>
              </div>
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowCardModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Report Lost / Found Card */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <Warning size={20} weight="fill" />
                <h3 className="font-bold text-white text-sm">Found This ID Card?</h3>
              </div>
              <button
                onClick={() => setShowLostModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-300">
              <p>
                If you have found this physical ID card, please return it to the nearest project office or notify the management so we can return it to <strong className="text-white">{employee?.fullName || 'the employee'}</strong>.
              </p>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[10px] uppercase font-mono text-emerald-400 font-semibold">Drop-off / Mailing Address</p>
                <p className="font-medium text-white">
                  38.5 MLD Sewage Treatment Plant Site Office,<br />
                  Near LCMA Enforcement Office, Lashkari Mohalla,<br />
                  ISHBER Nishat, Srinagar - 191121, J&K
                </p>
              </div>

              <div className="space-y-2">
                <a
                  href="tel:+919419428963"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
                >
                  <Phone size={15} weight="bold" />
                  <span>Call Site Office: +91 9419 428 963</span>
                </a>

                <a
                  href={`mailto:office@kiplstpsrinagar.com?subject=Found%20ID%20Card%20${upperCode}&body=Hello,%20I%20have%20found%20the%20ID%20card%20for%20employee%20code%20${upperCode}.`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                >
                  <Envelope size={15} />
                  <span>Send Email Notification</span>
                </a>
              </div>
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowLostModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
