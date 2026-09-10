export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 24, fontFamily: 'system-ui', lineHeight: 1.6 }}>
      <h1>Privacy policy — KIPL ProjectOS</h1>
      <p>Khilari Infrastructure Pvt. Ltd. uses this app to run the Dal Lake sewerage project. We collect:</p>
      <ul>
        <li>Account name, email, role, and authentication tokens</li>
        <li>GPS coordinates only when you punch attendance, after you agree to the location disclosure</li>
        <li>Site photos, diaries, timesheets, and operational records you submit</li>
      </ul>
      <p>Location is used solely to verify you are on site. It is not sold or used for advertising.</p>
      <p>To delete your account, sign in and use Change Password / account settings, or email your project administrator. Deletion deactivates the login and revokes refresh tokens.</p>
    </div>
  )
}