/// Project identity shown in the app's chrome.
///
/// Single source of truth: these strings appeared inline in four screens and
/// had drifted out of step with the backend.
class ProjectInfo {
  /// UNVERIFIED — CONFIRM AGAINST THE CONTRACT BEFORE RELEASE.
  ///
  /// The mobile app said 38.5 MLD on the login screen, the dashboard header,
  /// the dashboard project card and the attendance screen. The backend says
  /// 30 MLD in the WBS seed ("STP Construction (30 MLD)") and in
  /// scripts/seed-real-project.js ("STP/MPS/IPS Works — 30 MLD").
  ///
  /// Both cannot be right. The mobile figure is kept here so behaviour is
  /// unchanged until someone checks the contract; correct it in this one place
  /// and the whole app follows. If 30 is correct, the backend seeds are already
  /// right and only this line changes.
  static const String stpCapacity = '38.5 MLD';

  static const String schemeName = 'Dal Lake Sewerage Scheme';
  static const String siteLocation = 'Nishat, Srinagar';

  /// "Dal Lake Sewerage Scheme — 38.5 MLD STP"
  static const String schemeWithCapacity = '$schemeName — $stpCapacity STP';

  /// "Dal Lake 38.5 MLD STP" — compact, for the app bar.
  static const String shortTitle = 'Dal Lake $stpCapacity STP';
}
