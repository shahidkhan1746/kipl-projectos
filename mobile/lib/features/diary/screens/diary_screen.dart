import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/kipl_button.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../diary_provider.dart';

class DiaryScreen extends ConsumerStatefulWidget {
  const DiaryScreen({super.key});

  @override
  ConsumerState<DiaryScreen> createState() => _DiaryScreenState();
}

class _DiaryScreenState extends ConsumerState<DiaryScreen> {
  late final TextEditingController _workDoneController;
  late final TextEditingController _issuesController;

  @override
  void initState() {
    super.initState();
    _workDoneController = TextEditingController();
    _issuesController = TextEditingController();
  }

  @override
  void dispose() {
    _workDoneController.dispose();
    _issuesController.dispose();
    super.dispose();
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Daily Site Diary'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: state.isLoading ? null : () => notifier.loadTodayDiary(),
            tooltip: 'Reload today diary',
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header date
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.bgCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.borderDim),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'LOGGING FOR',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                        ),
                        Text(
                          DateFormatters.formatIndian(DateTime.now()),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.accent),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  if (state.message != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.greenBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.green.withOpacity(0.4)),
                      ),
                      child: Text(state.message!, style: const TextStyle(color: AppColors.textBase, fontSize: 13)),
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (state.error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.redBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.red.withOpacity(0.4)),
                      ),
                      child: Text(state.error!, style: const TextStyle(color: AppColors.textBase, fontSize: 13)),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 1. Weather condition
                  _buildSectionTitle('1. Weather & Interruption'),
                  const SizedBox(height: 8),
                  _buildWeatherSelector(state, notifier),
                  const SizedBox(height: 12),
                  _buildHoursLostRow(state, notifier),

                  const SizedBox(height: 20),

                  // 2. Labour headcount
                  _buildSectionTitle('2. Manpower Deployed (Total: ${state.totalLabour})'),
                  const SizedBox(height: 8),
                  _buildLabourCard(state, notifier),

                  const SizedBox(height: 20),

                  // 3. Work executed description
                  _buildSectionTitle('3. Work Executed on Site'),
                  const SizedBox(height: 8),
                  KiplTextField(
                    controller: _workDoneController,
                    label: 'Description of Activities',
                    hint: 'e.g. RCC pouring in Aeration Tank Zone 2, excavation for pipe laying...',
                    maxLines: 3,
                    onChanged: notifier.updateWorkDone,
                  ),

                  const SizedBox(height: 16),

                  // 4. Issues & site challenges
                  _buildSectionTitle('4. Issues / Delays Faced'),
                  const SizedBox(height: 8),
                  KiplTextField(
                    controller: _issuesController,
                    label: 'Blockers / Material Shortages',
                    hint: 'e.g. Cement delivery delayed by 2h, groundwater pumping required...',
                    maxLines: 2,
                    onChanged: notifier.updateIssuesFaced,
                  ),

                  const SizedBox(height: 20),

                  // 5. Site photos
                  _buildSectionTitle('5. Site Photographs (Clause 17.5)'),
                  const SizedBox(height: 8),
                  _buildPhotoGallery(context, state, notifier),

                  const SizedBox(height: 28),

                  // Submit button
                  KiplButton(
                    label: 'Submit Daily Site Diary',
                    icon: Icons.send_rounded,
                    isLoading: state.isSaving,
                    onPressed: state.status == 'approved' ? null : () {
                      notifier.updateWorkDone(_workDoneController.text);
                      notifier.updateIssuesFaced(_issuesController.text);
                      notifier.saveDiary();
                    },
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: AppColors.textMuted,
        letterSpacing: 0.3,
      ),
    );
  }

  Widget _buildWeatherSelector(DiaryState state, DiaryNotifier notifier) {
    final opts = [
      {'val': 'sunny', 'label': 'Sunny ☀️'},
      {'val': 'cloudy', 'label': 'Cloudy ⛅'},
      {'val': 'rainy', 'label': 'Rainy 🌧️'},
      {'val': 'snowy', 'label': 'Snowy ❄️'},
      {'val': 'foggy', 'label': 'Foggy 🌫️'},
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: opts.map((o) {
        final isSel = state.weather == o['val'];
        return ChoiceChip(
          label: Text(o['label']!),
          selected: isSel,
          selectedColor: AppColors.accentBg,
          backgroundColor: AppColors.bgCard,
          side: BorderSide(color: isSel ? AppColors.accent : AppColors.borderDim),
          labelStyle: TextStyle(
            color: isSel ? AppColors.accent : AppColors.textBase,
            fontSize: 12,
            fontWeight: isSel ? FontWeight.w600 : FontWeight.normal,
          ),
          onSelected: (_) => notifier.updateWeather(o['val']!),
        );
      }).toList(),
    );
  }

  Widget _buildHoursLostRow(DiaryState state, DiaryNotifier notifier) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderDim),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final controls = Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                tooltip: 'Decrease weather hours lost',
                icon: const Icon(Icons.remove_circle_outline, size: 20, color: AppColors.textMuted),
                onPressed: state.hoursLost > 0
                    ? () => notifier.updateHoursLost((state.hoursLost - 0.5).clamp(0, 12).toDouble())
                    : null,
              ),
              Text(
                '${state.hoursLost.toStringAsFixed(1)}h',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.amber),
              ),
              IconButton(
                tooltip: 'Increase weather hours lost',
                icon: const Icon(Icons.add_circle_outline, size: 20, color: AppColors.textMuted),
                onPressed: () => notifier.updateHoursLost((state.hoursLost + 0.5).clamp(0, 12).toDouble()),
              ),
            ],
          );
          if (constraints.maxWidth < 320) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Weather Hours Lost (EOT claim):',
                  style: TextStyle(fontSize: 13, color: AppColors.textBase),
                ),
                Align(alignment: Alignment.centerRight, child: controls),
              ],
            );
          }
          return Row(
            children: [
              const Expanded(
                child: Text(
                  'Weather Hours Lost (EOT claim):',
                  style: TextStyle(fontSize: 13, color: AppColors.textBase),
                ),
              ),
              controls,
            ],
          );
        },
      ),
    );
  }

  Widget _buildLabourCard(DiaryState state, DiaryNotifier notifier) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderDim),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final itemWidth = constraints.maxWidth >= 286
              ? (constraints.maxWidth - 16) / 3
              : constraints.maxWidth;
          return Wrap(
            spacing: 8,
            runSpacing: 14,
            children: [
              SizedBox(width: itemWidth, child: _buildCounterItem('Skilled', state.skilledLabour, notifier.updateSkilled)),
              SizedBox(width: itemWidth, child: _buildCounterItem('Unskilled', state.unskilledLabour, notifier.updateUnskilled)),
              SizedBox(width: itemWidth, child: _buildCounterItem('Supervisor', state.supervisoryLabour, notifier.updateSupervisory)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildCounterItem(String label, int val, Function(int) onChange) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            InkWell(
              onTap: val > 0 ? () => onChange(val - 1) : null,
              child: const Icon(Icons.remove, size: 16, color: AppColors.textMuted),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text('$val', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textBase)),
            ),
            InkWell(
              onTap: () => onChange(val + 1),
              child: const Icon(Icons.add, size: 16, color: AppColors.textMuted),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPhotoGallery(BuildContext context, DiaryState state, DiaryNotifier notifier) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 8,
          children: [
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.bgSubtle,
                foregroundColor: AppColors.textBase,
                side: const BorderSide(color: AppColors.borderDim),
              ),
              icon: const Icon(Icons.camera_alt_outlined, size: 16),
              label: const Text('Camera', style: TextStyle(fontSize: 12)),
              onPressed: () => notifier.capturePhoto(ImageSource.camera),
            ),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textMuted,
                side: const BorderSide(color: AppColors.borderDim),
              ),
              icon: const Icon(Icons.photo_library_outlined, size: 16),
              label: const Text('Gallery', style: TextStyle(fontSize: 12)),
              onPressed: () => notifier.capturePhoto(ImageSource.gallery),
            ),
          ],
        ),
        if (state.photoUrls.isNotEmpty) ...[
          const SizedBox(height: 12),
          SizedBox(
            height: 90,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: state.photoUrls.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                return ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    state.photoUrls[i],
                    width: 90,
                    height: 90,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 90,
                      height: 90,
                      color: AppColors.bgSubtle,
                      child: const Icon(Icons.broken_image, color: AppColors.textFaint),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}
