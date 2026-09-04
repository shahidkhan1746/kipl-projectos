import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/kipl_button.dart';
import '../../../shared/widgets/kipl_text_field.dart';

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

    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
          child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Server Endpoint Configuration',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textBase),
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
              hint: 'https://kiplstpsrinagar.com/api/v1',
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
                      urlController.text = kDefaultBaseUrl;
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
                      urlController.text = 'http://10.0.2.2:3000/api/v1';
                    },
                    child: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 12)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            KiplButton(
              label: 'Save Endpoint',
              onPressed: () async {
                try {
                  await apiClient.setBaseUrl(urlController.text);
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Server endpoint updated.')),
                  );
                } on FormatException catch (error) {
                  if (!ctx.mounted) return;
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(content: Text(error.message), backgroundColor: AppColors.red),
                  );
                }
              },
            ),
            ],
          ),
        ),
      ),
    );
    urlController.dispose();
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
                    'Dal Lake Sewerage Scheme (38.5 MLD STP Srinagar)',
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
