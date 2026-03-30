varying vec3 vNormal;
varying vec3 vPixelPosition;
varying vec2 vUv;
varying vec3 vPosition;


void main() {
    vec3 modelNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
    vNormal = modelNormal;
    vPixelPosition = mat3(modelMatrix) * normal;
    vUv = uv;
    vPosition = position;

    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
}