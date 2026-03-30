// Textures uniforms
uniform sampler2D uEarthDayTexture;
uniform sampler2D uEarthNightTexture;
uniform sampler2D uEarthSpecularCloudsTexture;

// Colors uniforms
uniform vec3 uEarthAtmosphereDayColor;
uniform vec3 uEarthAtmosphereTwilightColor;



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
    vec3 dayColor = texture(uEarthDayTexture, vUv).rgb;
    vec3 nightColor = texture(uEarthNightTexture, vUv).rgb;
    color = mix(nightColor, dayColor, dayMix);

    // Specular clouds color
    vec2 specularCloudsColor = texture2D(uEarthSpecularCloudsTexture, vUv).rb;
    
    // Surface specular
    vec3 specularSurfaceColor = texture2D(uEarthSpecularCloudsTexture, vUv).rgb;

    // Test purposes only !
    // color = vec3(specularCloudsColor, 0.0);

    // Clouds
    // float cloudsMix = specularCloudsColor.g;
    float cloudsMix = smoothstep(0.35, 1.0, specularCloudsColor.g);
    // Облака менее заметны на ночной стороне
    cloudsMix *= dayMix;
    color = mix(color, vec3(1.0), cloudsMix);

    // Fresnel
    float fresnel = dot(viewDirection, normal) + 1.;
    fresnel = pow(fresnel, 1.2);
    // Test purposes only !
    // color = vec3(fresnel);
    // color = viewDirection;

    // Atmosphere
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(uEarthAtmosphereTwilightColor, uEarthAtmosphereDayColor, atmosphereDayMix);

    // Test purposes only !
    // color = vec3(fresnel * atmosphereDayMix);
    // color = vec3(atmosphereDayMix);

    // Градиент атмосферы
    color = mix(color, atmosphereColor, fresnel * atmosphereDayMix);


    // Specular
    vec3 reflection = reflect(-LightDirection, normal);
    float specular = -dot(reflection, viewDirection);
    specular = max(specular, 0.0);
    specular = pow(specular, 32.0);
    specular *= 1. - specularSurfaceColor.g;
    
    vec3 specularColor = mix(vec3(1.0), atmosphereColor, fresnel);
    color += specular * specularColor;

    // Test purposes only !
    // color = vec3(1. - specularSurfaceColor.g);


    // Final color
    // gl_FragColor = vec4(0.25, 0.67, 0.78, 1.0);
    gl_FragColor = vec4(color, 1.0);
}


// Colors
// atmosphere day color #00aaff
// atmosphere twilight color #ff6600

// Tweaks
/*
    edge0 in cloudsMix (clouds density smaller the number -> more clouds)
*/