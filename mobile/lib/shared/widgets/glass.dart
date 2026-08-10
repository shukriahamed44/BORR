/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Shared BORR surface primitives (`glass.dart`).
 * Reusable presentation widgets shared by every screen — frosted glass panels
 * backed by BackdropFilter, the standard white content card, pill status badges,
 * section headers and the empty/error placeholders.
 *
 * IN SIMPLE WORDS:
 * The building blocks of the look: frosted-glass bars and buttons, white rounded
 * cards, and the little status pills. Written once, used everywhere.
 */

import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';

/// A frosted panel: blurs whatever sits behind it, then lays a translucent
/// white film and hairline highlight on top. The app's signature surface.
class GlassPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final double blur;
  final Color? fill;
  final bool border;
  final List<BoxShadow>? shadow;

  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = AppTheme.radiusMd,
    this.blur = AppTheme.glassBlur,
    this.fill,
    this.border = true,
    this.shadow,
  });

  @override
  Widget build(BuildContext context) {
    final shape = BorderRadius.circular(radius);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: shape,
        boxShadow: shadow ?? AppTheme.shadowSoft,
      ),
      child: ClipRRect(
        borderRadius: shape,
        // The blur must be clipped, or it bleeds past the rounded corners.
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              color: fill ?? AppTheme.glassFill,
              borderRadius: shape,
              border: border
                  ? Border.all(color: AppTheme.glassBorder, width: 1)
                  : null,
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Opaque white content card — the workhorse for lists and detail sections.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;
  final Color? color;
  final Border? border;

  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = AppTheme.radiusMd,
    this.onTap,
    this.color,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    final shape = BorderRadius.circular(radius);
    return DecoratedBox(
      decoration: BoxDecoration(borderRadius: shape, boxShadow: AppTheme.shadowSoft),
      child: Material(
        color: color ?? AppTheme.bgSurface,
        borderRadius: shape,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            padding: padding,
            decoration: BoxDecoration(borderRadius: shape, border: border),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Full-width primary action with the brand glow beneath it.
class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final Color? color;

  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.loading = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        boxShadow: enabled ? AppTheme.shadowPrimary : null,
      ),
      child: ElevatedButton(
        onPressed: enabled ? onPressed : null,
        style: color == null ? null : ElevatedButton.styleFrom(backgroundColor: color),
        child: loading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 8)],
                  Text(label),
                ],
              ),
      ),
    );
  }
}

/// Frosted pill button — used over imagery and inside glass bars.
class GlassButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final Color? foreground;

  const GlassButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.foreground,
  });

  @override
  Widget build(BuildContext context) {
    final fg = foreground ?? AppTheme.textPrimary;
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppTheme.radiusPill),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: AppTheme.glassBlur, sigmaY: AppTheme.glassBlur),
        child: Material(
          color: AppTheme.glassFillStrong,
          child: InkWell(
            onTap: onPressed,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                border: Border.all(color: AppTheme.glassBorder),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[Icon(icon, size: 16, color: fg), const SizedBox(width: 7)],
                  Text(
                    label,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: fg),
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

/// Circular frosted icon button — back, share, torch, refresh.
class GlassIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color? foreground;
  final double size;

  const GlassIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.foreground,
    this.size = 38,
  });

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: AppTheme.glassBlur, sigmaY: AppTheme.glassBlur),
        child: Material(
          color: AppTheme.glassFillStrong,
          child: InkWell(
            onTap: onPressed,
            child: SizedBox(
              width: size,
              height: size,
              child: Icon(icon, size: 18, color: foreground ?? AppTheme.textPrimary),
            ),
          ),
        ),
      ),
    );
  }
}

/// Tinted capsule for reservation / payment status.
class StatusPill extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;

  const StatusPill({super.key, required this.label, required this.color, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 12, color: color), const SizedBox(width: 5)],
          Text(
            label,
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }
}

/// Section title with an optional trailing action, matching the reference layout.
class SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SectionHeader({super.key, required this.title, this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: Theme.of(context).textTheme.headlineSmall),
        if (actionLabel != null)
          GestureDetector(
            onTap: onAction,
            child: Text(
              actionLabel!,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: AppTheme.primary,
              ),
            ),
          ),
      ],
    );
  }
}

/// Equipment photo on the tinted gradient the app used before images existed.
/// Falls back to that same gradient + glyph while loading, on a missing
/// `imageUrl`, or when the file is not on the server.
class ProductImage extends StatelessWidget {
  final String? imageUrl;
  final double glyphSize;

  const ProductImage({super.key, required this.imageUrl, this.glyphSize = 44});

  @override
  Widget build(BuildContext context) {
    final url = AppConstants.assetUrl(imageUrl);
    final placeholder = DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFEFF4FF), Color(0xFFE3ECFB)],
        ),
      ),
      child: Center(
        child: Icon(Icons.handyman_rounded,
            size: glyphSize, color: AppTheme.primary.withOpacity(0.55)),
      ),
    );

    if (url == null) return SizedBox.expand(child: placeholder);

    return SizedBox.expand(
      child: Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => placeholder,
        loadingBuilder: (_, child, progress) =>
            progress == null ? child : placeholder,
      ),
    );
  }
}

/// Shared empty / error placeholder so no screen invents its own.
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(color: AppTheme.bgElevated, shape: BoxShape.circle),
              child: Icon(icon, color: AppTheme.textMuted, size: 30),
            ),
            const SizedBox(height: 18),
            Text(title, style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
            if (message != null) ...[
              const SizedBox(height: 6),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            if (actionLabel != null) ...[
              const SizedBox(height: 20),
              SizedBox(
                width: 180,
                child: PrimaryButton(label: actionLabel!, onPressed: onAction),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
