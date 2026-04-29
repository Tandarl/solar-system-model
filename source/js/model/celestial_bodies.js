import * as THREE from 'three';
import {DBAPI} from '../database/data_base_api';
import { MathUtils } from 'three';
// import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import {CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { changeFocusedObject, unloadPlanetGroup} from './model_basic';
import { degToRad } from 'three/src/math/MathUtils.js';
import 'range-slider-element';


const SCALE_DIV = 10000;
// Шейдеры
    // [-------] Uniforms для шейдеров [-------]

    const uniformData = {
        u_time: {
            type: 'f',
            value: 0.0,
        },
        uvScale: { 
            value: new THREE.Vector2(3.0, 1.0) 
        },
    }

    // [-------] Uniforms для шейдеров [-------]

    // Общий vertex shader для мешей небесных тел
    import generalBodyVertexShader from "../../shaders/general_vertex/celestial_body_vertex.glsl";

    // Общий vertex shader для мешей атмосферы
    import generalAtmosphereVertexShader from "../../shaders/general_vertex/atmosphere_vertex.glsl";

// {---} Фрагментарные шейдеры (свои) для каждого типа объектов {---}
    // Солнце
    import sunFragmentShader from "../../shaders/sun/fragment.glsl";
    // Атмосфера Солнца
    import sunAtmosphereFragmentShader from "../../shaders/sun/atmosphere/fragment.glsl";

    // Земля
    import earthFragmentShader from "../../shaders/earth/fragment.glsl";
    import atmosphereFragmentShader from "../../shaders/earth/atmosphere/fragment.glsl";

    // Каменистые планеты и газовые гиганты
    import rockyGasFragmentShader from "../../shaders/non_earth_planet/fragment.glsl";
    import rockyAtmosphereFragmentShader from  "../../shaders/non_earth_planet/rocky_atmosphere/fragment.glsl";

    // Кольца Сатурна
    import ringsVertexShader from "../../shaders/saturn_rings/vertex.glsl";
    import ringsFragmentShader from "../../shaders/saturn_rings/fragment.glsl";

    // Спутники
    import MoonFragmentShader from "../../shaders/moon/fragment.glsl";


const loadingManager = new THREE.LoadingManager();

const progressBar = document.getElementById("progress-bar");

// Реализация загрузочного экрана
loadingManager.onProgress = function(url, loaded, total) {
    progressBar.value = (loaded / total) * 100;
}

const loadingScreen = document.getElementById("loading-screen");

loadingManager.onLoad = function() {
    loadingScreen.style.display = 'none';
}


// Скорость времени (количество секунд модели в секунду реального времени)
let timeSpeed = 1;

const previousFocus = {
    id: 0
}

const modelOrbitsAndIconsColors = ["#f6e324", "#c49227", "#7c28ce", "#3156ea", "#c7620e", "#ef9764", "#f1d168", "#61e2e7", "#6661e7"];
const moonsIOColors = ["#c49227", "#c7620e", "#ef9764", "#f1d168", "#6661e7"];

// Инициализация загрузчика текстур
const textureLoader = new THREE.TextureLoader(loadingManager);

const timeController = {
    sliderElement: 0,
    outputElement: 0,
    sliderValue: 0,
    outputString: "",

    init() {
        this.sliderElement = document.querySelector("range-slider");
        this.outputElement = document.querySelector("output");
        
        this.outputElement.value = "стандартный темп";
        
        console.log("OUTPUT ELEM", this.outputElement)

        this.sliderElement.addEventListener("change", (event) => {
            this.sliderValue = event.target.value;

            if (this.sliderValue == 0) {
                this.outputElement.value = "нормальный темп";
                timeSpeed = 1;

            } else if (this.sliderValue == 1) {
                this.outputElement.value = "1 час/сек р.в.";
                timeSpeed = 3600;

            } else if (this.sliderValue == 2) {
                this.outputElement.value = "1 день/сек р.в.";
                timeSpeed = 86400;

            } else if (this.sliderValue == 3) {
                this.outputElement.value = "1 мес/сек р.в.";
                timeSpeed = 2592000;

            } else if (this.sliderValue == 4) {
                this.outputElement.value = "1 год/сек р.в.";
                timeSpeed = 31557600;

            }
        });
    },
    
    reflectValue() {
        console.log("REFLECT", this.outputElement);
        console.log(this.sliderElement.value);
    }
}


class CelestialBody {
    constructor(obj) {
        this.name = obj.name;
        this.radius = obj.radius;
        this.id = obj.id;

        
        // this.geometry = new THREE.IcosahedronGeometry(obj.radius/SCALE_DIV, 12);
        this.geometry = new THREE.SphereGeometry(obj.radius / SCALE_DIV, 32, 32);
        // this.geometry = new THREE.SphereGeometry(obj.radius / SCALE_DIV, 42, 42);
        
        this.mesh = new THREE.Mesh(this.geometry, this.material);


        // Текстовый лейбл с именем, прикрепляемый к объекту
        this.textLabelElem = document.createElement('div');
        this.textLabelElem.className = 'label';
        this.textLabelElem.textContent = this.name; // Текстовый контент лейбла - название объекта

        this.textLabelElem.style.cssText += `
            color: white;
            font-family: "Exo 2", sans-serif;
            text-transform: uppercase;
            font-weight: 750;
            letter-spacing: 0.3em;
            mix-blend-mode: screen;
            font-size: 14px;
        `;
        // mix-blend-mode: difference;

        this.textLabel = new CSS2DObject(this.textLabelElem);
        this.textLabel.center.set(0, 0);
        this.textLabel.position.set(1.5 * obj.radius / SCALE_DIV, obj.radius / SCALE_DIV, 0);
        this.textLabel.visible = true;

        this.textLabelElem.addEventListener('click', this.ToggleFocusState.bind(this, 2));


        // Маркер в виде окружности вокруг объекта. Нужен для того, чтобы положение объекта было понятно на большой дистанции
        this.markerLabelELem = document.createElement('div');
        this.markerLabelELem.className = 'label';

        this.markerLabelELem.style.cssText += `
            width: 1em;
            height: 1em;
            border: 1px solid ${modelOrbitsAndIconsColors[this.id % 9]};
            border-radius: 50%;
        `;

        this.markerLabel = new CSS2DObject(this.markerLabelELem);
        this.textLabel.position.set(0, 0, 0);
        this.textLabel.center.set(0, 0);
        this.textLabel.visible = true;

        this.textLabel.layers.enable(0);
        this.textLabel.layers.enable(1);
        this.markerLabel.layers.enable(0);
        this.markerLabel.layers.enable(1);
    }

    UpdateRotation(delta) {
        // Обновление вращения объекта вокруг своей оси
        this.mesh.rotation.y += this.SpeedParams.RotationAroundAxisVelocity * delta * timeSpeed;
    }

    ToggleFocusState(command) {
        console.log("focus state toggle", command);
        if(command) {
            this.textLabelElem.style.visibility = "hidden";
            this.markerLabelELem.style.visibility = "hidden";
        } else {
            previousFocus.id = this.id;

            this.textLabelElem.style.visibility = "visible";
            this.markerLabelELem.style.visibility = "visible";
            if (focusObject.id >= 3 && focusObject.moons?.length) {
                for (let i = 0; i < focusObject.moons.length; i++) {
                    focusObject.moons[i].textLabelElem.style.visibility = "hidden";
                    focusObject.moons[i].markerLabelELem.style.visibility = "hidden";
                }
            }
        }
    }
}

class Star extends CelestialBody {
    constructor(obj) {
        super(obj);

        this.geometry = new THREE.SphereGeometry(obj.radius / SCALE_DIV, 64, 64);
        this.atmosphereGeometry = new THREE.IcosahedronGeometry((obj.radius / SCALE_DIV), 10);

        this.SpeedParams = {
            RotationAroundAxisVelocity: ((obj.body_parameters["скорость вращения вокруг своей оси"].replace(/[^\d.-]/g, ''))) / (obj.radius * SCALE_DIV),
        }

        this.starUniforms = THREE.UniformsUtils.clone(uniformData);
        this.starUniforms.uSurfaceTexture = new THREE.Uniform(textureLoader.load(`./assets/textures/0/texture.jpg`));

        this.material = new THREE.ShaderMaterial({
            vertexShader: generalBodyVertexShader,
            fragmentShader: sunFragmentShader,
            uniforms: this.starUniforms,
            // transparent: false,
            // depthWrite: false,
            // blending: THREE.MultiplyBlending
        })

        console.log(this.geometry);

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.z = MathUtils.degToRad(obj.tilt);

        this.mesh.position.set(0, 0, 0);

        this.sunAtmosphereColor = "#f8e8b3";
        this.starUniforms.uSunAtmosphereColor = new THREE.Uniform(new THREE.Color(this.sunAtmosphereColor));
        // Атмосфера
        // this.atmosphereMaterial = new THREE.ShaderMaterial({
        //     vertexShader: generalAtmosphereVertexShader,
        //     fragmentShader: sunAtmosphereFragmentShader,
        //     uniforms: this.starUniforms,
        //     side: THREE.BackSide,
        //     transparent: true,
        //     // depthWrite: false,
        //     // blending: THREE.AdditiveBlending
        // });
        this.atmosphereMaterial = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            transparent: true,
            vertexShader: generalBodyVertexShader,
            fragmentShader: sunAtmosphereFragmentShader,
            uniforms: this.starUniforms,
            depthWrite: false
        });


        this.atmosphere = new THREE.Mesh(this.geometry, this.atmosphereMaterial);
        this.atmosphere.scale.set(1.5, 1.5, 1.5);


        // Так как Солнце изначально находится в фокусе, его маркер и лейбл скрыты по умолчанию
        this.textLabelElem.style.visibility = "hidden";
        this.markerLabelELem.style.visibility = "hidden";

        // Вспомогательный объект, к которому будет прикреплена камера
        this.auxiliaryCubeGeometry = new THREE.BoxGeometry(0.001, 0.001, 0.001);
        this.auxiliaryCubeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffc108,
            transparent: true,
            opacity: 0.0
        });
        this.auxiliaryCubeMesh = new THREE.Mesh(this.auxiliaryCubeGeometry, this.auxiliaryCubeMaterial);
        this.auxiliaryCubeMesh.position.set(0, 0, 0);

        


        // Прикрепление маркера к объекту
        this.auxiliaryCubeMesh.add(this.markerLabel);
        // Прикрепление лейбла к объекту
        this.auxiliaryCubeMesh.add(this.textLabel);
        
        this.starGroup = new THREE.Group();
        this.starGroup.position.set(0, 0, 0);
        
        this.starGroup.add(this.atmosphere);
        this.starGroup.add(this.mesh);
        this.starGroup.add(this.auxiliaryCubeMesh);

        this.mesh.layers.enable(0);
        this.mesh.layers.enable(1); 
        this.auxiliaryCubeMesh.layers.enable(0);
        this.auxiliaryCubeMesh.layers.enable(1);
        this.atmosphere.layers.enable(0);
        this.atmosphere.layers.enable(1);
    }

    Update(delta) {
        this.UpdateRotation(delta);
    }

    UnloadCheck() {
        if (this.id.toString()[0] != previousFocus.id.toString()[0]) {
            // console.log("THIS AND PREV IDS are equal", (this.id.toString()[0] == previousFocus.id.toString()[0]));
            unloadPlanetGroup(Number(previousFocus.id.toString()[0]));
        }
    }

    ToggleFocusState(command) {
        super.ToggleFocusState(command);
        if(command) {
            focusObject.ToggleFocusState(0);
            focusObject = this;
            this.UnloadCheck();
            changeFocusedObject();
        }
    }
    UpdateRotation(delta) {
        this.mesh.rotation.y += this.SpeedParams.RotationAroundAxisVelocity * delta * timeSpeed;
    }
}


class Planet extends CelestialBody {
    constructor(obj) {
        super(obj);

        this.moons = [];

        this.SpeedParams = {
            RotationAroundAxisVelocity: ((obj.body_parameters["скорость вращения вокруг своей оси"].replace(/[^\d.-]/g, '')) * SCALE_DIV) / (obj.radius * 1000 * SCALE_DIV),
        }

        // Наклонение орбиты планеты относительно плоскости эклиптики
        this.orbitInclination = degToRad(obj.orbitInclination);

        // this.geometry = new THREE.SphereGeometry(obj.radius / SCALE_DIV, 64, 25);
        this.geometry = new THREE.SphereGeometry(obj.radius / SCALE_DIV, 64, 64);
        // this.geometry = new THREE.IcosahedronGeometry(obj.radius / SCALE_DIV, 18);
        
        this.material = new THREE.ShaderMaterial({});

        this.markerColor = modelOrbitsAndIconsColors[this.id % 9];
        
        this.SpeedParams.OrbitalVelocity = (obj.orbit_parameters["орбитальная скорость"].replace(/[^\d.-]/g, '')) / (obj.mediumDistanceFromParentObject); 
        console.log("orbit vel:", this.SpeedParams.OrbitalVelocity);

        // Определение дистанции (в рамках модели) от объекта до того небесного тела, вокруг которого он обращается
        this.distance = obj.mediumDistanceFromParentObject / SCALE_DIV;

        this.groups = {
            axisTiltGroup: new THREE.Group(),
            subsidiaryGroup: new THREE.Group(),
            meshMoonsGroup: new THREE.Group(),
            subsidiaryGrandGroup: new THREE.Group(),
            meshMoonsGrandGroup: new THREE.Group(),
        }
        // subsidiaryGroup это отдельная группа для орбиты и вспомогательного объекта, т.к орбита отображается всегда, и к вспомогательному объекту прикреплены лейбл и метка


        if(obj.id < 10 && obj.id != 3) {
            this.textures = {
                surfaceTexture: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`)
            }
            this.textures.surfaceTexture.anisotropy = 8;

            if(obj.id == 1) {
                this.AtmosphereDayColor = '#c4c4c4';
                this.AtmosphereTwilightColor = '#636363';
            } else if(obj.id == 2) {
                this.AtmosphereDayColor = '#fbd9a1';
                this.AtmosphereTwilightColor = '#c49d62';
            } else if(obj.id == 4) {
                this.AtmosphereDayColor = '#ffb981';
                this.AtmosphereTwilightColor = '#ff9e4f';
            } else if(obj.id == 5) {
                this.AtmosphereDayColor = '#c0a384';
                this.AtmosphereTwilightColor = '#948679';
            } else if (obj.id == 6) {
                this.AtmosphereDayColor = '#feeacd';
                this.AtmosphereTwilightColor = '#feeacd';
            } else if (obj.id == 7) {
                this.AtmosphereDayColor = '#afe4ea';
                this.AtmosphereTwilightColor = '#80abb2';
            } else if (obj.id == 8) {
                this.AtmosphereDayColor = '#80abfa';
                this.AtmosphereTwilightColor = '#3648a7';
            }

            this.planetUniforms = THREE.UniformsUtils.clone(uniformData);
            this.planetUniforms.uSurfaceTexture = new THREE.Uniform(this.textures.surfaceTexture);
            this.planetUniforms.id = obj.id;

            this.planetUniforms.uAtmosphereDayColor = new THREE.Uniform(new THREE.Color(this.AtmosphereDayColor));
            this.planetUniforms.uAtmosphereTwilightColor = new THREE.Uniform(new THREE.Color(this.AtmosphereTwilightColor));

            this.material = new THREE.ShaderMaterial({
                vertexShader: generalBodyVertexShader,
                fragmentShader: rockyGasFragmentShader,
                uniforms: this.planetUniforms,
                // wireframe: true
                // map: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
            });
        }

        // EARTH
        if(obj.id == 3) {
            this.textures = {
                dayTexture: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
                nightTexture: textureLoader.load(`./assets/textures/${obj.id}/night_texture.jpg`),
                specularCloudsTexture: textureLoader.load(`./assets/textures/${obj.id}/bump_roughness_clouds.jpg`)
            }
            // this.textures.dayTexture.colorSpace = THREE.SRGBColorSpace;
            this.textures.nightTexture.colorSpace = THREE.SRGBColorSpace;
            
            this.textures.dayTexture.anisotropy = 8;
            this.textures.nightTexture.anisotropy = 8;
            this.textures.specularCloudsTexture.anisotropy = 8;

            this.AtmosphereDayColor = '#00aaff';
            this.AtmosphereTwilightColor = '#ff6600';

            uniformData.uEarthDayTexture = new THREE.Uniform(this.textures.dayTexture);
            uniformData.uEarthNightTexture = new THREE.Uniform(this.textures.nightTexture);
            uniformData.uEarthSpecularCloudsTexture = new THREE.Uniform(this.textures.specularCloudsTexture);
            uniformData.uEarthAtmosphereDayColor = new THREE.Uniform(new THREE.Color(this.AtmosphereDayColor)),
            uniformData.uEarthAtmosphereTwilightColor = new THREE.Uniform(new THREE.Color(this.AtmosphereTwilightColor)),

            this.material = new THREE.ShaderMaterial({
                vertexShader: generalBodyVertexShader,
                fragmentShader: earthFragmentShader,
                uniforms: uniformData,
                // wireframe: true
                // map: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
            });

            this.atmosphereMaterial = new THREE.ShaderMaterial({
                vertexShader: generalAtmosphereVertexShader,
                fragmentShader: atmosphereFragmentShader,
                uniforms: uniformData,
                side: THREE.BackSide,
                transparent: true,
            });
            this.atmosphere = new THREE.Mesh(this.geometry, this.atmosphereMaterial);
            this.atmosphere.scale.set(1.04, 1.04, 1.04);
            this.atmosphere.layers.enable(0);
            this.atmosphere.layers.enable(1);


            this.groups.axisTiltGroup.add(this.atmosphere);

            console.log("EARTH POSITION", this.mesh.position);

            console.log("THIS IN EARTH", this);
            this.moons.push(new Moon(celestialBodiesData[4], this));
            this.groups.meshMoonsGroup.add(this.moons[0].GeneralGroup);
        }

        // MARS
        if(obj.id == 4) {
            this.atmosphereMaterial = new THREE.ShaderMaterial({
                vertexShader: generalAtmosphereVertexShader,
                fragmentShader: rockyAtmosphereFragmentShader,
                uniforms: this.planetUniforms,
                side: THREE.BackSide,
                transparent: true,
            });
            this.atmosphere = new THREE.Mesh(this.geometry, this.atmosphereMaterial);
            this.atmosphere.scale.set(1.03, 1.03, 1.03);
            this.atmosphere.layers.enable(0);
            this.atmosphere.layers.enable(1);


            this.groups.axisTiltGroup.add(this.atmosphere);
            this.moons.push(new Moon(celestialBodiesData[6], this));
            this.moons.push(new Moon(celestialBodiesData[7], this));

            this.groups.meshMoonsGroup.add(this.moons[0].GeneralGroup);
            this.groups.meshMoonsGroup.add(this.moons[1].GeneralGroup);

        }

        if(obj.id == 5) {
            this.moons.push(new Moon(celestialBodiesData[9], this));
            this.moons.push(new Moon(celestialBodiesData[10], this));
            this.moons.push(new Moon(celestialBodiesData[11], this));
            this.moons.push(new Moon(celestialBodiesData[12], this));
        }

        if(obj.id >= 6 && obj.id < 10) {
            /* Получение из свойств объекта данных о расстоянии самого внутреннего
                И самого внешнего колец планеты от ее центра */
            this.innerRadius = obj.innerRingsDistanceFromTheCenterOfPlanet / SCALE_DIV;
            this.outerRadius = obj.outerRingsDistanceFromTheCenterOfPlanet / SCALE_DIV;

            this.ringsGeometry = new THREE.RingGeometry(this.innerRadius, this.outerRadius, 64);

            this.ringsMaterial = new THREE.MeshStandardMaterial({
                side: THREE.DoubleSide,
                transparent: true,
                map: textureLoader.load(`./assets/textures/${obj.id}/rings_texture.jpg`),
                emissive: 0x141414,
                emissiveIntensity: 1,
            });


            if (obj.id == 6) {
                this.ringsUniforms = {
                    uRingsTexture: 0,
                    uRingsAlpha: 0
                }
                this.ringsUniforms.uRingsTexture = new THREE.Uniform(textureLoader.load(`./assets/textures/${obj.id}/rings_texture.jpg`));
                this.ringsUniforms.uRingsAlpha = new THREE.Uniform(textureLoader.load(`./assets/textures/${obj.id}/rings_alpha.gif`) )
                this.ringsUniforms.uRingsTexture.anisotropy = 8;

                // this.ringsGeometry = new THREE.RingGeometry(this.innerRadius, this.outerRadius, 128);
                this.ringsGeometry = new THREE.RingGeometry(this.innerRadius, this.outerRadius, 128).rotateX(-Math.PI / 2);

                this.uvAttr = this.ringsGeometry.attributes.uv;

                for(let i = 0; i <= 1; i++) {
                    this.u = i / 1;
                    for(let j = 0; j <= 128; j++) {
                        this.v = j / 128;
                        this.idx = i *(129) + j;
                        this.uvAttr.setXY(this.idx, this.u, this.v);
                    }
                }
                this.uvAttr.needsUpdate = true;

                this.ringsMaterial = new THREE.ShaderMaterial({
                    vertexShader: ringsVertexShader,
                    fragmentShader: ringsFragmentShader,
                    uniforms: this.ringsUniforms,
                    transparent: true
                });

                this.ringUpper = new THREE.Mesh(this.ringsGeometry, this.ringsMaterial);
                this.ringLower = new THREE.Mesh(this.ringsGeometry, this.ringsMaterial).rotateX(Math.PI);

                this.ringUpper.layers.enable(0);
                this.ringUpper.layers.enable(1);
                this.ringLower.layers.enable(0);
                this.ringLower.layers.enable(1);

                this.groups.axisTiltGroup.add(this.ringUpper);
                this.groups.axisTiltGroup.add(this.ringLower);

                this.moons.push(new Moon(celestialBodiesData[14], this));
                this.moons.push(new Moon(celestialBodiesData[15], this));
                this.moons.push(new Moon(celestialBodiesData[16], this));
                this.moons.push(new Moon(celestialBodiesData[17], this));
                this.moons.push(new Moon(celestialBodiesData[18], this));
            }

            if(this.id != 6) {
                this.ringsMaterial.map.anisotropy = 8;
    
                this.ringsMesh = new THREE.Mesh(this.ringsGeometry, this.ringsMaterial);
                this.ringsMesh.rotation.x = (Math.PI / 2);
                
                this.groups.axisTiltGroup.add(this.ringsMesh);
    
                this.ringsMesh.layers.enable(0);
                this.ringsMesh.layers.enable(1);
            }
        }

        if(obj.id == 7) {
            this.moons.push(new Moon(celestialBodiesData[20], this));
            this.moons.push(new Moon(celestialBodiesData[21], this));
            this.moons.push(new Moon(celestialBodiesData[22], this));
            this.moons.push(new Moon(celestialBodiesData[23], this));
        }

        if(obj.id == 8) {
            this.moons.push(new Moon(celestialBodiesData[25], this));
        }

        // Радиус самой дальней орбиты спутника (если есть)
        if (this.moons?.length) {
            this.farthestMoonOrbitRadius = this.moons[this.moons.length - 1].distToParent;
            for(let i =0; i < this.moons.length; i++) {
                this.groups.meshMoonsGroup.add(this.moons[i].GeneralGroup);
            }
        }

        // Применение соответствующих материалов к мешам
        this.mesh.material = this.material;
    
        this.groups.axisTiltGroup.add(this.mesh);

        this.orbitCurve = new THREE.EllipseCurve(
            0, 0, // координаты центра орбиты в ее плоскости
            this.distance, this.distance, // радиус орбиты
            0.002, (2 * Math.PI) - 0.002, // Угол начала линии орбиты и ее конец
            false, // Направление отрисовки
            0
        );
        this.orbitCurve.curveType = 'centripetal'

        this.orbitPoints = this.orbitCurve.getPoints(64);
        this.orbitGeometry = new THREE.BufferGeometry().setFromPoints(this.orbitPoints);

        this.orbitMaterial = new THREE.LineBasicMaterial({color: this.markerColor});

        // Итоговый объект орбиты, который будет добавляться на сцену
        this.orbit = new THREE.Line(this.orbitGeometry, this.orbitMaterial);
        // Поворот орбиты на 90 градусов ((Пи/2) радиан соответственно) относительно оси x
        this.orbit.rotation.x = Math.PI / 2; 

        
        // Вспомогательный объект, к которому будет прикреплена камера
        this.auxiliaryCubeSize = (this.radius / SCALE_DIV) / 100;
        this.auxiliaryCubeGeometry = new THREE.BoxGeometry(this.auxiliaryCubeSize, this.auxiliaryCubeSize, this.auxiliaryCubeSize);
        this.auxiliaryCubeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffc108,
            transparent: true,
            opacity: 0.0
        });
        this.auxiliaryCubeMesh = new THREE.Mesh(this.auxiliaryCubeGeometry, this.auxiliaryCubeMaterial);
        this.auxiliaryCubeMesh.position.set(this.distance, 0, 0);

        // Прикрепление маркера к объекту
        this.auxiliaryCubeMesh.add(this.markerLabel);
        // Прикрепление лейбла к объекту
        this.auxiliaryCubeMesh.add(this.textLabel);

        if(this.id != 7) {
            this.groups.axisTiltGroup.rotation.x = degToRad(obj.tilt);
        } else {
            this.groups.axisTiltGroup.rotation.z = degToRad(obj.tilt);
        }
        
        // Центр групп расположен в точке начала координат, что упрощает реализацию вращения планеты вокруг Солнца
        this.groups.meshMoonsGrandGroup.position.set(0, 0, 0);
        this.groups.subsidiaryGrandGroup.position.set(0, 0, 0);

        this.groups.subsidiaryGrandGroup.add(this.groups.subsidiaryGroup);
        this.groups.meshMoonsGrandGroup.add(this.groups.meshMoonsGroup);

        // Размещение планеты на своем месте
        this.groups.axisTiltGroup.position.set(this.distance, 0, 0);
        this.groups.meshMoonsGroup.add(this.groups.axisTiltGroup);

        this.groups.subsidiaryGroup.add(this.orbit);
        this.groups.subsidiaryGroup.add(this.auxiliaryCubeMesh);

        this.groups.subsidiaryGrandGroup.rotation.z = this.orbitInclination;
        this.groups.meshMoonsGrandGroup.rotation.z = this.orbitInclination;

        // Распределение по слоям
        this.auxiliaryCubeMesh.layers.enable(0);
        this.auxiliaryCubeMesh.layers.enable(1);
        this.mesh.layers.enable(0);
        this.mesh.layers.enable(1);

        this.orbit.layers.enable(0);

        this.RandomizePosition();
    }

    UpdatePosition(delta) {
        let movement = this.SpeedParams.OrbitalVelocity * delta * timeSpeed;
        this.groups.subsidiaryGroup.rotation.y += movement;
        this.groups.meshMoonsGroup.rotation.y += movement;
    }

    UpdateRotation(delta) {
        super.UpdateRotation(delta);
    }

    Update(delta) {
        this.UpdateRotation(delta);
        this.UpdatePosition(delta);
        // Calling moons update methods
        if(Array.isArray(this.moons) && this.moons.length !== 0) {
            for(let i = 0; i < this.moons.length; i++) {
                this.moons[i].Update(delta);
            }
        }
    }

    UnloadCheck() {
        if(this.id.toString()[0] != previousFocus.id.toString()[0]) {
            unloadPlanetGroup(Number(previousFocus.id.toString()[0]));
        }
    }

    RandomizePosition() {
        let randomRotation = Math.random() * (Math.PI*2);
        this.groups.meshMoonsGroup.rotation.y = randomRotation;
        this.groups.subsidiaryGroup.rotation.y = randomRotation;
    }

    ToggleFocusState(command) {
        // Вызов метода родительского класса CelestialBody
        super.ToggleFocusState(command);
        if (command) {
            // Переход объекта от которого был совершен переход в состояние "расфокуса", затем передача текущего объекта в переменную focusObject
            // и смена цели слежения для камеры на новосфокусированный объект
            focusObject.ToggleFocusState(0);
            console.log("THIS IS NEW FOCUS", this);
            focusObject = this;
            if (focusObject.id >= 3 && focusObject.moons?.length) {
                for(let i =0; i < focusObject.moons.length; i++) {
                    // this.textLabelElem.style.visibility = "hidden";
                    // this.markerLabelELem.style.visibility = "hidden";
                    focusObject.moons[i].textLabelElem.style.visibility = "visible";
                    focusObject.moons[i].markerLabelELem.style.visibility = "visible";
                }
            }
            this.UnloadCheck();
            changeFocusedObject();
        }
    }
}

class Moon extends CelestialBody {
    constructor(obj, parent) {
        super(obj);

        this.parent = parent;

        this.textures = {
            surfaceTexture: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`)
        }

        this.textures.surfaceTexture.anisotropy = 8;

       
        // if (obj.id in [31, 41, 42]) {
        //     this.AtmosphereDayColor = '#8d8d8d';
        //     this.AtmosphereTwilightColor = '#636363';
        // }
        this.AtmosphereDayColor = '#8d8d8d';
        this.AtmosphereTwilightColor = '#636363';

        this.planetUniforms = THREE.UniformsUtils.clone(uniformData);
        this.planetUniforms.uSurfaceTexture = new THREE.Uniform(this.textures.surfaceTexture);
        this.planetUniforms.id = obj.id;
        this.planetUniforms.uPlanetRadius = new THREE.Uniform(this.parent.radius / SCALE_DIV);
        this.planetUniforms.uSquaredPlanetRadius = new THREE.Uniform((this.parent.radius / SCALE_DIV) * (this.parent.radius / SCALE_DIV));

        this.planetUniforms.uAtmosphereDayColor = new THREE.Uniform(new THREE.Color(this.AtmosphereDayColor));
        this.planetUniforms.uAtmosphereTwilightColor = new THREE.Uniform(new THREE.Color(this.AtmosphereTwilightColor));

        this.material = new THREE.ShaderMaterial({
            vertexShader: generalBodyVertexShader,
            fragmentShader: MoonFragmentShader,
            uniforms: this.planetUniforms,
            // wireframe: true
            // map: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
        });
        this.mesh.material = this.material;

        // this.parentObject = parent;

        this.SpeedParams = {
            RotationAroundAxisVelocity: ((obj.orbit_parameters["скорость вращения вокруг своей оси"].replace(/[^\d.-]/g, '')) * SCALE_DIV) / (obj.radius * 1000 * SCALE_DIV),
            OrbitalVelocity: (obj.orbit_parameters["орбитальная скорость"].replace(/[^\d.-]/g, '')) / (obj.mediumDistanceFromParentObject),
        }

        // Наклонение орбиты планеты относительно плоскости эклиптики
        this.orbitInclination = degToRad(obj.orbitInclination);

        this.markerColor = moonsIOColors[(this.id) % 5];
        this.markerLabelELem.style.cssText += `
            width: 1em;
            height: 1em;
            border: 1px solid ${this.markerColor};
            border-radius: 50%;
        `;

        // По умолчанию лейбл и название скрыты
        this.textLabelElem.style.visibility = "hidden";
        this.markerLabelELem.style.visibility = "hidden";
        
        
        
        this.moonGroup = new THREE.Group();
        this.axisTiltGroup = new THREE.Group();
        this.GeneralGroup = new THREE.Group();
        
        
        
        this.distance = (obj.mediumDistanceFromParentObject / SCALE_DIV) + parent.distance;
        this.distToParent = (obj.mediumDistanceFromParentObject / SCALE_DIV);

        
        this.orbitRadius = obj.mediumDistanceFromParentObject / SCALE_DIV;
        this.orbitCurve = new THREE.EllipseCurve(
            0, 0, // координаты центра орбиты в ее плоскости
            this.orbitRadius, this.orbitRadius, // радиус орбиты
            0.05, (2 * Math.PI) - 0.05, // Угол начала линии орбиты и ее конец
            false, // Направление отрисовки
            0
        );
        this.orbitCurve.curveType = 'centripetal'
        this.orbitPoints = this.orbitCurve.getPoints(64);
        this.orbitGeometry = new THREE.BufferGeometry().setFromPoints(this.orbitPoints);
        this.orbitMaterial = new THREE.LineBasicMaterial({ color: this.markerColor });
        // Итоговый объект орбиты, который будет добавляться на сцену
        this.orbit = new THREE.Line(this.orbitGeometry, this.orbitMaterial);
        // Поворот орбиты на 90 градусов ((Пи/2) радиан соответственно) относительно оси x
        this.orbit.rotation.x = Math.PI / 2;
        this.orbit.position.set(0, 0, 0);


        // Вспомогательный объект, к которому будет прикреплена камера
        this.auxiliaryCubeSize = (this.radius / SCALE_DIV) / 10;
        this.auxiliaryCubeGeometry = new THREE.BoxGeometry(this.auxiliaryCubeSize, this.auxiliaryCubeSize, this.auxiliaryCubeSize);

        this.auxiliaryCubeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffc108,
            transparent: true,
            opacity: 0.0
        });
        this.auxiliaryCubeMesh = new THREE.Mesh(this.auxiliaryCubeGeometry, this.auxiliaryCubeMaterial);
        this.mesh.position.set(0, 0, 0);
        this.axisTiltGroup.add(this.mesh);

        this.axisTiltGroup.position.set(this.orbitRadius, 0, 0);
        
        this.axisTiltGroup.rotation.z = degToRad(obj.tilt);
        
        this.auxiliaryCubeMesh.position.set(this.orbitRadius, 0, 0);
        // Прикрепление маркера к объекту
        this.auxiliaryCubeMesh.add(this.markerLabel);
        // Прикрепление лейбла к объекту
        this.auxiliaryCubeMesh.add(this.textLabel);

        this.moonGroup.add(this.axisTiltGroup);
        this.moonGroup.add(this.orbit);
        this.moonGroup.add(this.auxiliaryCubeMesh);
        this.GeneralGroup.add(this.moonGroup);
        this.GeneralGroup.position.set(parent.distance, 0, 0);

        this.mesh.layers.set(0);
        this.mesh.layers.enable(1);

        this.auxiliaryCubeMesh.layers.set(0);
        this.auxiliaryCubeMesh.layers.enable(1);

        this.orbit.layers.enable(0);

        this.GeneralGroup.rotation.z = this.orbitInclination;

        if(this.id == 31) {
            this.mesh.rotateY((2 * Math.PI) / 2);
        }

        this.RandomizePosition();

        // this.planetUniforms.uPlanetPosition = new THREE.Uniform(new THREE.Vector3(this.moonGroup.position.x, this.moonGroup.position.y, this.moonGroup.position.z));
        this.planetPos = new THREE.Vector3(0, 0, 0);
        this.moonGroup.getWorldPosition(this.planetPos);
        this.planetUniforms.uPlanetPosition = new THREE.Uniform(this.planetPos);
        
        this.meshWorldPos = new THREE.Vector3(0, 0, 0);
        this.mesh.getWorldPosition(this.meshWorldPos);
        this.planetUniforms.uMeshWorldPos = new THREE.Uniform(this.meshWorldPos);
        // console.log("MOON GROUP POS", this.planetUniforms.uPlanetPosition, this.meshWorldPos);
    }

    UpdateRotation(delta) {
        super.UpdateRotation(delta);
    }

    UpdatePosition(delta) {
        this.moonGroup.rotation.y += this.SpeedParams.OrbitalVelocity * delta * timeSpeed;
    }

    Update(delta) {
        this.UpdateRotation(delta);
        this.UpdatePosition(delta);

        // console.log(this.moonGroup.position.x);
        this.moonGroup.getWorldPosition(this.planetPos);
        this.planetUniforms.uPlanetPosition.value.copy(this.planetPos);

        this.mesh.getWorldPosition(this.meshWorldPos);
        this.planetUniforms.uMeshWorldPos.value.copy(this.meshWorldPos);
    }

    UnloadCheck() {
        console.log("MOON UNLOAD CHECK TRIGGERED");
        if (this.id.toString()[0] != previousFocus.id.toString()[0]) {
            unloadPlanetGroup(Number(previousFocus.id.toString()[0]));
        }
    }

    RandomizePosition() {
        let randomRotation = Math.sin(Math.random() * (Math.PI * 2)) * Math.random() + this.id;
        this.moonGroup.rotation.y = randomRotation;
    }

    ToggleFocusState(command) {
        // Вызов метода родительского класса CelestialBody
        super.ToggleFocusState(command);
        if (command) {
            // Переход объекта от которого был совершен переход в состояние "расфокуса", затем передача текущего объекта в переменную focusObject
            // и смена цели слежения для камеры на новосфокусированный объект
            focusObject.ToggleFocusState(0);
            console.log("FOCUS TOGGLE", this);
            focusObject = this;
            for(let i = 0; i < focusObject.parent.moons.length; i++) {
                if(focusObject.parent.moons[i].id != focusObject.id) {
                    focusObject.parent.moons[i].textLabelElem.style.visibility = "visible";
                    focusObject.parent.moons[i].markerLabelELem.style.visibility = "visible";
                }
            }
            this.UnloadCheck();
            changeFocusedObject();
        } else {
            for (let i = 0; i < focusObject.parent.moons.length; i++) {
                    focusObject.parent.moons[i].textLabelElem.style.visibility = "hidden";
                    focusObject.parent.moons[i].markerLabelELem.style.visibility = "hidden";
            }
            changeFocusedObject();
        }
    }
}


let celestialBodiesData = DBAPI.GetCelestialBodiesObjectList();
let celestialBodiesMeshesList = [];
for(let obj of celestialBodiesData) {
    if(obj.id == 0) celestialBodiesMeshesList.push(new Star(obj));
    else if(obj.id < 9) celestialBodiesMeshesList.push(new Planet(obj)); // < 9
}
console.log("MAIN MESHES LIST",celestialBodiesMeshesList);
console.log("IT'S LENGTH", celestialBodiesMeshesList.length);

console.log("DATA", celestialBodiesData);


let focusObject = celestialBodiesMeshesList[0];
// console.log(`focusObject:`, focusObject);

timeController.init();


export {celestialBodiesMeshesList, focusObject, uniformData, loadingManager};


/* 
    const curve = new THREE.EllipseCurve(
	0,  0,            // ax, aY
	10, 10,           // xRadius, yRadius
	0,  2 * Math.PI,  // aStartAngle, aEndAngle
	false,            // aClockwise
	0                 // aRotation
);
*/ 