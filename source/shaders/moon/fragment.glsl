precision highp float;
// Textures uniforms
uniform sampler2D uSurfaceTexture;

// Planet shadow uniforms
uniform vec3 uPlanetPosition;
uniform float uSquaredPlanetRadius;

// Mesh pos uniform
uniform vec3 uMeshWorldPos;

// Basic varyings
varying vec2 vUv;
varying vec3 vNormal;

float intersect(vec3 rayDir) {
    vec3 L = uPlanetPosition - uMeshWorldPos;
    float tca = dot(L, rayDir);
    if(tca < 0.0) return 1.0;
    float d2 = dot(L, L) - (tca * tca);
    if(d2 > uSquaredPlanetRadius) return 1.0;

    return 0.0;
}


void main(){
    vec3 normal = normalize(vNormal);
    vec3 color = vec3(0.0);

    // направление света
    vec3 LightDirection = normalize(-uMeshWorldPos);
    float sunOrientation = dot(normal, LightDirection);

    vec3 shadowRayDir = LightDirection;

    float shadow = intersect(shadowRayDir);
    
    vec3 ambientLight = vec3(0.13);
    // Day / night color
    vec3 dayColor = texture(uSurfaceTexture, vUv).rgb;
    vec3 nightColor = vec3(0.);
    float dayMix =  smoothstep(-0.25, 0.5, sunOrientation);
    

    if(shadow == 0.0) {
        color = dayColor;
        color *= ambientLight;
    } else {
        color = mix(nightColor, dayColor, dayMix);
    }

    // Final color
    gl_FragColor = vec4(color, 1.0);
}