precision highp float;
// Textures uniforms
uniform sampler2D uSurfaceTexture;
// Basic varyings
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;


float CalcFresnel() {
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    float fresnel = dot(viewDirection, normalize(vNormal)) + 1.;
    return pow(fresnel, 2.);
}

void main(){
    vec3 surfaceColor = texture(uSurfaceTexture, vUv).rgb;
    // Fresnel
    float fresnel = CalcFresnel();
    
    vec3 color = surfaceColor + fresnel;

    // Final color
    gl_FragColor = vec4(color, 1.0);
}


// Colors
// atmosphere day color #00aaff
// atmosphere twilight color #ff6600