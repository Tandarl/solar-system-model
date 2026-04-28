precision mediump float;
uniform float u_time;
varying vec3 vPosition;
varying vec3 vNormal;

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}

vec4 grad4(float j, vec4 ip){
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

  return p;
}

float snoise(vec4 v){
  const vec2  C = vec2( 0.138196601125010504,  // (5 - sqrt(5))/20  G4
                        0.309016994374947451); // (sqrt(5) - 1)/4   F4
// First corner
  vec4 i  = floor(v + dot(v, C.yyyy) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

// Other corners

// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;

  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
//  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;

//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;

  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C 
  vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
  vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
  vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
  vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;

// Permutations
  i = mod(i, 289.0); 
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
// Gradients
// ( 7*7*6 points uniformly over a cube, mapped onto a 4-octahedron.)
// 7*7*6 = 294, which is close to the ring size 17*17 = 289.

  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

// Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));

// Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

}

// 5 octaves
// NORMAL VARIANT
// float fbm(vec4 p) {
//     float sum = 0.0;

//     float amplitude = 1.;
//     float scale = 0.9;


//     for(int i = 0; i < 5; i++) {
//         sum += snoise(p*scale)*amplitude;
//         // Смещение каждой последующей октавы во времени для получения паттерна шума, отличного от предыдущего
//         // p.w += 100.;
//         amplitude *= 0.5;
//         scale *= 2.4;
//     }

//     return sum;
// }

float fbm(vec4 x) {
	float v = 0.0;
	float a = 0.5;
    float scale = 0.95;
	vec4 shift = vec4(10);
	for (int i = 0; i < 5; ++i) {
		v += a * snoise(x * scale);
		x = x * 2.0 + shift;
		a *= 0.5;
        scale *= 2.;
	}
	return v;
}

vec3 noiseToColor(float n) {
    // vec3 baseColor1 = vec3(0.98, 0.37, 0.01);
    // vec3 baseColor2 = vec3(1.0, 0.68, 0.0);
    vec3 baseColor1 = vec3(0.9804, 0.3176, 0.0118);
    vec3 baseColor2 = vec3(1.0, 0.68, 0.0);
    vec3 color = mix(baseColor2, baseColor1, vec3(n));
    return color;
}

// DO NOT TOUCH!
// float noiseMix(vec4 p) {
//     float brownMotion = fbm(p);
//     return(fbm(p + fbm(p + brownMotion)));
// }
float noiseMix(vec4 p) {
    return(fbm(p + fbm(p + fbm(p))));
}

// Other variant
// 
// float noiseMix(vec4 p) {
//     float brownMotion = fbm(p);
//     return(fbm(p + fbm(p)));
// }

float CalcFresnel() {
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    float fresnel = dot(viewDirection, normalize(vNormal)) + 1.;
    return pow(fresnel, 3.);
}

void main() {

    // gl_FragColor = vec4(vNormal, 1.);
    vec4 p = vec4(vPosition/25.0, u_time/200.);

    float noisePattern = 0.0;
    noisePattern = noiseMix(p);

    vec3 sunColor = noiseToColor(noisePattern);

    float fresnel = CalcFresnel();

    vec3 resultColor = sunColor + fresnel;

    // Pass as v0 into gl_FragColor to see the fresnel effect only
    // vec3 fresnelOnlyColor = color + fresnel; 
    

    gl_FragColor = vec4(resultColor , 1.);
}

// Changeable parameters
    // SUN SURFACE TEXTURE
        // Number of octaves (i upper limit in the for loop in fbm function)
        // amplitude and scale of noise (DIFFER BETWEEN OCTAVES) (in fbm function )
        // Time shift (adding to p.w in for loop in fbm function)
        // Noise pattern multiplier (multiplying the vNormal in p and p1 in main() )
        // Speed of different layers of noise (multiplier of u_time in p and p1 in main() )

    // FRESNEL EFFECT
        // float numbers in CalcFresnel() function