const FEATHERLESS_API_URL = 'https://api.featherless.ai/v1/chat/completions';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const DID_API_URL = 'https://api.d-id.com/talks';

interface ScriptGenerationInput {
  score: number;
  totalViolations: number;
  criticalIssues: number;
  keyFindings: string[];
  recommendations: string[];
  targetUrl: string;
}

interface VideoGenerationResult {
  videoUrl: string;
  status: 'COMPLETED' | 'FAILED';
  error?: string;
}

/**
 * Step 1: Generate a narrative script from scan summary
 */
export async function generateScanScript(input: ScriptGenerationInput): Promise<string> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  const model = process.env.FEATHERLESS_LARGE_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

  if (!apiKey) {
    throw new Error('FEATHERLESS_API_KEY not configured');
  }

  const prompt = `You are a professional financial and tech analyst creating a short, engaging video script for an accessibility audit report.

Audit Summary:
- Website: ${input.targetUrl}
- Accessibility Score: ${input.score}/100
- Total Violations: ${input.totalViolations}
- Critical Issues: ${input.criticalIssues}
- Key Findings: ${input.keyFindings.join('; ')}
- Recommendations: ${input.recommendations.join('; ')}

Task: Create a professional, engaging 60-90 second video script that:
1. Opens with the website name and score
2. Highlights 2-3 key findings in human-friendly language
3. Lists actionable recommendations
4. Closes with a call-to-action to implement fixes

Format as a natural spoken script (conversational but professional tone).
Output ONLY the script text, no prefixes or metadata.`;

  const response = await fetch(FEATHERLESS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Script generation failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as any;
  const script = data.choices?.[0]?.message?.content || '';

  return script.trim();
}

/**
 * Step 2: Generate audio from script using ElevenLabs
 */
export async function generateAudioFromScript(script: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  // Use a standard ElevenLabs voice (Rachel - pre-made voice that exists in all accounts)
  const voiceId = '21m00Tcm4TlvDq8ikWAM';
  const candidateModels = ['eleven_flash_v2_5', 'eleven_multilingual_v2'];

  try {
    let lastError = '';

    for (const modelId of candidateModels) {
      const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: script,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (response.ok) {
        // Return audio as base64 data URL
        const audioBuffer = await (response as any).buffer();
        const base64Audio = audioBuffer.toString('base64');
        return `data:audio/mpeg;base64,${base64Audio}`;
      }

      const errorText = await response.text();
      lastError = `[${modelId}] ${response.status} ${errorText}`;
    }

    throw new Error(`ElevenLabs TTS failed for all candidate models: ${lastError}`);
  } catch (error) {
    throw new Error(
      `Audio generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Step 3: Generate talking avatar video using D-ID
 */
export async function generateDIDVideo(
  script: string,
  audioUrl?: string
): Promise<{ videoId: string; videoUrl: string }> {
  const apiKey = process.env.D_ID_API_KEY;
  const sourceUrl =
    process.env.D_ID_SOURCE_URL ||
    'https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/v1_image.jpeg';

  if (!apiKey) {
    throw new Error('D_ID_API_KEY not configured');
  }

  try {
    // D-ID API requires the credentials as authorization.
    // First try using the pre-generated ElevenLabs audio directly; if not accepted,
    // gracefully fall back to D-ID text synthesis so generation can still proceed.
    const authHeader = `Basic ${Buffer.from(apiKey).toString('base64')}`;
    const basePayload = {
      source_url: sourceUrl,
      config: {
        fluent: true,
        pad: 0,
        align: 'center',
        idle_frame: 0,
        stitch: true,
      },
    };

    let sessionData: any;

    if (audioUrl) {
      const audioResponse = await fetch(DID_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          ...basePayload,
          script: {
            type: 'audio',
            audio_url: audioUrl,
          },
        }),
      });

      if (audioResponse.ok) {
        sessionData = (await audioResponse.json()) as any;
      } else {
        const audioErrorText = await audioResponse.text();
        console.warn(
          `D-ID audio mode rejected, falling back to text mode: ${audioResponse.status} ${audioErrorText}`
        );
      }
    }

    if (!sessionData) {
      const textResponse = await fetch(DID_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          ...basePayload,
          script: {
            type: 'text',
            input: script,
          },
        }),
      });

      if (!textResponse.ok) {
        const textErrorText = await textResponse.text();
        throw new Error(`D-ID session creation failed (text mode): ${textResponse.status} ${textErrorText}`);
      }

      sessionData = (await textResponse.json()) as any;
    }

    const videoId = sessionData.id;

    // Poll for video completion
    let videoUrl = '';
    let attempts = 0;
    const maxAttempts = 120; // Up to 10 minutes with 5s intervals

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(`${DID_API_URL}/${videoId}`, {
        headers: {
          Authorization: authHeader,
        },
      });

      if (statusResponse.ok) {
        const statusData = (await statusResponse.json()) as any;

        if (statusData.status === 'done') {
          videoUrl = statusData.result_url;
          break;
        } else if (statusData.status === 'error' || statusData.status === 'failed') {
          throw new Error(`D-ID video generation failed: ${statusData.error || 'Unknown error'}`);
        }
      }

      attempts++;
    }

    if (!videoUrl) {
      throw new Error('D-ID video generation timeout (10+ minutes)');
    }

    return { videoId, videoUrl };
  } catch (error) {
    throw new Error(
      `Video generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Main orchestration: Generate full video pipeline (Featherless → ElevenLabs → D-ID)
 */
export async function generateReportVideo(
  scanInput: ScriptGenerationInput
): Promise<VideoGenerationResult> {
  try {
    console.log(`📝 Generating script with Featherless for ${scanInput.targetUrl}...`);
    const script = await generateScanScript(scanInput);

    let audioUrl: string | undefined;
    try {
      console.log(`🎙️ Generating audio with ElevenLabs...`);
      audioUrl = await generateAudioFromScript(script);
    } catch (audioError) {
      const audioErrorMsg = audioError instanceof Error ? audioError.message : String(audioError);
      console.warn(`ElevenLabs audio generation failed; continuing with D-ID text mode: ${audioErrorMsg}`);
    }

    console.log(`🎬 Generating D-ID avatar video...`);
    const { videoUrl } = await generateDIDVideo(script, audioUrl);

    console.log(`✅ Video generation completed: ${videoUrl}`);

    return {
      videoUrl,
      status: 'COMPLETED',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Video generation failed: ${errorMsg}`);

    return {
      videoUrl: '',
      status: 'FAILED',
      error: errorMsg,
    };
  }
}
