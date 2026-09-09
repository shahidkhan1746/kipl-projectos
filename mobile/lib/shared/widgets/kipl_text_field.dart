import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// A labelled text field.
///
/// The visual half of this widget used to redeclare fill, padding, radius and
/// all four border states inline — the same nine lines the theme now supplies —
/// which is why the fields drifted from every other control in the app. That is
/// all gone; `InputDecorationTheme` handles it, and the field stays correct in
/// both themes for free.
///
/// The functional half was the real defect. The field carried no
/// [textInputAction], no [autofillHints], no focus node and no submit handler,
/// so on the login screen — the first thing every user touches — the keyboard's
/// Next key did nothing, Done did nothing, and no password manager could offer
/// to fill it. Those are one-line properties that were simply never passed.
class KiplTextField extends StatefulWidget {
  const KiplTextField({
    super.key,
    required this.controller,
    required this.label,
    this.hint,
    this.helper,
    this.isPassword = false,
    this.keyboardType = TextInputType.text,
    this.prefixIcon,
    this.validator,
    this.maxLines = 1,
    this.readOnly = false,
    this.enabled = true,
    this.onTap,
    this.onChanged,
    this.focusNode,
    this.textInputAction,
    this.onSubmitted,
    this.autofillHints,
    this.textCapitalization = TextCapitalization.none,
  });

  final TextEditingController controller;
  final String label;
  final String? hint;

  /// Shown under the field. Set it only when it earns its line — a format
  /// requirement, a unit. Restating the label helps nobody.
  final String? helper;

  final bool isPassword;
  final TextInputType keyboardType;
  final IconData? prefixIcon;
  final String? Function(String?)? validator;
  final int maxLines;
  final bool readOnly;
  final bool enabled;
  final VoidCallback? onTap;
  final ValueChanged<String>? onChanged;

  /// Pass this and [textInputAction] together to build a focus order: give
  /// each field a node, mark all but the last `TextInputAction.next`, and move
  /// focus in [onSubmitted].
  final FocusNode? focusNode;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;

  /// e.g. `[AutofillHints.username]`. Without these the platform's saved
  /// credentials and password managers have nothing to match on.
  final Iterable<String>? autofillHints;

  /// Names take [TextCapitalization.words], free-text remarks take
  /// [TextCapitalization.sentences]. It saves a shift key on a phone held in
  /// one hand, which on this app is most of the time.
  final TextCapitalization textCapitalization;

  @override
  State<KiplTextField> createState() => _KiplTextFieldState();
}

class _KiplTextFieldState extends State<KiplTextField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // A multiline field has to declare TextInputType.multiline. Flutter
    // asserts on the exact combination of maxLines > 1, an unset
    // TextInputType and TextInputAction.newline — and the action defaulted to
    // newline just below, so defaulting the two independently built a field
    // that threw the moment it was laid out. Sixteen fields across five
    // screens (Materials, Site Orders, QA, Fleet, Diary) hit it; nothing in
    // `flutter analyze` can see it, because both halves are individually
    // legal.
    final isMultiline = widget.maxLines > 1 && !widget.isPassword;
    final keyboardType =
        isMultiline && widget.keyboardType == TextInputType.text
            ? TextInputType.multiline
            : widget.keyboardType;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: theme.textTheme.titleSmall),
        const SizedBox(height: Space.sm),
        TextFormField(
          controller: widget.controller,
          focusNode: widget.focusNode,
          enabled: widget.enabled,
          obscureText: widget.isPassword && _obscure,
          keyboardType: keyboardType,
          textCapitalization: widget.textCapitalization,
          // Default the last field to "done" rather than leaving the key inert.
          textInputAction: widget.textInputAction ??
              (isMultiline ? TextInputAction.newline : TextInputAction.done),
          onFieldSubmitted: widget.onSubmitted,
          autofillHints: widget.autofillHints,
          validator: widget.validator,
          // Validate as they correct a rejected field, not only on submit —
          // otherwise a typo is only reported after another round trip.
          autovalidateMode: AutovalidateMode.onUserInteraction,
          maxLines: widget.isPassword ? 1 : widget.maxLines,
          readOnly: widget.readOnly,
          onTap: widget.onTap,
          onChanged: widget.onChanged,
          // A password field must never be autocorrected or added to the
          // keyboard's learned dictionary.
          autocorrect: !widget.isPassword,
          enableSuggestions: !widget.isPassword,
          style: theme.textTheme.bodyMedium,
          decoration: InputDecoration(
            hintText: widget.hint,
            helperText: widget.helper,
            prefixIcon: widget.prefixIcon == null
                ? null
                : Icon(widget.prefixIcon, size: Sizes.icon),
            suffixIcon: widget.isPassword
                ? IconButton(
                    icon: Icon(
                      _obscure
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: Sizes.icon,
                    ),
                    tooltip: _obscure ? 'Show password' : 'Hide password',
                    onPressed: () => setState(() => _obscure = !_obscure),
                  )
                : null,
          ),
        ),
      ],
    );
  }
}
