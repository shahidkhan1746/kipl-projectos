import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/kipl_button.dart';
import '../../../shared/widgets/kipl_text_field.dart';
import '../../../core/project_info.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSubmitting = false;

  /// The endpoint the app will really call, shown under the sign-in form.
  ///
  /// A device that once saved `http://10.0.2.2:3000/api/v1` — the emulator's
  /// loopback alias — kept using it on a physical phone, where it cannot
  /// resolve, and every sign-in came back as a credentials failure. Nothing on
  /// screen said which server was being called, so the misconfiguration was
  /// invisible until somebody opened Server Configuration. Now it is on the
  /// login screen.
  String? _activeBaseUrl;

  @override
  void initState() {
    super.initState();
    _loadActiveBaseUrl();
  }

  Future<void> _loadActiveBaseUrl() async {
    final url = await ref.read(apiClientProvider).getBaseUrl();
    if (mounted) setState(() => _activeBaseUrl = url);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);

    final authNotifier = ref.read(authStateProvider.notifier);
    final success = await authNotifier.login(
      _emailController.text,
      _passwordController.text,
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (!success) {
        final error = ref.read(authStateProvider).error;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error?.toString() ?? 'Login failed. Please check credentials.'),
            backgroundColor: AppColors.red,
          ),
        );
      }
    }
  }

  Future<void> _showServerConfigSheet() async {
    final apiClient = ref.read(apiClientProvider);
    final currentUrl = await apiClient.getBaseUrl();
    final urlController = TextEditingController(text: currentUrl);

    // Held outside the builder so they survive the sheet's rebuilds.
    EndpointProbe? probe;
    var checking = false;

    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (sheetCtx, setSheetState) => SafeArea(
          child: SingleChildScrollView(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(sheetCtx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Server Endpoint Configuration',
                  style: TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textBase),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Select live cloud production or a local development environment:',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 16),
                KiplTextField(
                  controller: urlController,
                  label: 'API Base URL',
                  hint: kDefaultBaseUrl,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textMuted,
                          side: const BorderSide(color: AppColors.borderDim),
                        ),
                        onPressed: () {
                          setSheetState(() {
                            urlController.text = kDefaultBaseUrl;
                            probe = null;
                          });
                        },
                        child: const Text('Production', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textMuted,
                          side: const BorderSide(color: AppColors.borderDim),
                        ),
                        onPressed: () {
                          setSheetState(() {
                            urlController.text = 'http://10.0.2.2:3000/api/v1';
                            probe = null;
                          });
                        },
                        child: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Checking before saving turns "login failed" into a specific
                // answer: whether the address is the API, the website, or
                // nothing at all. It is the whole point of this sheet.
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.accent,
                    side: const BorderSide(color: AppColors.borderDim),
                  ),
                  icon: checking
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: AppColors.accent),
                        )
                      : const Icon(Icons.network_check, size: 16),
                  label: Text(
                    checking ? 'Checking — may take a minute…' : 'Check this address',
                    style: const TextStyle(fontSize: 12),
                  ),
                  onPressed: checking
                      ? null
                      : () async {
                          setSheetState(() {
                            checking = true;
                            probe = null;
                          });
                          final result =
                              await ApiClient.probeBaseUrl(urlController.text);
                          if (!sheetCtx.mounted) return;
                          setSheetState(() {
                            checking = false;
                            probe = result;
                          });
                        },
                ),
                if (probe != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.bgPage,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: probe!.ok ? AppColors.green : AppColors.red,
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          probe!.ok ? Icons.check_circle_outline : Icons.error_outline,
                          size: 16,
                          color: probe!.ok ? AppColors.green : AppColors.red,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            probe!.message,
                            style: const TextStyle(
                                fontSize: 11.5, color: AppColors.textMuted, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                KiplButton(
                  label: 'Save Endpoint',
                  onPressed: () async {
                    // Resolved before the await: the sheet is about to be
                    // popped, so the messenger cannot be looked up from a
                    // context afterwards.
                    final messenger = ScaffoldMessenger.of(context);
                    try {
                      await apiClient.setBaseUrl(urlController.text);
                      if (!sheetCtx.mounted) return;
                      Navigator.pop(sheetCtx);
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Server endpoint updated.')),
                      );
                    } on FormatException catch (error) {
                      if (!sheetCtx.mounted) return;
                      messenger.showSnackBar(
                        SnackBar(content: Text(error.message), backgroundColor: AppColors.red),
                      );
                    }
                  },
                ),
                const SizedBox(height: 4),
                TextButton(
                  style: TextButton.styleFrom(foregroundColor: AppColors.textMuted),
                  onPressed: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    await apiClient.clearBaseUrl();
                    if (!sheetCtx.mounted) return;
                    Navigator.pop(sheetCtx);
                    messenger.showSnackBar(
                      const SnackBar(content: Text('Reset to the built-in endpoint.')),
                    );
                  },
                  child: const Text(
                    'Forget saved endpoint',
                    style: TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    urlController.dispose();
    await _loadActiveBaseUrl();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPage,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Form(
                  key: _formKey,
                  child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo / Shield
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1F3352), Color(0xFF0F1E33)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.accent.withValues(alpha: 0.4), width: 1.5),
                      ),
                      child: const Icon(
                        Icons.engineering_rounded,
                        size: 38,
                        color: AppColors.accent,
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Brand name
                  const Text(
                    'KIPL ProjectOS',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textBase,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'M/S Khilari Infrastructure Pvt. Ltd.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.accent),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    '${ProjectInfo.schemeName} (${ProjectInfo.stpCapacity} STP Srinagar)',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: AppColors.textFaint),
                  ),

                  const SizedBox(height: 36),

                  // Email
                  KiplTextField(
                    controller: _emailController,
                    label: 'Official Email',
                    hint: 'name@kipl.com',
                    keyboardType: TextInputType.emailAddress,
                    prefixIcon: Icons.email_outlined,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Email is required';
                      if (!v.contains('@')) return 'Enter a valid email address';
                      return null;
                    },
                  ),

                  const SizedBox(height: 16),

                  // Password
                  KiplTextField(
                    controller: _passwordController,
                    label: 'Password',
                    hint: '••••••••',
                    isPassword: true,
                    prefixIcon: Icons.lock_outline,
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Password is required';
                      if (v.length < 6) return 'Password must be at least 6 characters';
                      return null;
                    },
                  ),

                  const SizedBox(height: 28),

                  // Sign In button
                  KiplButton(
                    label: 'Sign In to Field OS',
                    icon: Icons.login_rounded,
                    isLoading: _isSubmitting,
                    onPressed: _handleLogin,
                  ),

                  const SizedBox(height: 24),

                  // Server config link
                  Center(
                    child: TextButton.icon(
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.textMuted,
                      ),
                      icon: const Icon(Icons.settings_outlined, size: 14),
                      label: const Text('Server Configuration', style: TextStyle(fontSize: 12)),
                      onPressed: _showServerConfigSheet,
                    ),
                  ),

                  if (_activeBaseUrl != null) ...[
                    Center(
                      child: Text(
                        _activeBaseUrl!,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10.5,
                          color: ApiClient.isDeveloperOnlyHost(_activeBaseUrl!)
                              ? AppColors.red
                              : AppColors.textFaint,
                        ),
                      ),
                    ),
                    if (ApiClient.isDeveloperOnlyHost(_activeBaseUrl!))
                      const Padding(
                        padding: EdgeInsets.only(top: 4),
                        child: Text(
                          'This is a development address and cannot work on a '
                          'phone. Open Server Configuration and forget it.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 10.5, color: AppColors.red, height: 1.35),
                        ),
                      ),
                  ],
                ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
