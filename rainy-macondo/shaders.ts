
/**
 * Standard p5.js vertex shader
 * Uses standard matrices to map p5 geometry to clip space correctly.
 */
export const VERT_SHADER = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;

varying vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}
`;

/**
 * Rain on foggy glass shader.
 * Effect: Glass is foggy/blurred, raindrops sliding down "wipe away" the fog,
 * revealing clear text underneath. Like wiping condensation off a window.
 */
export const FRAG_SHADER = `
precision highp float;

varying vec2 vTexCoord;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2 u_resolution;

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Random function
float N21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}

// ============================================
// BLUR FUNCTION (for foggy glass effect)
// ============================================

// 9-tap Gaussian blur
vec3 blur9(vec2 uv, float radius) {
    vec3 col = vec3(0.0);

    // Center weight
    col += texture2D(u_texture, uv).rgb * 0.25;

    // Cross samples (4 directions)
    col += texture2D(u_texture, uv + vec2(radius, 0.0)).rgb * 0.125;
    col += texture2D(u_texture, uv - vec2(radius, 0.0)).rgb * 0.125;
    col += texture2D(u_texture, uv + vec2(0.0, radius)).rgb * 0.125;
    col += texture2D(u_texture, uv - vec2(0.0, radius)).rgb * 0.125;

    // Diagonal samples
    col += texture2D(u_texture, uv + vec2(radius, radius) * 0.7).rgb * 0.0625;
    col += texture2D(u_texture, uv + vec2(-radius, radius) * 0.7).rgb * 0.0625;
    col += texture2D(u_texture, uv + vec2(radius, -radius) * 0.7).rgb * 0.0625;
    col += texture2D(u_texture, uv + vec2(-radius, -radius) * 0.7).rgb * 0.0625;

    return col;
}

// Stronger blur with more samples
vec3 blur13(vec2 uv, float radius) {
    vec3 col = blur9(uv, radius);
    // Add outer ring for more blur
    col = col * 0.7 + blur9(uv, radius * 1.8) * 0.3;
    return col;
}

// ============================================
// RAIN DROP LAYER
// ============================================

// Calculate drop velocity for elliptical deformation
float getDropVelocity(float t_col) {
    float inner = sin(t_col) * 0.5;
    float mid = sin(t_col + inner);
    return cos(t_col + mid) * (1.0 + cos(t_col + inner) * (1.0 + cos(t_col) * 0.5));
}

// Rain drop layer - returns vec3(distortion.xy, clearMask)
vec3 layer(vec2 uv, float t, float density) {
    vec2 aspect = vec2(2.0, 1.0);
    vec2 uv2 = uv * aspect * density;

    vec2 id = floor(uv2);
    vec2 n = fract(uv2) - 0.5;

    // Random timing per column
    float t_col = t + N21(id.xx) * 6.28;

    // Drop position (hanging then falling motion)
    float y = -sin(t_col + sin(t_col + sin(t_col) * 0.5)) * 0.45;

    // Variable drop size
    float dropSize = 0.05 + N21(id + vec2(0.1, 0.2)) * 0.04;

    // Elliptical deformation based on velocity
    float velocity = getDropVelocity(t_col);
    float stretch = 1.0 + abs(velocity) * 0.5;
    vec2 ellipseScale = vec2(1.0, stretch);

    // Main drop
    vec2 p1 = vec2(0.0, y);
    vec2 o1 = (n - p1) / aspect / ellipseScale;
    float d = length(o1);
    float m1 = smoothstep(dropSize, 0.0, d);

    // ========== ENHANCED TRAIL ==========
    // Longer trail that stays visible longer
    float trailLength = 0.7;

    // Trail residue
    vec2 o2 = (fract(uv2 * vec2(1.0, 2.0)) - 0.5) / vec2(1.0, 2.0);
    float d2 = length(o2);

    float trailSize = dropSize * 0.4 + N21(id + vec2(0.3, 0.4)) * 0.08;
    float m2 = smoothstep(trailSize * (0.5 - y), 0.0, d2);

    // Smooth width tapering
    float widthTaper = 1.0 - smoothstep(0.15, 0.35, abs(n.x));

    // Height: trail extends from drop position upward
    float heightTaper = smoothstep(y - 0.05, y + trailLength, n.y);

    // Fade out at the top of trail (gradual)
    float trailFade = 1.0 - pow(max(0.0, (n.y - y) / trailLength), 0.6);

    m2 *= widthTaper * heightTaper * trailFade;
    m2 *= step(y, n.y); // Only above the drop

    // Combine drop + trail for clear mask
    float clearMask = m1 + m2 * 0.8;

    // Distortion vector for refraction effect
    vec2 distort = o1 * m1 * 30.0 + o2 * m2 * 15.0;

    return vec3(distort, clearMask);
}

// ============================================
// MAIN
// ============================================

void main() {
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y; // Fix P5 texture flipping

    float t = u_time * 0.08; // Much slower

    // ========== RAIN DROP LAYERS ==========
    // Layer 1 - Very sparse large drops
    vec3 drops1 = layer(uv + vec2(0.0, t * 0.4), u_time * 0.4, 3.0);

    // Layer 2 - Sparse medium drops
    vec3 drops2 = layer((uv * 1.1) + vec2(2.71, t * 0.5), u_time * 0.5 + 31.4, 4.5);

    // Combine layers (reduced contribution)
    float clearMask = clamp(drops1.z * 0.8 + drops2.z * 0.4, 0.0, 1.0);
    vec2 distortion = drops1.xy + drops2.xy * 0.5;

    // ========== SAMPLE CLEAR AND BLURRED VERSIONS ==========

    // Clear version (with subtle refraction from water drops)
    vec2 refractedUV = uv + distortion * 0.01;
    vec3 clearColor = texture2D(u_texture, refractedUV).rgb;

    // Blurred/foggy version (stronger blur for visible frosted glass effect)
    float blurRadius = 0.025;
    vec3 foggyColor = blur13(uv, blurRadius);
    // Apply blur twice for stronger effect
    foggyColor = foggyColor * 0.5 + blur13(uv, blurRadius * 2.0) * 0.5;

    // Add fog tint (cooler, hazier, more opaque)
    foggyColor = mix(foggyColor, vec3(0.78, 0.82, 0.86), 0.25);

    // ========== MIX BASED ON CLEAR MASK ==========
    // Where drops/trails are: show clear; elsewhere: show foggy
    vec3 col = mix(foggyColor, clearColor, clearMask);

    // ========== WATER DROP EDGE VISIBILITY ==========
    // Create visible edges around water drops and trails
    float edgeWidth = 0.2;
    float innerEdge = smoothstep(0.0, edgeWidth, clearMask);
    float outerEdge = smoothstep(edgeWidth, edgeWidth * 2.5, clearMask);
    float edge = innerEdge - outerEdge;

    // Edge darkening (simulates refraction at water boundaries)
    col = mix(col, col * 0.65, edge * 0.6);

    // ========== WATER DROP LIGHTING (reduced) ==========

    // Very subtle specular highlights
    vec2 lightDir = normalize(vec2(0.4, 0.7));
    vec2 normDistort = normalize(distortion + vec2(0.001));

    // Reduced specular - much more subtle
    float spec = dot(normDistort, lightDir);
    spec = pow(max(0.0, spec), 25.0) * 0.15 * clearMask;

    col += spec;

    // ========== COLOR GRADING ==========
    // Cool, melancholy tint
    vec3 tint = vec3(0.92, 0.95, 1.0);
    col *= tint;

    // Slight desaturation for rainy mood
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(gray), 0.08);

    // ========== VIGNETTE ==========
    float vignette = smoothstep(1.2, 0.4, length(vTexCoord - 0.5));
    col *= vignette;

    gl_FragColor = vec4(col, 1.0);
}
`;
