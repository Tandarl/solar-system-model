varying vec3 vNormal;
varying vec3 vPixelPosition;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPos;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);

    vec3 modelNormal = (modelMatrix * vec4(normal, 0.0)).xyz;


    vUv = uv;
    vNormal = modelNormal;
    vPixelPosition = mat3(modelMatrix) * normal;
    vPosition = modelPosition.xyz;
    vWorldPos = worldPosition.xyz;


    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
}