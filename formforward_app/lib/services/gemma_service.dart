import 'dart:convert';
import 'package:http/http.dart' as http;

/// Service for communicating with local Ollama Gemma 4 instance.
/// Mirrors the web app's /api/gemma proxy.
class GemmaService {
  final String baseUrl;

  GemmaService({this.baseUrl = 'http://localhost:5173'});

  /// Send a coaching prompt to Gemma via the FormForward server proxy.
  Future<Map<String, dynamic>?> chat(String prompt, {Map<String, dynamic>? visionPayload}) async {
    try {
      final body = <String, dynamic>{
        'model': 'gemma4:latest',
        'prompt': prompt,
        'stream': false,
      };

      if (visionPayload != null) {
        body['vision'] = visionPayload;
      }

      final response = await http.post(
        Uri.parse('$baseUrl/api/gemma'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Check if the Gemma backend is reachable.
  Future<bool> healthCheck() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/health'));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
