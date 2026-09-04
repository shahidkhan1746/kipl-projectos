import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Google Play's prominent-disclosure requirement.
///
/// Before the system location prompt can appear, the app must tell the worker,
/// in the app itself, what location data it collects, what it is used for, and
/// that it leaves the device — and the worker must take an affirmative action
/// to continue. Burying this in a privacy policy is explicitly not sufficient.
///
/// Returns true only when the worker taps Continue.
Future<bool> showLocationDisclosure(BuildContext context) async {
  final agreed = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => const _LocationDisclosureDialog(),
  );
  return agreed ?? false;
}

class _LocationDisclosureDialog extends StatelessWidget {
  const _LocationDisclosureDialog();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      contentPadding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.accentBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.location_on_outlined, color: AppColors.accent, size: 20),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Location for site attendance',
              style: TextStyle(
                color: AppColors.textBase,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'KIPL ProjectOS collects your device location to confirm you are at '
              'the Dal Lake Sewerage Scheme STP site when you mark attendance.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.45),
            ),
            SizedBox(height: 16),
            _DisclosureRow(
              icon: Icons.my_location,
              text: 'Your GPS position is read only when you tap Check In or '
                  'Check Out. It is never collected in the background or when '
                  'the app is closed.',
            ),
            _DisclosureRow(
              icon: Icons.cloud_upload_outlined,
              text: 'The position and its distance from the site are sent to '
                  'KIPL and stored with your attendance record, where HR and '
                  'your project manager can see them.',
            ),
            _DisclosureRow(
              icon: Icons.rule,
              text: 'Attendance marked more than 500 m from the site, or with a '
                  'mocked location, is rejected.',
            ),
            SizedBox(height: 4),
            Text(
              'You can decline and ask a supervisor or HR to mark your '
              'attendance for you instead.',
              style: TextStyle(color: AppColors.textFaint, fontSize: 12, height: 1.4),
            ),
          ],
        ),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Not now', style: TextStyle(color: AppColors.textMuted)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accent,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Continue', style: TextStyle(fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}

class _DisclosureRow extends StatelessWidget {
  final IconData icon;
  final String text;

  const _DisclosureRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 17, color: AppColors.textFaint),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }
}
