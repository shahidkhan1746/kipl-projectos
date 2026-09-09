import 'package:flutter/material.dart';

/// Geometry, rhythm and timing for the whole app.
///
/// These exist because the app previously carried 17 distinct spacing values
/// (including 2, 3, 5, 7, 13, 18 and 36) and 11 distinct corner radii. Nothing
/// was wrong with any single one of them; the problem was that no two screens
/// agreed, so the interface read as assembled rather than designed.
///
/// Anything not on these scales needs a reason.
class Space {
  const Space._();

  /// Hairline gaps: icon to its label, badge padding.
  static const xs = 4.0;

  /// Inside a row — between stacked lines of the same thought.
  static const sm = 8.0;

  /// Between related elements.
  static const md = 12.0;

  /// The default. Screen gutter, card padding, gap between list rows.
  static const lg = 16.0;

  /// Between a section and the next one.
  static const xl = 20.0;

  /// Between major blocks.
  static const xxl = 24.0;

  /// Above a screen's first element, below its last.
  static const huge = 32.0;

  /// Empty-state breathing room.
  static const giant = 40.0;

  /// The horizontal inset every screen uses. Consistency here is most of what
  /// makes a set of screens feel like one app.
  static const gutter = lg;
}

/// Four radii, down from eleven.
class Radii {
  const Radii._();

  /// Badges and small tags.
  static const badge = Radius.circular(4);

  /// Fields, buttons, anything the finger presses.
  static const control = Radius.circular(8);

  /// Cards and sheets' inner surfaces.
  static const card = Radius.circular(12);

  /// Bottom sheets — top corners only.
  static const sheet = Radius.circular(20);

  /// Pills, avatars, progress tracks.
  static const full = Radius.circular(999);

  static const badgeAll = BorderRadius.all(badge);
  static const controlAll = BorderRadius.all(control);
  static const cardAll = BorderRadius.all(card);
  static const fullAll = BorderRadius.all(full);
  static const sheetTop = BorderRadius.vertical(top: sheet);
}

/// Fixed sizes that must not drift.
class Sizes {
  const Sizes._();

  /// Material's minimum touch target. Anything tappable clears this, even when
  /// its visible box is smaller.
  static const touchTarget = 48.0;

  /// Buttons and text fields share a height so a form reads as one column.
  static const control = 48.0;

  /// Inline with text — a meta row, a badge.
  static const iconInline = 16.0;

  /// Standing on its own — a list row's leading icon.
  static const icon = 20.0;

  /// An action the finger presses.
  static const iconAction = 24.0;

  /// Empty and error states.
  static const iconState = 40.0;

  /// The hairline that separates surfaces. Elevation is reserved for things
  /// that genuinely float (sheets, dialogs, menus); everything else is
  /// separated by tone and this line.
  static const hairline = 1.0;
}

/// Short, and in service of comprehension.
///
/// Anything longer than [enter] on a screen a worker opens thirty times a day
/// stops being feedback and starts being a wait.
class Motion {
  const Motion._();

  /// A press, a colour change, a checkbox.
  static const micro = Duration(milliseconds: 120);

  /// The default: expand, collapse, swap.
  static const standard = Duration(milliseconds: 200);

  /// Content arriving for the first time.
  static const enter = Duration(milliseconds: 320);

  static const curve = Curves.easeOutCubic;
}
