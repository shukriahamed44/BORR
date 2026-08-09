/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Login Screen — JWT Authentication Entry Point (`login_screen.dart`).
 * Renders the BORR brand header over a frosted credential sheet, delegates to
 * AuthProvider.login(), and surfaces inline validation and API errors. On success
 * GoRouter's redirect navigates by role.
 *
 * IN SIMPLE WORDS:
 * The sign-in page — brand banner on top, frosted glass form below, where users
 * enter email and password to get in.
 */

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/glass.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    await context.read<AuthProvider>().login(
          _emailController.text.trim(),
          _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
      child: Scaffold(
        body: Stack(
          children: [
            // ─── Brand header ─────────────────────────────────────────────
            const _BrandHeader(),

            // ─── Credential sheet ─────────────────────────────────────────
            SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 150, 20, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    GlassPanel(
                      padding: const EdgeInsets.fromLTRB(22, 26, 22, 26),
                      radius: AppTheme.radiusLg,
                      fill: AppTheme.glassFillStrong,
                      shadow: AppTheme.shadowLifted,
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text('Welcome back',
                                style: Theme.of(context).textTheme.headlineLarge),
                            const SizedBox(height: 6),
                            Text(
                              'Sign in to manage your rentals.',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            const SizedBox(height: 26),

                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              autocorrect: false,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                                hintText: 'you@example.com',
                                prefixIcon: Icon(Icons.alternate_email_rounded,
                                    color: AppTheme.textMuted, size: 20),
                              ),
                              validator: (v) =>
                                  (v?.isEmpty ?? true) ? 'Email is required' : null,
                            ),
                            const SizedBox(height: 14),

                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _handleLogin(),
                              decoration: InputDecoration(
                                labelText: 'Password',
                                hintText: '••••••••',
                                prefixIcon: const Icon(Icons.lock_outline_rounded,
                                    color: AppTheme.textMuted, size: 20),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                    color: AppTheme.textMuted,
                                    size: 20,
                                  ),
                                  onPressed: () => setState(
                                      () => _obscurePassword = !_obscurePassword),
                                ),
                              ),
                              validator: (v) =>
                                  (v?.isEmpty ?? true) ? 'Password is required' : null,
                            ),

                            const SizedBox(height: 20),

                            Consumer<AuthProvider>(
                              builder: (_, auth, __) {
                                if (auth.errorMessage == null) {
                                  return const SizedBox.shrink();
                                }
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 16),
                                  padding: const EdgeInsets.all(13),
                                  decoration: BoxDecoration(
                                    color: AppTheme.danger.withOpacity(0.08),
                                    borderRadius:
                                        BorderRadius.circular(AppTheme.radiusSm),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.error_outline_rounded,
                                          color: AppTheme.danger, size: 18),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          auth.errorMessage!,
                                          style: const TextStyle(
                                              color: AppTheme.danger, fontSize: 13),
                                        ),
                                      ),
                                    ],
                                  ),
                                ).animate().fadeIn().slideY(begin: -0.15, end: 0);
                              },
                            ),

                            Consumer<AuthProvider>(
                              builder: (_, auth, __) => PrimaryButton(
                                label: 'Sign In',
                                loading: auth.isLoading,
                                onPressed: _handleLogin,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                        .animate()
                        .fadeIn(duration: 500.ms)
                        .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic),

                    const SizedBox(height: 18),
                    const _DemoCredentials()
                        .animate(delay: 500.ms)
                        .fadeIn(duration: 400.ms),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 300,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.primaryLight, AppTheme.primary, AppTheme.primaryDark],
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(top: 26),
          child: Column(
            children: [
              Image.asset('assets/images/mainLogo.png', width: 132)
                  .animate()
                  .fadeIn(duration: 500.ms)
                  .slideY(begin: -0.2, end: 0),
              const SizedBox(height: 8),
              const Text(
                'BORROW BIG. OWN SMALL.',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.6,
                ),
              ).animate(delay: 200.ms).fadeIn(),
            ],
          ),
        ),
      ),
    );
  }
}

class _DemoCredentials extends StatelessWidget {
  const _DemoCredentials();

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.key_rounded, size: 14, color: AppTheme.textMuted),
              const SizedBox(width: 6),
              Text('Demo accounts · Password123!',
                  style: Theme.of(context).textTheme.labelSmall),
            ],
          ),
          const SizedBox(height: 10),
          const _CredRow('Customer', 'customer@ammunation.com'),
          const _CredRow('Staff', 'staff@ammunation.com'),
          const _CredRow('Admin', 'admin@ammunation.com'),
        ],
      ),
    );
  }
}

class _CredRow extends StatelessWidget {
  final String role;
  final String email;
  const _CredRow(this.role, this.email);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          SizedBox(
            width: 74,
            child: Text(
              role,
              style: const TextStyle(
                color: AppTheme.primary,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Text(email,
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12.5)),
        ],
      ),
    );
  }
}
