/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Equipment QR Code Scanner Screen (`qr_scanner_screen.dart`).
 * Uses mobile_scanner to open the device camera and decode QR codes.
 * On detecting an AmmuNation equipment QR (format: "ammunation:product:<id>"),
 * opens StaffEquipmentScreen so the operator can verify the item and check it
 * out or back in without leaving the staff shell.
 *
 * IN SIMPLE WORDS:
 * The camera scanner page — point at a QR code on equipment and it pulls up that
 * item, who currently holds it, and the hand-over / take-back buttons.
 */

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/glass.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> with WidgetsBindingObserver {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    returnImage: false,
  );

  bool _hasScanned = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_controller.value.isInitialized) return;
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      _controller.stop();
    } else if (state == AppLifecycleState.resumed) {
      _controller.start();
    }
  }

  @override
  Future<void> dispose() async {
    WidgetsBinding.instance.removeObserver(this);
    await _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasScanned) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;

    final raw = barcode!.rawValue!;
    // Expected format: "ammunation:product:<uuid>"
    if (raw.startsWith('ammunation:product:')) {
      final productId = raw.replaceFirst('ammunation:product:', '').trim();
      if (productId.isNotEmpty) {
        setState(() => _hasScanned = true);
        _controller.stop();
        // The scanner only exists in the staff shell, so stay in it.
        context.push('/staff/equipment/$productId').then((_) {
          setState(() => _hasScanned = false);
          _controller.start();
        });
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Unrecognized QR: $raw'),
          backgroundColor: AppTheme.warning,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // A viewfinder is the one screen that stays dark — light chrome over the
    // camera feed would wash out the preview.
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: Colors.black,
        extendBodyBehindAppBar: true,
        body: Stack(
        children: [
          // ─── Camera View ───────────────────────────────────────────────
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),

          // ─── Scan Overlay ──────────────────────────────────────────────
          _ScanOverlay(),

          // ─── Floating controls ─────────────────────────────────────────
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Scan equipment tag',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  ValueListenableBuilder(
                    valueListenable: _controller,
                    builder: (_, state, __) {
                      final torchOn = state.torchState == TorchState.on;
                      return GlassIconButton(
                        icon: torchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                        foreground: torchOn ? AppTheme.warning : Colors.white,
                        onPressed: () => _controller.toggleTorch(),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // ─── Bottom Instruction ────────────────────────────────────────
          Positioned(
            bottom: 110,
            left: 0,
            right: 0,
            child: Center(
              child: GlassButton(
                label: 'Align the QR code in the frame',
                icon: Icons.qr_code_2_rounded,
                foreground: Colors.white,
              ),
            ),
          ),
        ],
        ),
      ),
    );
  }
}

// ─── Scan Frame Overlay ───────────────────────────────────────────────────────

class _ScanOverlay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final scanBoxSize = size.width * 0.65;
    final top = (size.height - scanBoxSize) / 2 - 60;
    final left = (size.width - scanBoxSize) / 2;

    return Stack(
      children: [
        // Dark overlay
        ColorFiltered(
          colorFilter: ColorFilter.mode(
            Colors.black.withOpacity(0.55),
            BlendMode.srcOut,
          ),
          child: Stack(
            children: [
              Container(decoration: const BoxDecoration(color: Colors.black, backgroundBlendMode: BlendMode.dstOut)),
              Positioned(
                top: top,
                left: left,
                child: Container(
                  width: scanBoxSize,
                  height: scanBoxSize,
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: Colors.red),
                ),
              ),
            ],
          ),
        ),
        // Scan frame corners
        Positioned(
          top: top,
          left: left,
          child: _ScanFrame(size: scanBoxSize),
        ),
      ],
    );
  }
}

class _ScanFrame extends StatelessWidget {
  final double size;
  const _ScanFrame({required this.size});

  @override
  Widget build(BuildContext context) {
    const cornerSize = 26.0;
    const borderWidth = 3.5;
    const color = Colors.white;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          // Top-left
          Positioned(top: 0, left: 0, child: _Corner(color: color, size: cornerSize, thickness: borderWidth, topLeft: true)),
          // Top-right
          Positioned(top: 0, right: 0, child: _Corner(color: color, size: cornerSize, thickness: borderWidth, topRight: true)),
          // Bottom-left
          Positioned(bottom: 0, left: 0, child: _Corner(color: color, size: cornerSize, thickness: borderWidth, bottomLeft: true)),
          // Bottom-right
          Positioned(bottom: 0, right: 0, child: _Corner(color: color, size: cornerSize, thickness: borderWidth, bottomRight: true)),
        ],
      ),
    );
  }
}

class _Corner extends StatelessWidget {
  final Color color;
  final double size;
  final double thickness;
  final bool topLeft;
  final bool topRight;
  final bool bottomLeft;
  final bool bottomRight;

  const _Corner({
    required this.color,
    required this.size,
    required this.thickness,
    this.topLeft = false,
    this.topRight = false,
    this.bottomLeft = false,
    this.bottomRight = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _CornerPainter(
          color: color,
          thickness: thickness,
          topLeft: topLeft,
          topRight: topRight,
          bottomLeft: bottomLeft,
          bottomRight: bottomRight,
        ),
      ),
    );
  }
}

class _CornerPainter extends CustomPainter {
  final Color color;
  final double thickness;
  final bool topLeft, topRight, bottomLeft, bottomRight;

  _CornerPainter({
    required this.color,
    required this.thickness,
    this.topLeft = false,
    this.topRight = false,
    this.bottomLeft = false,
    this.bottomRight = false,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color..strokeWidth = thickness..style = PaintingStyle.stroke..strokeCap = StrokeCap.round;
    if (topLeft) {
      canvas.drawLine(const Offset(0, 0), Offset(size.width, 0), paint);
      canvas.drawLine(const Offset(0, 0), Offset(0, size.height), paint);
    }
    if (topRight) {
      canvas.drawLine(Offset(0, 0), Offset(size.width, 0), paint);
      canvas.drawLine(Offset(size.width, 0), Offset(size.width, size.height), paint);
    }
    if (bottomLeft) {
      canvas.drawLine(Offset(0, 0), Offset(size.width, 0), paint);
      canvas.drawLine(Offset(0, 0), Offset(0, size.height), paint);
    }
    if (bottomRight) {
      canvas.drawLine(Offset(0, 0), Offset(size.width, 0), paint);
      canvas.drawLine(Offset(size.width, 0), Offset(size.width, size.height), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
