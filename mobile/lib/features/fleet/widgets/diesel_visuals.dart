import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../../shared/theme/tokens.dart';
import '../diesel_provider.dart';

/// The diesel register's dial, hero card and stock banner.
///
/// They copy the website's look on purpose: a dark instrument panel with a
/// fuel-gauge dial, so the store keeper reads the same picture on the phone
/// and on the laptop. The panel is dark in both app themes, as an instrument
/// is, so its colours are fixed rather than taken from the theme.

/// Per level: the dial's bright arc runs between these two, and glows in the third.
class _Tone {
  const _Tone(this.from, this.to, this.glow);
  final Color from;
  final Color to;
  final Color glow;
}

const _tones = {
  CoverLevel.low: _Tone(Color(0xFFEF4444), Color(0xFFF97316), Color(0xBFEF4444)),
  CoverLevel.watch: _Tone(Color(0xFFF97316), Color(0xFFFACC15), Color(0x99FACC15)),
  CoverLevel.good: _Tone(Color(0xFF10B981), Color(0xFF2DD4BF), Color(0xA62DD4BF)),
  CoverLevel.unknown: _Tone(Color(0xFF64748B), Color(0xFF94A3B8), Color(0x6694A3B8)),
};

const _ink = Color(0xFFF8FAFC);
const _inkSoft = Color(0xCCE2E8F0);
const _inkFaint = Color(0x99CBD5E1);
const _sky = Color(0xFF7DD3FC);

/// The panel itself: deep navy into the teal of a diesel tank's sight glass.
const _panelGradient = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [Color(0xFF0B1220), Color(0xFF0F2742), Color(0xFF0B3A44)],
  stops: [0, 0.55, 1],
);

/// The hero is the one surface on the screen that is a panel rather than a
/// card, so it takes the sheet radius to set it apart.
const _panelRadius = BorderRadius.all(Radii.sheet);

/// Joins the last two words with a no-break space, so a wrapped sentence
/// never leaves one word alone on its last line ("runs out around 25 / Nov").
String _keepLastWords(String text) {
  final i = text.lastIndexOf(' ');
  return i < 0 ? text : '${text.substring(0, i)}\u00A0${text.substring(i + 1)}';
}

// Flutter measures angles clockwise from three o'clock. The dial opens at the
// bottom: it starts at seven o'clock and sweeps 240 degrees to five o'clock.
const _start = 150 * math.pi / 180;
const _sweep = 240 * math.pi / 180;

/// A fuel-gauge dial. The needle is days of diesel left at the recent rate of
/// issue (red under 2, amber under 4); the litres in stock sit under it. With
/// no recent issues there is no rate, so the needle rests at the end and the
/// dial says so. The needle swings up from empty when the screen opens,
/// unless the phone asks for reduced motion.
class DieselGauge extends StatelessWidget {
  const DieselGauge({super.key, required this.litres, required this.days, required this.dailyAverage});

  final double litres;
  final double? days;
  final double? dailyAverage;

  static const _size = Size(264, 214);

  @override
  Widget build(BuildContext context) {
    final level = coverLevel(days);
    final target = days == null ? 1.0 : (days!.clamp(0, gaugeDays) / gaugeDays).toDouble();
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final label = '${litresLabel(litres)} of diesel in stock'
        '${days == null ? '' : ', about ${days!.toStringAsFixed(1)} days at ${litresLabel(dailyAverage ?? 0)} a day'}';
    final daysLine = days == null
        ? 'no recent issues'
        : '${days! == days!.roundToDouble() ? days!.toStringAsFixed(0) : days!.toStringAsFixed(1)} days left';
    final amount = litresLabel(litres);
    final number = amount.substring(0, amount.length - 2);

    return Semantics(
      label: label,
      excludeSemantics: true,
      child: SizedBox.fromSize(
        size: _size,
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: target),
          duration: still ? Duration.zero : const Duration(milliseconds: 1100),
          curve: Curves.easeOutCubic,
          builder: (context, t, child) => CustomPaint(
            painter: _DialPainter(
              fraction: t,
              tone: _tones[level]!,
              labelStyle: Theme.of(context).textTheme.labelSmall!.copyWith(
                    color: _inkFaint,
                    fontWeight: FontWeight.w700,
                    fontSize: 10.5,
                  ),
            ),
            child: child,
          ),
          // The reading, between the dial's legs and under the needle's hub.
          child: Padding(
            padding: const EdgeInsets.fromLTRB(54, 136, 54, 0),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.topCenter,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text.rich(
                    TextSpan(children: [
                      TextSpan(text: number),
                      const TextSpan(
                        text: ' L',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _inkSoft),
                      ),
                    ]),
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: _ink,
                      height: 1.1,
                      shadows: [Shadow(color: Color(0x9938BDF8), blurRadius: 14)],
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    daysLine,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xD9BAE6FD)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DialPainter extends CustomPainter {
  _DialPainter({required this.fraction, required this.tone, required this.labelStyle});

  /// Where the needle is, 0 (empty) to 1 (10+ days).
  final double fraction;
  final _Tone tone;
  final TextStyle labelStyle;

  static const _width = 14.0;

  @override
  void paint(Canvas canvas, Size size) {
    const r = 86.0;
    final c = Offset(size.width / 2, 22 + r);
    final rect = Rect.fromCircle(center: c, radius: r);

    // A soft halo track behind the dial.
    canvas.drawArc(
      rect, _start, _sweep, false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 28
        ..strokeCap = StrokeCap.round
        ..color = const Color(0x0FFFFFFF),
    );

    // The zones, dimmed: red under 2 days, amber under 4, green beyond.
    const zones = [
      (0.0, 0.2, Color(0x52EF4444)),
      (0.2, 0.4, Color(0x52F59E0B)),
      (0.4, 1.0, Color(0x4710B981)),
    ];
    for (final (from, to, color) in zones) {
      canvas.drawArc(
        rect, _start + _sweep * from, _sweep * (to - from), false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = _width
          ..strokeCap = StrokeCap.butt
          ..color = color,
      );
    }

    // The lit part up to the needle, in the colour of the zone it is in.
    if (fraction > 0.004) {
      final shader = SweepGradient(
        colors: [tone.from, tone.to],
        startAngle: 0,
        endAngle: _sweep * fraction,
        transform: const GradientRotation(_start),
      ).createShader(rect);
      canvas.drawArc(
        rect, _start, _sweep * fraction, false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = _width + 6
          ..strokeCap = StrokeCap.round
          ..color = tone.glow
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 9),
      );
      canvas.drawArc(
        rect, _start, _sweep * fraction, false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = _width
          ..strokeCap = StrokeCap.round
          ..shader = shader,
      );
    }

    // Ticks every half day inside the arc, longer and brighter every 2 days,
    // with the day count outside.
    const steps = 20;
    for (var i = 0; i <= steps; i++) {
      final a = _start + _sweep * i / steps;
      final major = i % 4 == 0;
      final dir = Offset(math.cos(a), math.sin(a));
      const outer = r - _width / 2 - 4;
      final inner = outer - (major ? 10 : 4);
      canvas.drawLine(
        c + dir * inner,
        c + dir * outer,
        Paint()
          ..strokeWidth = major ? 2 : 1
          ..strokeCap = StrokeCap.round
          ..color = major ? const Color(0xD9FFFFFF) : const Color(0x59FFFFFF),
      );
      if (major) {
        final days = gaugeDays * i / steps;
        final text = TextPainter(
          text: TextSpan(text: days == gaugeDays ? '${days.round()}+ d' : '${days.round()} d', style: labelStyle),
          textDirection: TextDirection.ltr,
        )..layout();
        final at = c + dir * (r + _width / 2 + 13);
        text.paint(canvas, at - Offset(text.width / 2, text.height / 2));
      }
    }

    // The needle: tapered, white into sky blue, glowing.
    final a = _start + _sweep * fraction;
    const length = r - 16;
    canvas.save();
    canvas.translate(c.dx, c.dy);
    canvas.rotate(a);
    final needle = Path()
      ..moveTo(-12, -3.2)
      ..lineTo(length, -1)
      ..quadraticBezierTo(length + 2.5, 0, length, 1)
      ..lineTo(-12, 3.2)
      ..close();
    canvas.drawPath(
      needle,
      Paint()
        ..color = const Color(0xE67DD3FC)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );
    canvas.drawPath(
      needle,
      Paint()
        ..shader = const LinearGradient(colors: [_sky, Colors.white])
            .createShader(const Rect.fromLTWH(-12, -4, length + 14, 8)),
    );
    canvas.restore();

    // The hub.
    canvas.drawCircle(
      c, 12,
      Paint()
        ..color = const Color(0xCC7DD3FC)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 7),
    );
    canvas.drawCircle(c, 10, Paint()..color = const Color(0xFF0F172A));
    canvas.drawCircle(
      c, 10,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..color = _sky,
    );
  }

  @override
  bool shouldRepaint(_DialPainter old) =>
      old.fraction != fraction || old.tone != tone || old.labelStyle != labelStyle;
}

/// A rounded pill saying how worried to be, with a dot in the level's colour.
class CoverChip extends StatelessWidget {
  const CoverChip({super.key, required this.level});

  final CoverLevel level;

  @override
  Widget build(BuildContext context) {
    final tone = _tones[level]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        borderRadius: Radii.fullAll,
        color: tone.from.withValues(alpha: 0.16),
        border: Border.all(color: tone.to.withValues(alpha: 0.45)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: tone.to,
              boxShadow: [BoxShadow(color: tone.glow, blurRadius: 8, spreadRadius: 1)],
            ),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              coverLevelLabel(level),
              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: _ink, letterSpacing: 0.2),
            ),
          ),
        ],
      ),
    );
  }
}

/// A blurred light behind the glass.
class _Orb extends StatelessWidget {
  const _Orb({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) => ImageFiltered(
        imageFilter: ui.ImageFilter.blur(sigmaX: 36, sigmaY: 36),
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
      );
}

/// The dark panel with its glow and lights, shared by the hero and the banner.
class _Panel extends StatelessWidget {
  const _Panel({required this.level, required this.child});

  final CoverLevel level;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tone = _tones[level]!;
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: _panelRadius,
        boxShadow: [
          BoxShadow(color: tone.glow.withValues(alpha: 0.22), blurRadius: 36, spreadRadius: -6, offset: const Offset(0, 14)),
          const BoxShadow(color: Color(0x66020617), blurRadius: 16, offset: Offset(0, 8)),
        ],
      ),
      child: ClipRRect(
        borderRadius: _panelRadius,
        child: Stack(
          children: [
            const Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(gradient: _panelGradient))),
            const Positioned(top: -50, right: -40, child: _Orb(size: 170, color: Color(0x6638BDF8))),
            const Positioned(bottom: -60, left: -50, child: _Orb(size: 170, color: Color(0x4D2DD4BF))),
            Positioned(top: 40, left: -30, child: _Orb(size: 90, color: tone.from.withValues(alpha: 0.22))),
            // A hairline of light along the top edge, as on glass.
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: _panelRadius,
                  border: Border.all(color: const Color(0x24FFFFFF)),
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.center,
                    colors: [Color(0x14FFFFFF), Color(0x00FFFFFF)],
                  ),
                ),
              ),
            ),
            Padding(padding: const EdgeInsets.all(Space.lg), child: child),
          ],
        ),
      ),
    );
  }
}

/// A frosted tile on the panel.
class _GlassTile extends StatelessWidget {
  const _GlassTile({required this.icon, required this.tone, required this.label, required this.value});

  final IconData icon;
  final Color tone;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: Radii.cardAll,
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          padding: const EdgeInsets.all(Space.md),
          decoration: BoxDecoration(
            borderRadius: Radii.cardAll,
            border: Border.all(color: const Color(0x1FFFFFFF)),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [const Color(0x1AFFFFFF), tone.withValues(alpha: 0.08)],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: tone.withValues(alpha: 0.18),
                  boxShadow: [BoxShadow(color: tone.withValues(alpha: 0.35), blurRadius: 12)],
                ),
                child: Icon(icon, size: 16, color: tone),
              ),
              const SizedBox(height: Space.sm),
              Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: _inkFaint)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: _ink)),
            ],
          ),
        ),
      ),
    );
  }
}

/// The Stock tab's opening panel: the dial, how long the diesel lasts, and
/// the month in four frosted tiles.
class DieselStockHero extends StatelessWidget {
  const DieselStockHero({super.key, required this.state});

  final DieselState state;

  @override
  Widget build(BuildContext context) {
    final level = coverLevel(state.daysOfCover);
    final tiles = [
      _GlassTile(
        icon: Icons.history_rounded,
        tone: const Color(0xFF94A3B8),
        label: 'Brought forward',
        value: litresLabel(state.openingStock),
      ),
      _GlassTile(
        icon: Icons.shopping_cart_outlined,
        tone: const Color(0xFF34D399),
        label: 'Purchased',
        value: litresLabel(state.receivedThisMonth),
      ),
      _GlassTile(
        icon: Icons.local_gas_station_outlined,
        tone: const Color(0xFFFBBF24),
        label: 'Issued',
        value: litresLabel(state.issuedThisMonth),
      ),
      _GlassTile(
        icon: Icons.speed_rounded,
        tone: const Color(0xFF60A5FA),
        label: 'Average a day',
        value: state.dailyAverage == null ? '—' : litresLabel(state.dailyAverage!),
      ),
    ];
    return _Panel(
      level: level,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: Space.sm,
            runSpacing: Space.sm,
            children: [
              const Text(
                'DIESEL IN STOCK',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.4, color: _inkSoft),
              ),
              CoverChip(level: level),
            ],
          ),
          const SizedBox(height: Space.xs),
          Center(
            child: DieselGauge(litres: state.stockNow, days: state.daysOfCover, dailyAverage: state.dailyAverage),
          ),
          Text(
            _keepLastWords(coverText(
              dailyAverage: state.dailyAverage,
              daysOfCover: state.daysOfCover,
              windowDays: state.coverWindowDays,
              today: state.today,
            )),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _inkSoft, height: 1.35),
          ),
          const SizedBox(height: Space.lg),
          const Text(
            'THIS MONTH',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.4, color: _inkFaint),
          ),
          const SizedBox(height: Space.sm),
          // Two by two, each pair the height of the taller tile.
          for (var i = 0; i < tiles.length; i += 2) ...[
            if (i > 0) const SizedBox(height: Space.sm),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: tiles[i]),
                  const SizedBox(width: Space.sm),
                  Expanded(child: tiles[i + 1]),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// The Record tab's banner: the stock, how worried to be, and a bar of the
/// days left. Static, so it reads at a glance while the form is filled in.
class DieselStockBanner extends StatelessWidget {
  const DieselStockBanner({super.key, required this.state});

  final DieselState state;

  @override
  Widget build(BuildContext context) {
    final level = coverLevel(state.daysOfCover);
    final tone = _tones[level]!;
    final loading = state.isLoading && state.entries.isEmpty;
    final negative = state.stockNow < 0;
    final fill = state.daysOfCover == null ? 0.0 : (state.daysOfCover! / gaugeDays).clamp(0.0, 1.0);
    return _Panel(
      level: level,
      // Label over number, not beside it: at large system text a row squeezed
      // the label to one letter a line.
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _sky.withValues(alpha: 0.16),
                  boxShadow: [BoxShadow(color: _sky.withValues(alpha: 0.35), blurRadius: 12)],
                ),
                child: const Icon(Icons.local_gas_station_outlined, size: Sizes.iconInline, color: _sky),
              ),
              const SizedBox(width: Space.sm),
              const Flexible(
                child: Text('Diesel in stock',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: _inkSoft)),
              ),
            ],
          ),
          const SizedBox(height: Space.xs),
          Text(
            loading ? '…' : litresLabel(state.stockNow),
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: negative ? const Color(0xFFFCA5A5) : _ink,
              shadows: const [Shadow(color: Color(0x8038BDF8), blurRadius: 12)],
            ),
          ),
          if (!loading) ...[
            const SizedBox(height: Space.sm),
            CoverChip(level: level),
            const SizedBox(height: Space.md),
            // Days left, out of the dial's ten.
            Container(
              height: 8,
              decoration: const BoxDecoration(borderRadius: Radii.fullAll, color: Color(0x1AFFFFFF)),
              alignment: Alignment.centerLeft,
              child: FractionallySizedBox(
                widthFactor: fill,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: Radii.fullAll,
                    gradient: LinearGradient(colors: [tone.from, tone.to]),
                    boxShadow: [BoxShadow(color: tone.glow, blurRadius: 10)],
                  ),
                ),
              ),
            ),
            const SizedBox(height: Space.sm),
            Text(
              _keepLastWords(coverText(
                dailyAverage: state.dailyAverage,
                daysOfCover: state.daysOfCover,
                windowDays: state.coverWindowDays,
                today: state.today,
              )),
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: _inkFaint, height: 1.35),
            ),
          ],
        ],
      ),
    );
  }
}

/// A machine's month as a card: a coloured edge (green for our own, amber for
/// hired, as on the website), litres and fills, its share of all diesel issued as a glowing bar,
/// and where its burn figure came from.
class MachineUseCard extends StatelessWidget {
  const MachineUseCard({super.key, required this.use, required this.totalIssued});

  final MachineUse use;
  final double totalIssued;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // The website's colours: green into cyan for our own, amber into rose for hired.
    final accent = use.hired ? const Color(0xFFF59E0B) : const Color(0xFF10B981);
    final accentEnd = use.hired ? const Color(0xFFF43F5E) : const Color(0xFF06B6D4);
    final share = totalIssued > 0 ? (use.litres / totalIssued).clamp(0.0, 1.0) : 0.0;
    final burn = use.rate != null
        ? '${use.rate} L/${use.unit} · ${use.rateBasis}'
        : use.rateBasis.isEmpty
            ? (use.hired ? 'Hired · ${use.ownerName}' : 'Own')
            : 'Burn not known: ${use.rateBasis}';
    return Container(
      decoration: BoxDecoration(
        borderRadius: Radii.cardAll,
        color: theme.colorScheme.surfaceContainerLow,
        border: Border.all(color: accent.withValues(alpha: 0.28)),
        boxShadow: [
          BoxShadow(color: accent.withValues(alpha: 0.12), blurRadius: 18, offset: const Offset(0, 8)),
        ],
      ),
      child: ClipRRect(
        borderRadius: Radii.cardAll,
        child: Stack(
          children: [
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [accent.withValues(alpha: 0.12), accent.withValues(alpha: 0.0)],
                  ),
                ),
              ),
            ),
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              child: Container(
                width: 4,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [accent, accentEnd],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.md, Space.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: Space.sm,
                    runSpacing: Space.xs,
                    children: [
                      Text(use.name, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                      Text(
                        litresLabel(use.litres),
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800, color: accent),
                      ),
                    ],
                  ),
                  const SizedBox(height: Space.xs),
                  Text(burn, style: theme.textTheme.bodySmall),
                  const SizedBox(height: Space.sm),
                  Container(
                    height: 6,
                    alignment: Alignment.centerLeft,
                    decoration: BoxDecoration(
                      borderRadius: Radii.fullAll,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.08),
                    ),
                    child: FractionallySizedBox(
                      widthFactor: share,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: Radii.fullAll,
                          gradient: LinearGradient(colors: [accent, accentEnd]),
                          boxShadow: [BoxShadow(color: accent.withValues(alpha: 0.5), blurRadius: 8)],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: Space.xs),
                  Text(
                    '${use.fills} fill${use.fills == 1 ? '' : 's'} · ${(share * 100).round()}% of the diesel issued'
                    '${use.hired && use.ownerName != null ? ' · ${use.ownerName}' : ''}',
                    style: theme.textTheme.labelSmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
