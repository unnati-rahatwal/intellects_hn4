export interface SecurityHeadersResult {
  hasCSP: boolean;
  hasHSTS: boolean;
  hasXFrameOptions: boolean;
  hasXContentTypeOptions: boolean;
  hasMixedContent: boolean;
  rawHeaders: Record<string, string>;
  missingHeaders: string[];
  score: number;
}

const SECURITY_HEADERS_CHECKLIST = [
  { name: 'content-security-policy', label: 'Content-Security-Policy', weight: 25 },
  { name: 'strict-transport-security', label: 'Strict-Transport-Security (HSTS)', weight: 25 },
  { name: 'x-frame-options', label: 'X-Frame-Options', weight: 15 },
  { name: 'x-content-type-options', label: 'X-Content-Type-Options', weight: 15 },
  { name: 'referrer-policy', label: 'Referrer-Policy', weight: 10 },
  { name: 'permissions-policy', label: 'Permissions-Policy', weight: 10 },
];

export function analyzeSecurityHeaders(
  headers: Record<string, string>
): SecurityHeadersResult {
  const lowerHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = value;
  }

  const missingHeaders: string[] = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const check of SECURITY_HEADERS_CHECKLIST) {
    totalWeight += check.weight;
    if (lowerHeaders[check.name]) {
      earnedWeight += check.weight;
    } else {
      missingHeaders.push(check.label);
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return {
    hasCSP: !!lowerHeaders['content-security-policy'],
    hasHSTS: !!lowerHeaders['strict-transport-security'],
    hasXFrameOptions: !!lowerHeaders['x-frame-options'],
    hasXContentTypeOptions: !!lowerHeaders['x-content-type-options'],
    hasMixedContent: false, // Would need network interception to detect
    rawHeaders: lowerHeaders,
    missingHeaders,
    score,
  };
}

export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Block private IPs and localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)
    ) {
      return true;
    }

    // Block non-HTTP protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

export async function extractSecurityContext(page: any) {
  try {
     const data = await page.evaluate(() => {
        const getStorage = (storage: Storage) => {
           const map: Record<string, string> = {};
           try {
             for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key) map[key] = storage.getItem(key) || '';
             }
           } catch (e) {}
           return map;
        };

        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
           action: f.action || '',
           method: f.method || 'get',
           inputs: Array.from(f.querySelectorAll('input, select, textarea')).map((el: any) => ({
              name: el.name || '',
              type: el.type || el.tagName.toLowerCase(),
              id: el.id || ''
           }))
        }));

        const scripts = Array.from(document.querySelectorAll('script'))
           .map(s => s.src ? `[External JS: ${s.src}]` : `[Inline]: ${s.innerHTML.substring(0, 1000)}`)
           .filter(Boolean);

        return {
           localStorage: getStorage(window.localStorage),
           sessionStorage: getStorage(window.sessionStorage),
           forms,
           scripts: scripts.slice(0, 30) // limit size to first 30 scripts to avoid overwhelming context window
        };
     });
     
     const cookies = await page.context().cookies(page.url());

     return { ...data, cookies };
  } catch(e) {
     return null;
  }
}
