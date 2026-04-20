import * as THREE from 'three';
import {DBAPI} from '../database/data_base_api';
import { MathUtils } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import {CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { changeFocusedObject} from './model_basic';
import { degToRad } from 'three/src/math/MathUtils.js';


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
    // import { uniformData } from './model_basic.js';

    // Солнце
    import sunFragmentShader from "../../shaders/sun/fragment.glsl";
    import sunVertexShader from "../../shaders/sun/vertex.glsl";

    // Земля
    import earthFragmentShader from "../../shaders/earth/fragment.glsl";
    import earthVertexShader from "../../shaders/earth/vertex.glsl";

    import atmosphereFragmentShader from "../../shaders/earth/atmosphere/fragment.glsl";
    import atmosphereVertexShader from "../../shaders/earth/atmosphere/vertex.glsl";

    // Каменистые планеты и газовые гиганты
    import rockyGasFragmentShader from "../../shaders/non_earth_planet/fragment.glsl";
    import rockyGasVertexShader from "../../shaders/non_earth_planet/vertex.glsl";

    import rockyAtmosphereFragmentShader from  "../../shaders/non_earth_planet/rocky_atmosphere/fragment.glsl";
    import rockyAtmosphereVertexShader from  "../../shaders/non_earth_planet/rocky_atmosphere/vertex.glsl";

    // Спутники
    import MoonFragmentShader from "../../shaders/moon/fragment.glsl";
    import MoonVertexShader from "../../shaders/moon/vertex.glsl";

    // Тестовые шейдеры
    import testFragmentShader from "../../shaders/test/fragment.glsl";
    import testVertexShader from "../../shaders/test/vertex.glsl";


// Интенсивность солнечного света  (условные единицы)
const SUN_LIGHT_IMITATOR_INTENSITY = 1e4; // 2.8e5
// Скорость времени (количество секунд модели в секунду реального времени)
const timeSpeed = 60;

const modelOrbitsAndIconsColors = ["#f6e324", "#c49227", "#7c28ce", "#3156ea", "#c7620e", "#ef9764", "#f1d168", "#61e2e7", "#6661e7"];
const moonsIOColors = ["#c49227", "#c7620e", "#ef9764", "#f1d168", "#6661e7"];

// Инициализация загрузчика текстур
const textureLoader = new THREE.TextureLoader();


class CelestialBody {
    constructor(obj) {
        this.name = obj.name;
        this.radius = obj.radius;
        this.id = obj.id;

        
        // this.geometry = new THREE.IcosahedronGeometry(obj.radius/SCALE_DIV, 12);
        this.geometry = new THREE.SphereGeometry(obj.radius / SCALE_DIV, 32, 32);

        this.material = new THREE.ShaderMaterial({
            // map: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
            // flatShading: true, Toggle to show polygons
            //  wireframe: true // Toggle to show geometry
        });
        
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        this.mesh.rotation.z = obj.tilt * (Math.PI / 180);


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
    }

    UpdateRotation(delta) {
        // Обновление вращения объекта вокруг своей оси
        this.mesh.rotation.y += this.SpeedParams.RotationAroundAxisVelocity * delta * timeSpeed;
    }

    ToggleFocusState(command) {
        console.log("clicked", command);
        if(command) {
            this.textLabelElem.style.visibility = "hidden";
            this.markerLabelELem.style.visibility = "hidden";
        } else {
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

        this.SpeedParams = {
            RotationAroundAxisVelocity: ((obj.body_parameters["скорость вращения вокруг своей оси"].replace(/[^\d.-]/g, ''))) / (obj.radius * SCALE_DIV),
        }

        this.material = new THREE.ShaderMaterial({
            uniforms: uniformData,
            vertexShader:  sunVertexShader,
            fragmentShader: sunFragmentShader,
            // wireframe: true,
            // map: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
        });

        console.log(this.geometry);

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.z = MathUtils.degToRad(obj.tilt);

        this.mesh.position.set(0, 0, 0);
        // Так как Солнце изначально находится в фокусе, его маркер и лейбл скрыты по умолчанию
        this.textLabelElem.style.visibility = "hidden";
        this.markerLabelELem.style.visibility = "hidden";

        // Вспомогательный объект, к которому будет прикреплена камера
        this.auxiliaryCubeGeometry = new THREE.BoxGeometry(0.001, 0.001, 0.001);
        this.auxiliaryCubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.auxiliaryCubeMesh = new THREE.Mesh(this.auxiliaryCubeGeometry, this.auxiliaryCubeMaterial);
        this.auxiliaryCubeMesh.position.set(0, 0, 0);

        // Прикрепление маркера к объекту
        this.mesh.add(this.markerLabel);
        // Прикрепление лейбла к объекту
        this.mesh.add(this.textLabel);
        
        // this.starGroup = new THREE.Group();
        // this.starGroup.position.set(0, 0, 0);

        // this.starGroup.add(this.mesh);
        // this.starGroup.add(this.auxiliaryCubeMesh);
    }

    Update(delta) {
        this.UpdateRotation(delta);
        // console.log(uniformData.uSunDirection);
    }

    ToggleFocusState(command) {
        super.ToggleFocusState(command);
        if(command) {
            focusObject.ToggleFocusState(0);
            focusObject = this;
            changeFocusedObject();
        }
    }
    UpdateRotation(delta) {
        this.mesh.rotation.y += this.SpeedParams.RotationAroundAxisVelocity * delta;
    }
}


class Planet extends CelestialBody {
    constructor(obj) {
        super(obj);

        this.moons = [];

        this.SpeedParams = {
            RotationAroundAxisVelocity: ((obj.body_parameters["скорость вращения вокруг своей оси"].replace(/[^\d.-]/g, '')) * SCALE_DIV) / (obj.radius * 1000 * SCALE_DIV),
        }

        this.geometry = new THREE.SphereGeometry(obj.radius / SCALE_DIV, 32, 32);
        // this.geometry = new THREE.IcosahedronGeometry(obj.radius / SCALE_DIV, 12);
        
        this.material = new THREE.ShaderMaterial({});

        this.markerColor = modelOrbitsAndIconsColors[this.id % 9];
        
        this.SpeedParams.OrbitalVelocity = (obj.orbit_parameters["орбитальная скорость"].replace(/[^\d.-]/g, '')) / (obj.mediumDistanceFromParentObject); 
        console.log("orbit vel:", this.SpeedParams.OrbitalVelocity);

        // Определение дистанции (в рамках модели) от объекта до того небесного тела, вокруг которого он обращается
        this.distance = obj.mediumDistanceFromParentObject / SCALE_DIV;

        this.groups = {
            GeneralGroup: new THREE.Group(),
            subsidiaryGroup: new THREE.Group(),
            meshMoonsGroup: new THREE.Group()
        }
        // subsidiaryGroup это отдельная группа для орбиты и вспомогательного объекта, т.к орбита отображается всегда, и к вспомогательному объекту прикреплены лейбл и метка

        // создание группы мешей планеты, в которую позже будут добавлены меши самой планеты, ее орбиты и прочих вспомогательных объектов (см. код ниже для подробностей)
        // this.planetGroup = new THREE.Group();


        if(obj.id < 10 && obj.id != 3) {
            this.textures = {
                surfaceTexture: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`)
            }
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
                this.AtmosphereTwilightColor = '#ff9e4f';
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
            console.log(this.planetUniforms)

            this.planetUniforms.uAtmosphereDayColor = new THREE.Uniform(new THREE.Color(this.AtmosphereDayColor));
            this.planetUniforms.uAtmosphereTwilightColor = new THREE.Uniform(new THREE.Color(this.AtmosphereTwilightColor));

            this.material = new THREE.ShaderMaterial({
                vertexShader: rockyGasVertexShader,
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
                vertexShader: earthVertexShader,
                fragmentShader: earthFragmentShader,
                uniforms: uniformData,
                // wireframe: true
                // map: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
            });

            this.atmosphereMaterial = new THREE.ShaderMaterial({
                vertexShader: atmosphereVertexShader,
                fragmentShader: atmosphereFragmentShader,
                uniforms: uniformData,
                side: THREE.BackSide,
                transparent: true,
            });
            this.atmosphere = new THREE.Mesh(this.geometry, this.atmosphereMaterial);
            this.atmosphere.scale.set(1.04, 1.04, 1.04);
            this.atmosphere.position.set(this.distance, 0, 0);
            this.groups.meshMoonsGroup.add(this.atmosphere);
            
            this.groups.GeneralGroup.rotation.y = Math.PI;

            console.log("EARTH POSITION", this.mesh.position);

            console.log("THIS IN EARTH", this);
            this.moons.push(new Moon(celestialBodiesData[4], this));
            this.groups.meshMoonsGroup.add(this.moons[0].moonGroup);
        }

        // MARS
        if(obj.id == 4) {
            this.atmosphereMaterial = new THREE.ShaderMaterial({
                vertexShader: rockyAtmosphereVertexShader,
                fragmentShader: rockyAtmosphereFragmentShader,
                uniforms: this.planetUniforms,
                side: THREE.BackSide,
                transparent: true,
            });
            this.atmosphere = new THREE.Mesh(this.geometry, this.atmosphereMaterial);
            this.atmosphere.scale.set(1.03, 1.03, 1.03);
            this.atmosphere.position.set(this.distance, 0, 0);
            this.groups.meshMoonsGroup.add(this.atmosphere);

            this.moons.push(new Moon(celestialBodiesData[6], this));
            this.moons.push(new Moon(celestialBodiesData[7], this));

            this.groups.meshMoonsGroup.add(this.moons[0].moonGroup);
            this.groups.meshMoonsGroup.add(this.moons[1].moonGroup);
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

            this.ringsMesh = new THREE.Mesh(this.ringsGeometry, this.ringsMaterial);
            this.ringsMesh.position.set(this.distance, 0, 0);
            this.ringsMesh.rotation.x = (Math.PI / 2) + (obj.tilt * (Math.PI / 180)); 
            
            this.groups.meshMoonsGroup.add(this.ringsMesh);
        }

        // Радиус самой дальней орбиты спутника (если есть)
        if (this.moons?.length) {
            this.farthestMoonOrbitRadius = this.moons[this.moons.length - 1].distToParent;
        }

        // Применение соответствующих материалов к мешам
        this.mesh.material = this.material;
        
        this.mesh.position.set(this.distance, 0, 0);

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
        this.auxiliaryCubeGeometry = new THREE.BoxGeometry(0.001, 0.001, 0.001);
        this.auxiliaryCubeMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
        this.auxiliaryCubeMesh = new THREE.Mesh(this.auxiliaryCubeGeometry, this.auxiliaryCubeMaterial);
        this.auxiliaryCubeMesh.position.set(this.distance, 0, 0);

        // Прикрепление маркера к объекту
        this.auxiliaryCubeMesh.add(this.markerLabel);
        // Прикрепление лейбла к объекту
        this.auxiliaryCubeMesh.add(this.textLabel);


        // Центр группы расположен в точке начала координат, что упрощает реализацию вращения планеты вокруг Солнца
        this.groups.GeneralGroup.position.set(0, 0, 0);
        this.groups.meshMoonsGroup.add(this.mesh);
        this.groups.subsidiaryGroup.add(this.orbit);
        this.groups.subsidiaryGroup.add(this.auxiliaryCubeMesh);

        this.groups.GeneralGroup.add(this.groups.meshMoonsGroup);
        this.groups.GeneralGroup.add(this.groups.subsidiaryGroup);
    }

    UpdatePosition(delta) {
        this.groups.GeneralGroup.rotation.y += this.SpeedParams.OrbitalVelocity * delta * timeSpeed;
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

    ToggleFocusState(command) {
        // Вызов метода родительского класса CelestialBody
        super.ToggleFocusState(command);
        if (command) {
            // Переход объекта от которого был совершен переход в состояние "расфокуса", затем передача текущего объекта в переменную focusObject
            // и смена цели слежения для камеры на новосфокусированный объект
            focusObject.ToggleFocusState(0);
            console.log(this);
            focusObject = this;
            if (focusObject.id >= 3 && focusObject.moons?.length) {
                for(let i =0; i < focusObject.moons.length; i++) {
                    // this.textLabelElem.style.visibility = "hidden";
                    // this.markerLabelELem.style.visibility = "hidden";
                    focusObject.moons[i].textLabelElem.style.visibility = "visible";
                    focusObject.moons[i].markerLabelELem.style.visibility = "visible";
                }
            }
            changeFocusedObject();
        }
    }
}

class Moon extends CelestialBody {
    constructor(obj, parent) {
        super(obj);

        this.parent = parent;

        if (obj.id == 41 || obj.id == 42) {
            this.textures = {
                surfaceTexture: textureLoader.load(`./assets/textures/41/texture.png`)
            }
        } else {
            this.textures = {
                surfaceTexture: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`)
            }
        }

       
        if (obj.id in [31, 41, 42]) {
            this.AtmosphereDayColor = '#8d8d8d';
            this.AtmosphereTwilightColor = '#636363';
        }

        this.planetUniforms = THREE.UniformsUtils.clone(uniformData);
        this.planetUniforms.uSurfaceTexture = new THREE.Uniform(this.textures.surfaceTexture);
        this.planetUniforms.id = obj.id;
        this.planetUniforms.uPlanetRadius = new THREE.Uniform(this.parent.radius / SCALE_DIV);
        this.planetUniforms.uSquaredPlanetRadius = new THREE.Uniform((this.parent.radius / SCALE_DIV) * (this.parent.radius / SCALE_DIV));
        // this.planetUniforms.uPlanetRadius = new THREE.Uniform((parent.radius / SCALE_DIV));
        console.log("MOONS UNIFORMS", parent.mesh.position);
        console.log("PLANTER RADIUS", this.planetUniforms.uPlanetRadius);

        this.planetUniforms.uAtmosphereDayColor = new THREE.Uniform(new THREE.Color(this.AtmosphereDayColor));
        this.planetUniforms.uAtmosphereTwilightColor = new THREE.Uniform(new THREE.Color(this.AtmosphereTwilightColor));

        this.material = new THREE.ShaderMaterial({
            vertexShader: MoonVertexShader,
            fragmentShader: MoonFragmentShader,
            uniforms: this.planetUniforms,
            // wireframe: true
            // map: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
        });
        this.mesh.material = this.material;

        console.log("RECEIVED PARENT", parent);
        // this.parentObject = parent;

        this.SpeedParams = {
            RotationAroundAxisVelocity: ((obj.orbit_parameters["скорость вращения вокруг своей оси"].replace(/[^\d.-]/g, '')) * SCALE_DIV) / (obj.radius * 1000 * SCALE_DIV),
            OrbitalVelocity: (obj.orbit_parameters["орбитальная скорость"].replace(/[^\d.-]/g, '')) / (obj.mediumDistanceFromParentObject),
        }

        
        console.log("MOON CHECK", celestialBodiesMeshesList);
        // TEMPORARY !!!
        // this.material = new THREE.MeshStandardMaterial({
        //     map: textureLoader.load(`./assets/textures/31/texture.jpg`),
        //     //  wireframe: true // Toggle to show geometry
        // });
        this.markerColor = moonsIOColors[this.id % 5];
        // По умолчанию лейбл и название скрыты
        this.textLabelElem.style.visibility = "hidden";
        this.markerLabelELem.style.visibility = "hidden";
        
        
        
        this.moonGroup = new THREE.Group();
        
        
        
        this.distance = (obj.mediumDistanceFromParentObject / SCALE_DIV) + parent.distance;
        this.distToParent = (obj.mediumDistanceFromParentObject / SCALE_DIV);
        // console.log("DISTANCE", this.distance, this.parentObject.distance);

        
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
        // this.orbit.position.set(this.distance, 0, 0);
        this.orbit.position.set(0, 0, 0);


        // Вспомогательный объект, к которому будет прикреплена камера
        this.auxiliaryCubeSize = (this.radius / SCALE_DIV) / 10;
        this.auxiliaryCubeGeometry = new THREE.BoxGeometry(this.auxiliaryCubeSize, this.auxiliaryCubeSize, this.auxiliaryCubeSize);

        this.auxiliaryCubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.auxiliaryCubeMesh = new THREE.Mesh(this.auxiliaryCubeGeometry, this.auxiliaryCubeMaterial);
        this.mesh.position.set(this.orbitRadius, 0, 0);
        this.auxiliaryCubeMesh.position.copy(this.mesh.position);

        // Прикрепление маркера к объекту
        this.auxiliaryCubeMesh.add(this.markerLabel);
        // Прикрепление лейбла к объекту
        this.auxiliaryCubeMesh.add(this.textLabel);

        this.moonGroup.add(this.mesh);
        this.moonGroup.add(this.orbit);
        this.moonGroup.add(this.auxiliaryCubeMesh);
        this.moonGroup.position.set(parent.distance, 0, 0);

        if(this.id == 31) {
            this.mesh.rotateY((2 * Math.PI) / 3);
        }

        // this.planetUniforms.uPlanetPosition = new THREE.Uniform(new THREE.Vector3(this.moonGroup.position.x, this.moonGroup.position.y, this.moonGroup.position.z));
        this.planetPos = new THREE.Vector3(0, 0, 0);
        this.moonGroup.getWorldPosition(this.planetPos);
        this.planetUniforms.uPlanetPosition = new THREE.Uniform(this.planetPos);
        
        this.meshWorldPos = new THREE.Vector3(0, 0, 0);
        this.mesh.getWorldPosition(this.meshWorldPos);
        this.planetUniforms.uMeshWorldPos = new THREE.Uniform(this.meshWorldPos);
        console.log("MOON GROUP POS", this.planetUniforms.uPlanetPosition, this.meshWorldPos);
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
        // this.planetUniforms.uPlanetPosition.value.copy(new THREE.Vector3(this.moonGroup.getWorldPosition()));
        this.moonGroup.getWorldPosition(this.planetPos);
        this.planetUniforms.uPlanetPosition.value.copy(this.planetPos);

        this.mesh.getWorldPosition(this.meshWorldPos);
        this.planetUniforms.uMeshWorldPos.value.copy(this.meshWorldPos);
        // if(this.id == 42) {
            // console.log(this.planetUniforms);
        // }
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
    // else if(obj.id >= 10) celestialBodiesMeshesList.push(new Moon(obj));
}
console.log(celestialBodiesMeshesList);
console.log(celestialBodiesMeshesList.length);

// const testMoon = new Moon(celestialBodiesData[4]);
// celestialBodiesMeshesList.push(testMoon);
console.log("DATA", celestialBodiesData);


let focusObject = celestialBodiesMeshesList[0];
console.log(`focusObject:`, focusObject);


export {celestialBodiesMeshesList, focusObject, uniformData};


/* 
    const curve = new THREE.EllipseCurve(
	0,  0,            // ax, aY
	10, 10,           // xRadius, yRadius
	0,  2 * Math.PI,  // aStartAngle, aEndAngle
	false,            // aClockwise
	0                 // aRotation
);
*/ 