// Colors uniforms
uniform vec3 uEarthAtmosphereDayColor;
uniform vec3 uEarthAtmosphereTwilightColor;



// Basic varyings
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

    // Atmosphere
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(uEarthAtmosphereTwilightColor, uEarthAtmosphereDayColor, atmosphereDayMix); 
    color += atmosphereColor;

    // Alpha
    float edgeAlpha = dot(viewDirection, normal);
    edgeAlpha = smoothstep(0.0, 0.5, edgeAlpha);
    
    float nightAlpha = smoothstep(-0.5, 0.0, sunOrientation);

    float alpha = edgeAlpha * nightAlpha;

    // color = vec3(alpha);

    


    // Final color
    // gl_FragColor = vec4(0.25, 0.67, 0.78, 1.0);
    gl_FragColor = vec4(color, alpha);
}


// Colors
// atmosphere day color #00aaff
// atmosphere twilight color #ff6600

// Tweaks
/*
    edge0 in cloudsMix (clouds density smaller the number -> more clouds)
*/