precision highp float;
// Colors uniforms


// Basic varyings
varying vec3 vNormal;
varying vec3 vPosition;

void main(){
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 normal = normalize(vNormal);
    vec3 color = vec3(0.);

    color += vec3(1.0, 0.8784, 0.3294);

    // Alpha
    float edgeAlpha = dot(viewDirection, normal);
    edgeAlpha = smoothstep(0.7, 0.95, edgeAlpha);


    // Final color
    gl_FragColor = vec4(color, edgeAlpha);
}


// Colors
// atmosphere day color #00aaff
// atmosphere twilight color #ff6600

// Tweaks
/*
    edge0 in cloudsMix (clouds density smaller the number -> more clouds)
*/