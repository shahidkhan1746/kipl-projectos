import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../shared/widgets/state_views.dart';
import '../diary_provider.dart';

/// The daily site diary — weather, manpower, what was built, what got in the
/// way, and the photographs Clause 17.5 requires.
///
/// Two things were wrong beyond the styling.
///
/// The manpower counters were bare InkWells wrapped around a 16px icon. That
/// is a tap target roughly a third of the 48dp minimum, on the control a
/// supervisor presses most on this screen — three trades, tapped up and down
/// until the headcount is right, in gloves. They are IconButtons now, which
/// carry the full target whatever size the icon inside them is.
///
/// The weather chips were labelled "Sunny ☀️", "Cloudy ⛅", "Rainy 🌧️",
/// "Snowy ❄️" and "Foggy 🌫️". Emoji render differently on every Android skin,
/// do not take a text colour, and are read aloud by name. They are Material
/// icons now.
class DiaryScreen extends ConsumerStatefulWidget {
  const DiaryScreen({super.key});

  @override
  ConsumerState<DiaryScreen> createState() => _DiaryScreenState();
}

class _DiaryScreenState extends ConsumerState<DiaryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _workDoneController = TextEditingController();
  final _issuesController = TextEditingController();
  final _workDoneFocus = FocusNode();
  final _issuesFocus = FocusNode();

  static const _weather = [
    ('sunny', 'Sunny', Icons.wb_sunny_outlined),
    ('cloudy', 'Cloudy', Icons.wb_cloudy_outlined),
    ('rainy', 'Rainy', Icons.water_drop_outlined),
    ('snowy', 'Snowy', Icons.ac_unit),
    ('foggy', 'Foggy', Icons.foggy),
  ];

  @override
  void dispose() {
    _workDoneController.dispose();
    _issuesController.dispose();
    _workDoneFocus.dispose();
    _issuesFocus.dispose();
    super.dispose();
  }

  void _submit() {
    final notifier = ref.read(diaryProvider.notifier);
    notifier.updateWorkDone(_workDoneController.text.trim());
    notifier.updateIssuesFaced(_issuesController.text.trim());
    // A diary entry with no work described is a signed record of a day on
    // site that says nothing about it.
    if (!(_formKey.currentState?.validate() ?? false)) return;
    notifier.saveDiary();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<DiaryState>(diaryProvider, (previous, next) {
      if (previous?.isLoading == true && !next.isLoading) {
        if (_workDoneController.text.isEmpty && next.workDone.isNotEmpty) {
          _workDoneController.text = next.workDone;
        }
        if (_issuesController.text.isEmpty && next.issuesFaced.isNotEmpty) {
          _issuesController.text = next.issuesFaced;
        }
      }
    });

    final state = ref.watch(diaryProvider);
    final notifier = ref.read(diaryProvider.notifier);
    final theme = Theme.of(context);
    final status = context.status;
    final locked = state.status == 'approved';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Site Diary'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload today',
            onPressed: state.isLoading ? null : notifier.loadTodayDiary,
          ),
        ],
      ),
      body: state.isLoading
          ? const LoadingState(message: "Loading today's diary…")
          : Form(
              key: _formKey,
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                  Space.gutter,
                  Space.lg,
                  Space.gutter,
                  Space.giant + MediaQuery.viewInsetsOf(context).bottom,
                ),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          DateFormatters.shortDate.format(DateTime.now()),
                          style: theme.textTheme.titleMedium,
                        ),
                      ),
                      if (locked)
                        const StatusChip(
                          label: 'Approved',
                          icon: Icons.lock_outline,
                        ),
                    ],
                  ),
                  const SizedBox(height: Space.xs),
                  Text(
                    locked
                        ? 'This diary has been approved and can no longer be '
                            'edited.'
                        : 'Recorded once per day and submitted for approval.',
                    style: theme.textTheme.labelMedium,
                  ),
                  const SizedBox(height: Space.xxl),
                  const _SectionTitle('Weather'),
                  const SizedBox(height: Space.sm),
                  Wrap(
                    spacing: Space.sm,
                    runSpacing: Space.sm,
                    children: [
                      for (final (value, label, icon) in _weather)
                        ChoiceChip(
                          avatar: Icon(
                            icon,
                            size: Sizes.iconInline,
                            color: state.weather == value
                                ? theme.colorScheme.onPrimaryContainer
                                : theme.colorScheme.onSurfaceVariant,
                          ),
                          label: Text(label),
                          selected: state.weather == value,
                          onSelected: locked
                              ? null
                              : (_) => notifier.updateWeather(value),
                        ),
                    ],
                  ),
                  const SizedBox(height: Space.lg),
                  _Stepper(
                    label: 'Hours lost to weather',
                    value: '${state.hoursLost.toStringAsFixed(1)} h',
                    valueColor: state.hoursLost > 0 ? status.warning : null,
                    onDecrement: locked || state.hoursLost <= 0
                        ? null
                        : () => notifier.updateHoursLost(
                            (state.hoursLost - 0.5).clamp(0, 12).toDouble()),
                    onIncrement: locked || state.hoursLost >= 12
                        ? null
                        : () => notifier.updateHoursLost(
                            (state.hoursLost + 0.5).clamp(0, 12).toDouble()),
                  ),
                  const SizedBox(height: Space.xxl),
                  _SectionTitle('Manpower',
                      trailing: '${state.totalLabour} on site'),
                  const SizedBox(height: Space.sm),
                  _Stepper(
                    label: 'Skilled',
                    value: '${state.skilledLabour}',
                    onDecrement: locked || state.skilledLabour <= 0
                        ? null
                        : () => notifier.updateSkilled(state.skilledLabour - 1),
                    onIncrement: locked
                        ? null
                        : () => notifier.updateSkilled(state.skilledLabour + 1),
                  ),
                  _Stepper(
                    label: 'Unskilled',
                    value: '${state.unskilledLabour}',
                    onDecrement: locked || state.unskilledLabour <= 0
                        ? null
                        : () =>
                            notifier.updateUnskilled(state.unskilledLabour - 1),
                    onIncrement: locked
                        ? null
                        : () =>
                            notifier.updateUnskilled(state.unskilledLabour + 1),
                  ),
                  _Stepper(
                    label: 'Supervisory',
                    value: '${state.supervisoryLabour}',
                    onDecrement: locked || state.supervisoryLabour <= 0
                        ? null
                        : () => notifier
                            .updateSupervisory(state.supervisoryLabour - 1),
                    onIncrement: locked
                        ? null
                        : () => notifier
                            .updateSupervisory(state.supervisoryLabour + 1),
                  ),
                  const SizedBox(height: Space.xxl),
                  const _SectionTitle('Work executed'),
                  const SizedBox(height: Space.sm),
                  KiplTextField(
                    controller: _workDoneController,
                    focusNode: _workDoneFocus,
                    label: 'What was built today',
                    hint: 'e.g. RCC pour, Aeration Tank Zone 2; excavation '
                        'for pipe laying at Ch. 1+250',
                    enabled: !locked,
                    maxLines: 4,
                    textCapitalization: TextCapitalization.sentences,
                    onChanged: notifier.updateWorkDone,
                    validator: (v) => (v?.trim().isEmpty ?? true)
                        ? 'Describe the work executed — this is the record of '
                            'the day.'
                        : null,
                  ),
                  const SizedBox(height: Space.xl),
                  const _SectionTitle('Issues and delays'),
                  const SizedBox(height: Space.sm),
                  KiplTextField(
                    controller: _issuesController,
                    focusNode: _issuesFocus,
                    label: 'Anything that held the work up',
                    helper: 'Leave blank if the day ran clean',
                    hint: 'e.g. Cement delivery 2h late; groundwater pumping '
                        'required',
                    enabled: !locked,
                    maxLines: 3,
                    textCapitalization: TextCapitalization.sentences,
                    onChanged: notifier.updateIssuesFaced,
                  ),
                  const SizedBox(height: Space.xxl),
                  const _SectionTitle('Photographs', trailing: 'Clause 17.5'),
                  const SizedBox(height: Space.sm),
                  if (!locked)
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.camera_alt_outlined,
                                size: Sizes.icon),
                            label: const Text('Camera'),
                            onPressed: () =>
                                notifier.capturePhoto(ImageSource.camera),
                          ),
                        ),
                        const SizedBox(width: Space.md),
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.photo_library_outlined,
                                size: Sizes.icon),
                            label: const Text('Gallery'),
                            onPressed: () =>
                                notifier.capturePhoto(ImageSource.gallery),
                          ),
                        ),
                      ],
                    ),
                  if (state.photoUrls.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: Space.md),
                      child: Text(
                        locked
                            ? 'No photographs were attached to this diary.'
                            : 'No photographs yet.',
                        style: theme.textTheme.bodySmall,
                      ),
                    )
                  else ...[
                    const SizedBox(height: Space.md),
                    _PhotoStrip(urls: state.photoUrls),
                  ],
                  if (state.message != null) ...[
                    const SizedBox(height: Space.xl),
                    _Note(
                      icon: Icons.check_circle_outline,
                      tone: status.success,
                      text: state.message!,
                    ),
                  ],
                  if (state.error != null) ...[
                    const SizedBox(height: Space.xl),
                    _Note(
                      icon: Icons.error_outline,
                      tone: status.danger,
                      text: state.error!,
                    ),
                  ],
                  const SizedBox(height: Space.huge),
                  SizedBox(
                    height: Sizes.control,
                    child: FilledButton.icon(
                      onPressed: locked || state.isSaving ? null : _submit,
                      icon: state.isSaving
                          ? const SizedBox(
                              width: Sizes.icon,
                              height: Sizes.icon,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.send_rounded),
                      label: Text(locked ? 'Approved' : 'Submit diary'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

/// A label, a value, and two buttons that each clear the 48dp target.
///
/// The old counter put a 16px Icon inside a bare InkWell, so the hit area was
/// the glyph. IconButton sizes its target independently of its icon, which is
/// exactly the problem it exists to solve.
class _Stepper extends StatelessWidget {
  const _Stepper({
    required this.label,
    required this.value,
    this.valueColor,
    this.onDecrement,
    this.onIncrement,
  });

  final String label;
  final String value;
  final Color? valueColor;
  final VoidCallback? onDecrement;
  final VoidCallback? onIncrement;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Space.xs),
      child: Row(
        children: [
          Expanded(child: Text(label, style: theme.textTheme.bodyMedium)),
          IconButton(
            icon: const Icon(Icons.remove_circle_outline),
            tooltip: 'Decrease $label',
            onPressed: onDecrement,
          ),
          // Fixed width so the three counters' numbers line up in a column
          // instead of shuffling sideways as the values change.
          SizedBox(
            width: 56,
            child: Text(
              value,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleSmall?.copyWith(color: valueColor),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            tooltip: 'Increase $label',
            onPressed: onIncrement,
          ),
        ],
      ),
    );
  }
}

class _PhotoStrip extends StatelessWidget {
  const _PhotoStrip({required this.urls});

  final List<String> urls;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: 96,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: urls.length,
        separatorBuilder: (_, __) => const SizedBox(width: Space.sm),
        itemBuilder: (context, i) => ClipRRect(
          borderRadius: Radii.controlAll,
          // CachedNetworkImage, not Image.network: this strip is rebuilt on
          // every keystroke in the two text fields above it, and a plain
          // Image.network re-requests over a site connection each time.
          child: CachedNetworkImage(
            imageUrl: urls[i],
            width: 96,
            height: 96,
            fit: BoxFit.cover,
            placeholder: (context, _) => Container(
              width: 96,
              height: 96,
              color: theme.colorScheme.surfaceContainer,
            ),
            errorWidget: (context, _, __) => Container(
              width: 96,
              height: 96,
              color: theme.colorScheme.surfaceContainer,
              child: Icon(Icons.broken_image_outlined,
                  color: theme.colorScheme.outline),
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, {this.trailing});

  final String title;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(child: Text(title, style: theme.textTheme.titleSmall)),
        if (trailing != null)
          Text(trailing!, style: theme.textTheme.labelMedium),
      ],
    );
  }
}

/// A small state marker with an icon — used where a StatusPill would be
/// overkill because there is only ever one of them on the screen.
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final status = context.status;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: Space.sm,
        vertical: Space.xs,
      ),
      decoration: BoxDecoration(
        color: status.successContainer,
        borderRadius: Radii.badgeAll,
        border: Border.all(color: status.success.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: Sizes.iconInline, color: status.onSuccessContainer),
          const SizedBox(width: Space.xs),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: status.onSuccessContainer,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.tone, required this.text});

  final IconData icon;
  final Color tone;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.10),
        borderRadius: Radii.controlAll,
        border: Border.all(color: tone.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: Sizes.iconInline, color: tone),
          const SizedBox(width: Space.sm),
          Expanded(
            child: Text(
              text,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurface),
            ),
          ),
        ],
      ),
    );
  }
}
