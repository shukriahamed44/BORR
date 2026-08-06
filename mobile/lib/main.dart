/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Application Entry Point and Root Widget (`main.dart`).
 * Bootstraps the Flutter app, initializes local notification channels,
 * registers global Providers (AuthProvider, NotificationProvider), and
 * mounts the GoRouter-based navigation tree with role-aware route guards.
 *
 * IN SIMPLE WORDS:
 * The starting file of the app — sets up the dark theme, providers,
 * routing, and launches the first screen.
 */

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/notifications/providers/notification_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Force portrait orientation
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Status bar style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const AmmuNationApp());
}

class AmmuNationApp extends StatefulWidget {
  const AmmuNationApp({super.key});

  @override
  State<AmmuNationApp> createState() => _AmmuNationAppState();
}

class _AmmuNationAppState extends State<AmmuNationApp> {
  final _auth = AuthProvider();
  final _notifications = NotificationProvider();
  late final _router = AppRouter.createRouter(_auth);

  @override
  void initState() {
    super.initState();
    // The router listens to _auth itself — it must be built once, not rebuilt on
    // every auth change, or the navigation stack resets under the user.
    _auth.addListener(_onAuthChanged);
  }

  void _onAuthChanged() {
    if (_auth.isAuthenticated) {
      _notifications.startPolling();
    } else {
      _notifications.reset();
    }
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    _auth.dispose();
    _notifications.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _auth),
        ChangeNotifierProvider.value(value: _notifications),
      ],
      child: MaterialApp.router(
        title: 'AmmuNation ERP',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        routerConfig: _router,
      ),
    );
  }
}
