// Textured-wall surface: domain-warped fractal noise (plaster / troweled
// concrete feel) with a fine pore speckle on top. Subtlety is controlled by
// the fill's opacity; broad mottling gives the "wall" character.

/**
 * @resolution
 */
uniform vec2 u_resolution;

/**
 * @label Texture scale
 * @default 1.0
 * @range 0.3, 3.0
 */
uniform float u_scale;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 6; i++) {
    v += amp * vnoise(p);
    p = p * 2.0 + vec2(11.7, 3.1);
    amp *= 0.5;
  }
  return v;
}

void main() {
  // Broad wall-scale features (tens of px), warped for an organic plaster look.
  vec2 uv = gl_FragCoord.xy / (95.0 * u_scale);
  vec2 q = vec2(fbm(uv), fbm(uv + vec2(5.2, 1.3)));
  float base = fbm(uv + 0.85 * q);

  // Fine pore speckle layered on top.
  float speck = vnoise(gl_FragCoord.xy * 0.9);
  float n = mix(base, speck, 0.16);

  // Soft, low-contrast like a painted wall.
  n = clamp(0.5 + (n - 0.5) * 0.85, 0.0, 1.0);
  gl_FragColor = vec4(vec3(n), 1.0);
}
