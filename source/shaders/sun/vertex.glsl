varying vec3 vNormal;
varying vec3 pixelPosition;
varying vec2 vUv;
varying vec3 vPosition;


void main() {
    vNormal  = mat3(modelMatrix) * normal;
    pixelPosition = mat3(modelMatrix) * normal;
    vUv = uv;
    vPosition = position;

    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
}