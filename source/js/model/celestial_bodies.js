import * as THREE from 'three';
import {DBAPI} from '../database/data_base_api';
import { MathUtils } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import {CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { changeFocusedObject} from './model_basic';
import { degToRad } from 'three/src/math/MathUtils.js';

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
        uSunDirection: {
            value: new THREE.Vector3(-1.0, 0.0, 0.0)
        } 
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

    // Тестовые шейдеры
    import testFragmentShader from "../../shaders/test/fragment.glsl";
    import testVertexShader from "../../shaders/test/vertex.glsl";



// radius, tilt, albedo, normalMap, specularMap

// Интенсивность солнечного света  (условные единицы)
const SUN_LIGHT_IMITATOR_INTENSITY = 3.5e5; // 2.8e5
// Скорость времени (количество секунд модели в секунду реального времени)
const timeSpeed = 60;

const modelOrbitsAndIconsColors = ["#f6e324", "#c49227", "#7c28ce", "#3156ea", "#c7620e", "#ef9764", "#f1d168", "#61e2e7", "#6661e7"];

// Инициализация загрузчика текстур
const textureLoader = new THREE.TextureLoader();


class CelestialBody {
    constructor(obj) {
        this.name = obj.name;
        this.radius = obj.radius;
        this.id = obj.id;
        this.SpeedParams = {
            RotationAroundAxisVelocity: (obj.body_parameters["скорость вращения вокруг своей оси"].replace(/[^\d.-]/g, '')) / (obj.radius * 1000),
        }

        
        // this.geometry = new THREE.IcosahedronGeometry(obj.radius/10000, 10);
        this.geometry = new THREE.SphereGeometry(obj.radius / 10000, 42, 42);

        this.material = new THREE.ShaderMaterial({
            // map: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
            // flatShading: true, Toggle to show polygons
            //  wireframe: true // Toggle to show geometry
        });
        
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        this.mesh.rotation.z = MathUtils.degToRad(obj.tilt);


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
            mix-blend-mode: difference;
        `;

        this.textLabel = new CSS2DObject(this.textLabelElem);
        this.textLabel.center.set(0, 0);
        this.textLabel.position.set(1.5 * obj.radius / 10000, obj.radius / 10000, 0);
        this.textLabel.visible = true;
        
        // Прикрепление лейбла к объекту
        this.mesh.add(this.textLabel);

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

        // Прикрепление маркера к объекту
        this.mesh.add(this.markerLabel)
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
        }
    }
}

class Star extends CelestialBody {
    constructor(obj) {
        super(obj);

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

        this.mesh.add(this.textLabel);
        this.mesh.add(this.markerLabel);

        this.mesh.position.set(0, 0, 0);
        // Так как Солнце изначально находится в фокусе, его маркер и лейбл скрыты по умолчанию
        this.textLabelElem.style.visibility = "hidden";
        this.markerLabelELem.style.visibility = "hidden";

        // Вспомогательный объект, к которому будет прикреплена камера
        this.auxiliaryCubeGeometry = new THREE.BoxGeometry(0.001, 0.001, 0.001);
        this.auxiliaryCubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.auxiliaryCubeMesh = new THREE.Mesh(this.auxiliaryCubeGeometry, this.auxiliaryCubeMaterial);
        this.auxiliaryCubeMesh.position.set(0, 0, 0);
        
        this.starGroup = new THREE.Group();
        this.starGroup.position.set(0, 0, 0);

        this.starGroup.add(this.mesh);
        this.starGroup.add(this.auxiliaryCubeMesh);
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

        this.geometry = new THREE.SphereGeometry(obj.radius / 10000, 52, 52);
        
        this.material = new THREE.ShaderMaterial({});

        this.markerColor = modelOrbitsAndIconsColors[this.id % 9];
        
        this.SpeedParams.OrbitalVelocity = (obj.orbit_parameters["орбитальная скорость"].replace(/[^\d.-]/g, '')) / (obj.mediumDistanceFromParentObject); 
        console.log("orbit vel:", this.SpeedParams.OrbitalVelocity);

        // Определение дистанции (в рамках модели) от объекта до того небесного тела, вокруг которого он обращается
        this.distance = obj.mediumDistanceFromParentObject / 10000;

        // создание группы мешей планеты, в которую позже будут добавлены меши самой планеты, ее орбиты и прочих вспомогательных объектов (см. код ниже для подробностей)
        this.planetGroup = new THREE.Group();

        
        
        // Карта нормалей нужна для обеспечения более точного взаимодействия света с объектом без изменения
        // геометрии самого объекта, например, создание эффекта глубины / высоты рельефа, более правильное отбрасывание теней рельефом поверхности.
        // if(obj.id <= 4) {
        //     // Поскольку планеты, идущие после марса являются газовыми гигантами и, соответственно, не имеют рельефа, а значит карта нормалей для них не нужна
        //     // [------] OLD STYLING [------]
        //     // this.material.normalMap = textureLoader.load(`./assets/textures/${obj.id}/normalMap.jpg`);
        // }

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
            this.planetGroup.add(this.atmosphere);
            
            this.planetGroup.rotation.y = Math.PI;
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
            this.atmosphere.scale.set(1.04, 1.04, 1.04);
            this.atmosphere.position.set(this.distance, 0, 0);
            this.planetGroup.add(this.atmosphere);
        }

        if(obj.id >= 6 && obj.id < 10) {
            /* Получение из свойств объекта данных о расстоянии самого внутреннего
                И самого внешнего колец планеты от ее центра */
            this.innerRadius = obj.innerRingsDistanceFromTheCenterOfPlanet / 10000;
            this.outerRadius = obj.outerRingsDistanceFromTheCenterOfPlanet / 10000;

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
            this.ringsMesh.rotation.x = (Math.PI / 2) + MathUtils.degToRad(obj.tilt); 
            
            this.planetGroup.add(this.ringsMesh);
        }

        // Применение соответствующих материалов к мешам
        this.mesh.material = this.material;
        
        this.mesh.position.set(this.distance, 0, 0);

        this.orbitCurve = new THREE.EllipseCurve(
            0, 0, // координаты центра орбиты в ее плоскости
            this.distance, this.distance, // радиус орбиты
            0.001, (2 * Math.PI) - 0.001, // Угол начала линии орбиты и ее конец
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

        
        // Источник света располагаемый на определенном расстоянии от планеты для достаточного ее освещения
        this.sunLightImitator = new THREE.PointLight(0xffffff, SUN_LIGHT_IMITATOR_INTENSITY);
        console.log("distance", this.distance);
        this.sunLightImitator.position.set(this.distance - 1000, 0, 0);

        this.TestCubeGeometry = new THREE.BoxGeometry(100, 100, 100);
        this.TestCubeMat = new THREE.MeshBasicMaterial({color:0xff0000});
        this.TestCubeMesh = new THREE.Mesh(this.TestCubeGeometry, this.TestCubeMat);
        this.TestCubeMesh.position.copy(this.sunLightImitator.position);


        // Центр группы расположен в точке начала координат, что упрощает реализацию вращения планеты вокруг Солнца
        this.planetGroup.position.set(0, 0, 0);
        this.planetGroup.add(this.mesh);
        this.planetGroup.add(this.orbit);
        this.planetGroup.add(this.auxiliaryCubeMesh);
        this.planetGroup.add(this.sunLightImitator);
        this.planetGroup.add(this.TestCubeMesh);
    }

    UpdatePosition(delta) {
        this.planetGroup.rotation.y += this.SpeedParams.OrbitalVelocity * delta * timeSpeed;
    }

    UpdateRotation(delta) {
        super.UpdateRotation(delta);
        if (this.cloudsMesh) this.cloudsMesh.rotation.y += this.SpeedParams.RotationAroundAxisVelocity * 1.1 * delta * timeSpeed;
    }

    Update(delta, currentTime) {
        this.UpdateRotation(delta);
        this.UpdatePosition(delta, currentTime);
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
console.log(celestialBodiesMeshesList);
console.log(celestialBodiesMeshesList.length);


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