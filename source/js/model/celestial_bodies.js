import * as THREE from 'three';
import {DBAPI} from '../database/data_base_api';
import { MathUtils } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import {CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { changeFocusedObject } from './model_basic';

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

        
        this.geometry = new THREE.IcosahedronGeometry(obj.radius/10000, 12);

        this.material = new THREE.MeshStandardMaterial({
            map: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
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

        this.material = new THREE.MeshBasicMaterial({
            map: textureLoader.load(`./assets/textures/${obj.id}/texture.jpg`),
        });

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
    }

    ToggleFocusState(command) {
        super.ToggleFocusState(command);
        if(command) {
            focusObject.ToggleFocusState(0);
            focusObject = this;
            changeFocusedObject();
        }
    }
} 


class Planet extends CelestialBody {
    constructor(obj) {
        super(obj);
        this.markerColor = modelOrbitsAndIconsColors[this.id % 9];
        
        this.SpeedParams.OrbitalVelocity = (obj.orbit_parameters["орбитальная скорость"].replace(/[^\d.-]/g, '')) / (obj.mediumDistanceFromParentObject); 
        console.log("orbit vel:", this.SpeedParams.OrbitalVelocity);

        // Определение дистанции (в рамках модели) от объекта до того небесного тела, вокруг которого он обращается
        this.distance = obj.mediumDistanceFromParentObject / 10000;

        // создание группы мешей планеты, в которую позже будут добавлены меши самой планеты, ее орбиты и прочих вспомогательных объектов (см. код ниже для подробностей)
        this.planetGroup = new THREE.Group();
        
        // Карта нормалей нужна для обеспечения более точного взаимодействия света с объектом без изменения
        // геометрии самого объекта, например, создание эффекта глубины / высоты рельефа, более правильное отбрасывание теней рельефом поверхности.
        if(obj.id <= 4) {
            // Поскольку планеты, идущие после марса являются газовыми гигантами и, соответственно, не имеют рельефа, а значит карта нормалей для них не нужна
            this.material.normalMap = textureLoader.load(`./assets/textures/${obj.id}/normalMap.jpg`);
        }

        if(obj.id == 3) {
            /* Поскольку большая часть поверхности Земли покрыта водой, которая отражает свет значительно лучше, чем суша, то
             к её текстуре целесообразно применить карту отражений */
            this.material.reflectivityMap = textureLoader.load(`./assets/textures/${obj.id}/specularMap.jpg`);

            this.cloudsMaterial = new THREE.MeshStandardMaterial({
                map: textureLoader.load(`./assets/textures/${obj.id}/clouds.jpg`),
                blending: THREE.AdditiveBlending, // Использование метода смешивания пересекающихся текстур
                transparent: 0.7
            });
            
            this.cloudsMesh = new THREE.Mesh(this.geometry, this.cloudsMaterial);
            this.cloudsMesh.rotation.z = MathUtils.degToRad(obj.tilt);
            this.cloudsMesh.scale.setScalar(1.01);
            this.cloudsMesh.position.set(this.distance, 0, 0);
            this.planetGroup.add(this.cloudsMesh);
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


        // Центр группы расположен в точке начала координат, что упрощает реализацию вращения планеты вокруг Солнца
        this.planetGroup.position.set(0, 0, 0);
        this.planetGroup.add(this.mesh);
        this.planetGroup.add(this.orbit);
        this.planetGroup.add(this.auxiliaryCubeMesh);
        this.planetGroup.add(this.sunLightImitator);
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


export {celestialBodiesMeshesList, focusObject};


/* 
    const curve = new THREE.EllipseCurve(
	0,  0,            // ax, aY
	10, 10,           // xRadius, yRadius
	0,  2 * Math.PI,  // aStartAngle, aEndAngle
	false,            // aClockwise
	0                 // aRotation
);
*/