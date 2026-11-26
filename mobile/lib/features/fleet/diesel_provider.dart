import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/sync/sync_service.dart';
import '../../core/utils/json_parsers.dart';

/// A machine or vehicle that takes diesel from the site store.
class FuelMachine {
  final String id;
  final String name;
  final bool hired;
  final String? ownerName;
  final String? operator;
  final String meterUnit;
  final String fuelType;
  final bool active;

  const FuelMachine({
    required this.id,
    required this.name,
    this.hired = false,
    this.ownerName,
    this.operator,
    this.meterUnit = 'hours',
    this.fuelType = 'diesel',
    this.active = true,
  });

  bool get usesKm => meterUnit == 'km';

  /// "Own · Rinku" or "Hired · Wani Infra".
  String get subtitle => hired
      ? 'Hired · ${ownerName ?? 'firm not named'}'
      : (operator == null || operator!.isEmpty ? 'Own' : 'Own · $operator');

  factory FuelMachine.fromJson(Map<String, dynamic> json) => FuelMachine(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? 'Machine',
        hired: json['ownership'] == 'hired',
        ownerName: json['ownerName'] as String?,
        operator: json['operator'] as String?,
        meterUnit: json['meterUnit'] as String? ?? 'hours',
        fuelType: json['fuelType'] as String? ?? 'diesel',
        active: json['active'] as bool? ?? true,
      );
}

/// One line of the register: what moved, and the stock after it.
class FuelEntryRow {
  final String id;
  final String entryType; // receipt | issue | adjustment
  final String date;
  final double litres;
  final double balance;
  final String? machineId;
  final String? logbookMachine;
  final String? operator;
  final double? meterReading;
  final String? supplier;
  final String? remarks;
  final String? recordedBy;
  final bool fromLogbook;

  const FuelEntryRow({
    required this.id,
    required this.entryType,
    required this.date,
    required this.litres,
    required this.balance,
    this.machineId,
    this.logbookMachine,
    this.operator,
    this.meterReading,
    this.supplier,
    this.remarks,
    this.recordedBy,
    this.fromLogbook = false,
  });

  bool get isIssue => entryType == 'issue';
  bool get isOut => isIssue || litres < 0;

  factory FuelEntryRow.fromJson(Map<String, dynamic> json) => FuelEntryRow(
        id: json['id'] as String? ?? '',
        entryType: json['entryType'] as String? ?? 'issue',
        date: (json['date'] as String? ?? '').split('T').first,
        litres: jsonDouble(json['litres']) ?? 0,
        balance: jsonDouble(json['balance']) ?? 0,
        machineId: json['machineId'] as String?,
        logbookMachine: json['logbookMachine'] as String?,
        operator: json['operator'] as String?,
        meterReading: jsonDouble(json['meterReading']),
        supplier: json['supplier'] as String?,
        remarks: json['remarks'] as String?,
        recordedBy: json['recordedByName'] as String?,
        fromLogbook: json['fleetLogId'] != null,
      );
}

/// A machine's month: how much it took and, when the meter allows, its burn.
class MachineUse {
  final String machineId;
  final String name;
  final bool hired;
  final String? ownerName;
  final double litres;
  final int fills;
  final double? rate;
  final String rateBasis;
  final String unit;

  const MachineUse({
    required this.machineId,
    required this.name,
    this.hired = false,
    this.ownerName,
    required this.litres,
    required this.fills,
    this.rate,
    this.rateBasis = '',
    this.unit = 'hr',
  });

  factory MachineUse.fromJson(Map<String, dynamic> json) {
    final meter = jsonDouble(json['meterRate']);
    final logbook = jsonDouble(json['logbookRate']);
    final fills = (json['fills'] as num?)?.toInt() ?? 0;
    final km = json['meterUnit'] == 'km';
    return MachineUse(
      machineId: json['machineId'] as String? ?? '',
      name: json['name'] as String? ?? 'Machine',
      hired: json['ownership'] == 'hired',
      ownerName: json['ownerName'] as String?,
      litres: jsonDouble(json['litres']) ?? 0,
      fills: fills,
      rate: meter ?? logbook,
      unit: km ? 'km' : 'hr',
      rateBasis: meter != null
          ? 'from meter readings'
          : logbook != null
              ? 'from logbook ${km ? 'km' : 'hours'}, if every day is logged'
              : fills > 0
                  ? 'record the ${km ? 'odometer' : 'hour meter'} at each fill'
                  : '',
    );
  }
}

/// The advance held with the filling station, as the server works it out:
/// payments in, diesel taken (purchases in the register and deliveries from
/// before it), and what is left.
class PumpSummary {
  final String supplierName;
  final double? rate;
  final double paid;
  final double taken;
  final double litresTaken;
  final double balance;
  final int? balanceLitres;
  final double? daysCovered;

  /// 'overdrawn', 'low' or null.
  final String? warning;
  final String? lastPaymentDate;
  final double? lastPaymentAmount;
  final String? lastPaymentMode;
  final String? lastPaymentReference;
  final int payments;

  const PumpSummary({
    required this.supplierName,
    this.rate,
    required this.paid,
    required this.taken,
    required this.litresTaken,
    required this.balance,
    this.balanceLitres,
    this.daysCovered,
    this.warning,
    this.lastPaymentDate,
    this.lastPaymentAmount,
    this.lastPaymentMode,
    this.lastPaymentReference,
    this.payments = 0,
  });

  /// The share of everything paid that is still unused, 0 to 1.
  double get unused => paid > 0 ? (balance / paid).clamp(0.0, 1.0) : 0;

  static PumpSummary? fromJson(Map<String, dynamic>? json) {
    if (json == null) return null;
    final supplier = json['supplier'] as Map? ?? {};
    final last = json['lastPayment'] as Map?;
    return PumpSummary(
      supplierName: supplier['name'] as String? ?? 'The pump',
      rate: jsonDouble(supplier['rate']),
      paid: jsonDouble(json['paid']) ?? 0,
      taken: jsonDouble(json['taken']) ?? 0,
      litresTaken: jsonDouble(json['litresTaken']) ?? 0,
      balance: jsonDouble(json['balance']) ?? 0,
      balanceLitres: (json['balanceLitres'] as num?)?.toInt(),
      daysCovered: jsonDouble(json['daysCovered']),
      warning: json['warning'] as String?,
      lastPaymentDate: last?['date'] as String?,
      lastPaymentAmount: jsonDouble(last?['amount']),
      lastPaymentMode: last?['mode'] as String?,
      lastPaymentReference: last?['reference'] as String?,
      payments: [for (final l in (json['lines'] as List? ?? [])) if ((l as Map)['kind'] == 'payment') l].length,
    );
  }
}

/// "₹4,42,148", grouped the Indian way.
String rupeesLabel(double v) {
  final grouped = litresLabel(v.abs().roundToDouble()); // "4,42,148 L"
  return '${v < 0 ? '−' : ''}₹${grouped.substring(0, grouped.length - 2)}';
}

/// What the advance means in days of diesel, or why it needs attention. Worded as the website words it.
String pumpStatusText(PumpSummary pump) {
  if (pump.warning == 'overdrawn') {
    return 'More diesel taken than paid for: ${rupeesLabel(-pump.balance)} owed to ${pump.supplierName}. Pay before the next delivery.';
  }
  if (pump.balanceLitres == null) return 'Set the pump rate to see how much diesel the advance buys.';
  final paidFor = 'About ${litresLabel(pump.balanceLitres!.toDouble())} of diesel paid for';
  final days = pump.daysCovered;
  if (days == null) return '$paidFor.';
  if (pump.warning == 'low') return '$paidFor: only ${_plain(days)} days at the recent rate. Top up the advance.';
  return '$paidFor: about ${days.floor()} days at the recent rate.';
}

class DieselState {
  final bool isLoading;
  final bool isSubmitting;
  final List<FuelMachine> machines;
  final List<FuelEntryRow> entries;
  final List<MachineUse> machineUse;
  final double stockNow;
  final double openingStock;
  final double receivedThisMonth;
  final double issuedThisMonth;

  /// Diesel put into hired machines this month, by hire firm.
  final Map<String, double> hiredByFirm;
  final List<String> warnings;

  /// Litres issued per day recently (the last [coverWindowDays] days), and
  /// how many days the stock lasts at that rate. Null when nothing was issued.
  final double? dailyAverage;
  final double? daysOfCover;
  final int coverWindowDays;

  /// The site's date as the server sees it (yyyy-MM-dd), for "runs out around".
  final String? today;

  /// The advance with the usual pump; null until one is listed.
  final PumpSummary? pump;
  final String? message;
  final String? error;

  const DieselState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.machines = const [],
    this.entries = const [],
    this.machineUse = const [],
    this.stockNow = 0,
    this.openingStock = 0,
    this.receivedThisMonth = 0,
    this.issuedThisMonth = 0,
    this.hiredByFirm = const {},
    this.warnings = const [],
    this.dailyAverage,
    this.daysOfCover,
    this.coverWindowDays = 0,
    this.today,
    this.pump,
    this.message,
    this.error,
  });

  FuelMachine? machine(String? id) {
    for (final m in machines) {
      if (m.id == id) return m;
    }
    return null;
  }

  DieselState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    List<FuelMachine>? machines,
    List<FuelEntryRow>? entries,
    List<MachineUse>? machineUse,
    double? stockNow,
    double? openingStock,
    double? receivedThisMonth,
    double? issuedThisMonth,
    Map<String, double>? hiredByFirm,
    List<String>? warnings,
    double? dailyAverage,
    double? daysOfCover,
    int? coverWindowDays,
    String? today,
    PumpSummary? pump,
    String? message,
    String? error,
  }) =>
      DieselState(
        isLoading: isLoading ?? this.isLoading,
        isSubmitting: isSubmitting ?? this.isSubmitting,
        machines: machines ?? this.machines,
        entries: entries ?? this.entries,
        machineUse: machineUse ?? this.machineUse,
        stockNow: stockNow ?? this.stockNow,
        openingStock: openingStock ?? this.openingStock,
        receivedThisMonth: receivedThisMonth ?? this.receivedThisMonth,
        issuedThisMonth: issuedThisMonth ?? this.issuedThisMonth,
        hiredByFirm: hiredByFirm ?? this.hiredByFirm,
        warnings: warnings ?? this.warnings,
        dailyAverage: dailyAverage ?? this.dailyAverage,
        daysOfCover: daysOfCover ?? this.daysOfCover,
        coverWindowDays: coverWindowDays ?? this.coverWindowDays,
        today: today ?? this.today,
        pump: pump ?? this.pump,
        message: message,
        error: error,
      );
}

/// "1,234.5 L"
String litresLabel(double v) {
  final rounded = v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(1);
  final parts = rounded.split('.');
  final digits = parts.first.replaceFirst('-', '');
  final buf = StringBuffer(v < 0 ? '-' : '');
  // Indian grouping: last three digits, then pairs.
  if (digits.length <= 3) {
    buf.write(digits);
  } else {
    final head = digits.substring(0, digits.length - 3);
    final tail = digits.substring(digits.length - 3);
    final pairs = <String>[];
    for (var i = head.length; i > 0; i -= 2) {
      pairs.insert(0, head.substring(i - 2 < 0 ? 0 : i - 2, i));
    }
    buf.write('${pairs.join(',')},$tail');
  }
  if (parts.length > 1) buf.write('.${parts[1]}');
  return '${buf.toString()} L';
}

/// The dial runs from empty to this many days of diesel; beyond it reads "10+".
const gaugeDays = 10.0;

/// How worried to be about the stock: under 2 days is low (buy now), under 4
/// is worth watching. The same bands as the website's dial.
enum CoverLevel { low, watch, good, unknown }

CoverLevel coverLevel(double? days) {
  if (days == null) return CoverLevel.unknown;
  if (days < 2) return CoverLevel.low;
  return days < 4 ? CoverLevel.watch : CoverLevel.good;
}

String coverLevelLabel(CoverLevel level) => switch (level) {
      CoverLevel.low => 'Buy diesel now',
      CoverLevel.watch => 'Running low',
      CoverLevel.good => 'Healthy',
      CoverLevel.unknown => 'No recent issues',
    };

/// 1.7 -> "1.7", 2.0 -> "2".
String _plain(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(1);

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/// "About 1.7 days at 180 L a day: runs out around 25 Nov", or why there is
/// no estimate. Worded as the website words it.
String coverText({double? dailyAverage, double? daysOfCover, int windowDays = 0, String? today}) {
  if (dailyAverage == null || daysOfCover == null) {
    return windowDays > 0
        ? 'No diesel issued in the last $windowDays days, so no rate to go on'
        : 'Nothing recorded yet';
  }
  final days = '${_plain(daysOfCover)} day${daysOfCover == 1 ? '' : 's'}';
  final base = DateTime.tryParse(today ?? '');
  if (base == null) return 'About $days at ${litresLabel(dailyAverage)} a day';
  final runOut = DateTime.utc(base.year, base.month, base.day + daysOfCover.floor());
  return 'About $days at ${litresLabel(dailyAverage)} a day: '
      'runs out around ${runOut.day} ${_months[runOut.month - 1]}';
}

/// The register's warnings, in words, from the summary the API sends.
List<String> describeWarnings(List raw) => [
      for (final w in raw.whereType<Map<String, dynamic>>())
        switch (w['kind']) {
          'negative_stock' =>
            'Stock goes below zero (${litresLabel(jsonDouble(w['balance']) ?? 0)}) on ${w['date']}. A purchase is missing or an issue is wrong.',
          'no_meter' =>
            'No meter reading at any fill for ${[for (final m in (w['machines'] as List? ?? [])) (m as Map)['name']].join(', ')}, so their consumption cannot be checked.',
          'meter_backwards' =>
            '${w['name']}: meter reads ${w['reading']} on ${w['date']}, lower than ${w['previous']} before it.',
          'unpriced_receipts' =>
            '${w['count']} purchase${w['count'] == 1 ? '' : 's'} this month (${litresLabel(jsonDouble(w['litres']) ?? 0)}) without a rate. Enter the rate on the website so the diesel can be costed.',
          'unlisted_machine' =>
            '${litresLabel(jsonDouble(w['litres']) ?? 0)} went to "${w['logbookMachine']}", which is not on the machine list.',
          _ => 'Check the register.',
        },
    ];

/// The API's register (GET /fuel) as the screen's state.
DieselState parseRegister(Map<String, dynamic> data) {
  final summary = data['summary'] as Map<String, dynamic>? ?? {};
  final stock = (summary['stock'] as Map?)?['diesel'] as Map? ?? {};
  final totals = (summary['totals'] as Map?)?['diesel'] as Map? ?? {};
  final cover = (summary['cover'] as Map?)?['diesel'] as Map? ?? {};
  return DieselState(
    machines: [
      for (final m in (data['machines'] as List? ?? []))
        FuelMachine.fromJson(m as Map<String, dynamic>),
    ],
    // Newest first on a phone: the last fill is what people look for.
    entries: [
      for (final e in (data['entries'] as List? ?? []).reversed)
        FuelEntryRow.fromJson(e as Map<String, dynamic>),
    ],
    machineUse: [
      for (final m in (summary['machines'] as List? ?? []))
        MachineUse.fromJson(m as Map<String, dynamic>),
    ],
    stockNow: jsonDouble(stock['now']) ?? 0,
    openingStock: jsonDouble(stock['opening']) ?? 0,
    receivedThisMonth: jsonDouble(totals['received']) ?? 0,
    issuedThisMonth: jsonDouble(totals['issued']) ?? 0,
    hiredByFirm: {
      for (final o in (summary['hiredOwners'] as List? ?? []))
        (o as Map)['ownerName'] as String? ?? 'Hire firm':
            jsonDouble(o['litres']) ?? 0,
    },
    warnings: describeWarnings(summary['warnings'] as List? ?? []),
    dailyAverage: jsonDouble(cover['dailyAverage']),
    daysOfCover: jsonDouble(cover['daysOfCover']),
    coverWindowDays: (cover['windowDays'] as num?)?.toInt() ?? 0,
    today: data['today'] as String?,
    pump: PumpSummary.fromJson(data['pump'] as Map<String, dynamic>?),
  );
}

String _iso(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

final dieselProvider =
    StateNotifierProvider<DieselNotifier, DieselState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  final syncService = ref.watch(syncServiceProvider.notifier);
  return DieselNotifier(dio, user?.projectId, user?.name, syncService);
});

class DieselNotifier extends StateNotifier<DieselState> {
  final Dio _dio;
  final String? _projectId;
  final String? _userName;
  final SyncService _syncService;

  DieselNotifier(this._dio, this._projectId, this._userName, this._syncService)
      : super(const DieselState()) {
    init();
  }

  String? get userName => _userName;

  /// This month so far.
  Future<void> init() async {
    state = state.copyWith(isLoading: true);
    if (_projectId == null || _projectId.isEmpty) {
      state = state.copyWith(
        isLoading: false,
        error: 'Your project assignment is missing. Contact an administrator.',
      );
      return;
    }
    final today = DateTime.now();
    try {
      final response = await _dio.get(ApiEndpoints.fuel, queryParameters: {
        'projectId': _projectId,
        'from': _iso(DateTime(today.year, today.month, 1)),
        'to': _iso(today),
      });
      state = parseRegister(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: dioErrorMessage(e, 'Could not load the diesel register.'),
      );
    } catch (e) {
      state = state.copyWith(
          isLoading: false, error: 'Could not load the diesel register: $e');
    }
  }

  /// Saves an issue or a receipt. Queued on the phone when there is no signal.
  Future<bool> submit(Map<String, dynamic> payload) async {
    state = state.copyWith(isSubmitting: true);
    if (_projectId == null || _projectId.isEmpty) {
      state = state.copyWith(
        isSubmitting: false,
        error: 'Your project assignment is missing. Contact an administrator.',
      );
      return false;
    }
    payload['projectId'] = _projectId;
    try {
      final response = await _dio.post(ApiEndpoints.fuelEntries, data: payload);
      final warnings = [
        for (final w in ((response.data as Map?)?['warnings'] as List? ?? []))
          (w as Map)['message'] as String? ?? '',
      ].where((w) => w.isNotEmpty).toList();
      await init();
      state = state.copyWith(
        isSubmitting: false,
        message: warnings.isEmpty
            ? 'Saved to the diesel register.'
            : 'Saved. ${warnings.join(' ')}',
      );
      return true;
    } on DioException catch (error) {
      if (shouldQueueOffline(error)) {
        final queued = await _syncService.enqueue(
          endpoint: ApiEndpoints.fuelEntries,
          payload: payload,
        );
        state = state.copyWith(
          isSubmitting: false,
          message: queued
              ? 'Saved on the phone. It goes into the register once connected.'
              : null,
          error: queued
              ? null
              : 'Could not save offline — you may have been signed out. Reconnect and try again.',
        );
        return queued;
      }
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(error, 'Could not save the diesel entry.'),
      );
      return false;
    } catch (e) {
      state =
          state.copyWith(isSubmitting: false, error: 'Unexpected error: $e');
      return false;
    }
  }
}
