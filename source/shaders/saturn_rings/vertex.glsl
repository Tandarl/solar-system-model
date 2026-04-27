varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPos;
varying mat3 vTbn;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);

    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = mat3(modelMatrix) * position;
    vWorldPos = worldPosition.xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}