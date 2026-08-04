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

class AmmuNationApp extends StatelessWidget {
  const AmmuNationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          final router = AppRouter.createRouter(auth);
          return MaterialApp.router(
            title: 'AmmuNation ERP',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.darkTheme,
            routerConfig: router,
          );
        },
      ),
    );
  }
}
