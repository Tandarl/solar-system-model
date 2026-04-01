// Textures uniforms
uniform sampler2D uSurfaceTexture;

// Colors uniforms
uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;



// Basic varyings
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPos;

void main(){
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 normal = normalize(vNormal);
    vec3 color = vec3(0.0);

    // направление света
    vec3 LightDirection = normalize(-vWorldPos);
    float sunOrientation = dot(normal, LightDirection);

    // ВРЕМЕННО
    // color = vec3(sunOrientation);

    // Day / night color
    // ACTUAL PARAMS
    float dayMix =  smoothstep(-0.25, 0.5, sunOrientation);
    // float dayMix =  smoothstep(-1., 1., sunOrientation);
    vec3 dayColor = texture(uSurfaceTexture, vUv).rgb;
    vec3 nightColor = vec3(0.);
    color = mix(nightColor, dayColor, dayMix);

    // Fresnel
    float fresnel = dot(viewDirection, normal) + 1.;
    fresnel = pow(fresnel, 4.);
    // Test purposes only !
    // color = vec3(fresnel);
    // color = viewDirection;

    // Atmosphere
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor, atmosphereDayMix);

    // Test purposes only !
    // color = vec3(fresnel * atmosphereDayMix);
    // color = vec3(atmosphereDayMix);

    // Градиент атмосферы
    color = mix(color, atmosphereColor, fresnel * atmosphereDayMix);

    // Final color
    gl_FragColor = vec4(color, 1.0);
}


// Colors
// atmosphere day color #00aaff
// atmosphere twilight color #ff6600