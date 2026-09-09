/// Project identity shown in the app's chrome.
///
/// Single source of truth: these strings were duplicated inline across four
/// screens. Centralising them also stops the 30/38.5 MLD distinction being
/// "tidied up" into a single wrong number — see [stpCapacity].
class ProjectInfo {
  /// Confirmed by KIPL: the plant is described to users as 38.5 MLD.
  ///
  /// DO NOT "correct" this to 30 MLD, and do not change the backend's 30 MLD
  /// to match it. They are two different figures and both are right:
  ///
  ///   30 MLD    rated treatment capacity (the electro-mechanical plant)
  ///   38.5 MLD  civil design capacity for peak flow
  ///
  /// The contract description in epc.service.ts carries both — "STP 30 MLD …
  /// (38.50 MLD design capacity for peak flow)" — as does the WBS remark
  /// "30 MLD E/M + 38.5 MLD civil". The WBS and EPC seeds legitimately say
  /// 30 MLD because they describe the plant being built; the app chrome says
  /// 38.5 MLD because that is how the scheme is named.
  static const String stpCapacity = '38.5 MLD';

  static const String schemeName = 'Dal Lake Sewerage Scheme';
  static const String siteLocation = 'Nishat, Srinagar';
  static const String clientName = 'J&K UEED';
  static const String defaultProjectId = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
  static const double siteLatitude = 34.1380;
  static const double siteLongitude = 74.8724;
  static const double defaultGeofenceRadiusMeters = 500.0;

  /// "Dal Lake Sewerage Scheme — 38.5 MLD STP"
  static const String schemeWithCapacity = '$schemeName — $stpCapacity STP';

  /// "Dal Lake 38.5 MLD STP" — compact, for the app bar.
  static const String shortTitle = 'Dal Lake $stpCapacity STP';
}
