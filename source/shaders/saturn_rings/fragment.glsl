uniform sampler2D uRingsTexture;
uniform sampler2D uRingsAlpha;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vPosition;


void main() {
    vec3 sunDir = normalize(-vWorldPos);

    vec3 ringColor = texture2D( uRingsTexture, vUv ).rgb;
    float ringAlpha = texture2D( uRingsAlpha, vUv ).r;

    float cosAngleSunToNormal = dot(vNormal, sunDir); // Compute cosine sun to normal
    float mixAmountSurface = 0.7 / (1. + exp(-10. * cosAngleSunToNormal)) + 0.3; // Sharpen the edge between the transition


    vec3 color = mix(vec3(0.), ringColor, mixAmountSurface);

    // color = vec3(ringAlpha);

    gl_FragColor = vec4(color, ringAlpha);
}