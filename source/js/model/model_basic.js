import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import Stats from 'three/addons/libs/stats.module.js';
import { celestialBodiesMeshesList, focusObject, uniformData, loadingManager } from "./celestial_bodies";
import { SidePanel } from "../ui/side_panel";


// [-------] Глобальные константы конфигурации [-------]
const SCALE_DIVIDER = 10000;
const CAMERA_MAX_DISTANCE = 900000;
const ENABLE_DAMPING = true;
const ENABLE_PAN = false;

// [-------] Начало базовой организации модели [-------]

// Поиск на странице canvas элемента, в который будет направлен поток вывода изображения рендерера
const canvas = document.querySelector('canvas.three-js');

// Инициализация и настройка сцены
const scene = new THREE.Scene();

// Установка снимка млечного пути задним фоном сцены
scene.background = new THREE.CubeTextureLoader(loadingManager)
    .setPath("./assets/textures/milky_way/")
    .load([
        'px.png',
        'nx.png',
        'py.png',
        'ny.png',
        'pz.png',
        'nz.png'
    ]);
    
    // Инициализация и настройка рендерера
    const renderer = new THREE.WebGLRenderer({
        canvas, // Описано выше
        antialias: true, // Сглаживание для уменьшения эффекта "лесенок" по краям объектов
        logarithmicDepthBuffer: false,
    });
    
    // Инициализация и настройка рендерера для лейблов и маркеров объектов
    let labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    document.body.appendChild(labelRenderer.domElement); 

    // Установка размера для потока вывода изображения
    renderer.setSize(window.innerWidth, window.innerHeight);

// [----] Определение типа устройства пользователя [----]
const userDevice = {
    isMobile: false,

    getDeviceType() {
        if (window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(max-width: 1024px)').matches) {
            this.isMobile = true;
        }
    }
}

    // Добавление объектов на сцену
    function init() {
        scene.add(celestialBodiesMeshesList[0].starGroup);
        for (let i = 1; i < celestialBodiesMeshesList.length; i++) {
            scene.add(celestialBodiesMeshesList[i].groups.subsidiaryGrandGroup);
        }
        LabelManager.checkBoxState = true;
        LabelManager.bindCheckboxOnclickTrigger();
        userDevice.getDeviceType();
    }

    // Инициализация и настройка камеры
    const camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        0.09,
        4.5e6
    );

    camera.layers.set(0);
    
    // Начальная позиция камеры
    camera.position.x = -27000;
    camera.position.y = 29000;
    camera.position.z = 32000;
    
    // Инициализация и настройка элементов управления камерой
    
    // Вторая "ложная" камера для реализации слежения за движущимся объектом
    const fakeCamera = camera.clone();
    fakeCamera.rotation.set(0, 0, 0);
    const controls = new OrbitControls(fakeCamera, canvas);
    controls.maxDistance = CAMERA_MAX_DISTANCE * 2;
    controls.enablePan = ENABLE_PAN; // Отключение возможности изменения центра вращения камеры "перетаскиванием"
    controls.enableDamping = ENABLE_DAMPING; // Эффект "инерции" при вращении камеры. Дает большую иммерсивность
    if(userDevice.isMobile) {
        controls.zoomSpeed = 4;
        controls.rotateSpeed = 0.4;
    } else {
        controls.zoomSpeed = 8;
    }
    controls.minDistance = (focusObject.radius / SCALE_DIVIDER) * 5;

    fakeCamera.layers.set(0);
    
    controls.addEventListener('change', InitiateLabelsCheck);


// [-------] Конец базовой организации модели [-------]



// [-------] Работа с отображением лейблов у объектов [-------]
const LabelManager = {
    previousDistance: 0,
    distance: 0,
    planetSystemRadius: 0,

        hideLabels(from_ID, upTo_ID, hideMarkers) {
            for (let i = from_ID; i <= upTo_ID; i++) {
                celestialBodiesMeshesList[i].textLabel.visible = false;
                if (hideMarkers == true) {
                    celestialBodiesMeshesList[i].markerLabel.visible = false;
                }
            }
        },

        showLabels(from_ID, upTo_ID) {
            for (let i = from_ID; i <= upTo_ID; i++) {
                if (celestialBodiesMeshesList[i] != focusObject) {
                    celestialBodiesMeshesList[i].textLabel.visible = true;
                    celestialBodiesMeshesList[i].markerLabel.visible = true;
                }
            }
        },

        hideMoonsLabels(from_ID, upTo_ID, listParent) {
            for (let i = from_ID; i <= upTo_ID; i++) {
                listParent.moons[i].textLabel.visible = false;
                listParent.moons[i].markerLabel.visible = false;
            }
        },

        showMoonsLabels(from_ID, upTo_ID, listParent) {
            for (let i = from_ID; i <= upTo_ID; i++) {
                if (listParent.moons[i] != focusObject) {
                    listParent.moons[i].textLabel.visible = true;
                    listParent.moons[i].markerLabel.visible = true;
                }
            }
        },

        choosePlanetsAction() {
            if (this.distance > 277_500) { this.hideLabels(1, 4, false) }
            else if (this.distance > 1000 && this.distance < 10_000) { this.showLabels(0, 4) }
            else if (this.distance <= 1200) { this.hideLabels(0, 8, true) }
            else if (this.distance > 10_000) { this.showLabels(0, 8) }

            if (this.distance > 5 && focusObject.id > 10) { this.showLabels(focusObject.parent.id, focusObject.parent.id) }
        },

        chooseMoonsActon() {
            if (focusObject.id >= 3) {
                if (focusObject.id < 10) {
                    this.planetSystemRadius = focusObject.farthestMoonOrbitRadius;
                    if (this.distance > this.planetSystemRadius * 10 || this.distance < controls.minDistance * 2.5) {
                        this.hideMoonsLabels(0, focusObject.moons.length - 1, focusObject);
                    } else {
                        this.showMoonsLabels(0, focusObject.moons.length - 1, focusObject);
                    }
                } else {
                    this.planetSystemRadius = focusObject.parent.farthestMoonOrbitRadius;
                    if (this.distance > this.planetSystemRadius * 50 || this.distance < (controls.minDistance) * 3) {
                        this.hideMoonsLabels(0, focusObject.parent.moons.length - 1, focusObject.parent);
                    } else {
                        this.showMoonsLabels(0, focusObject.parent.moons.length - 1, focusObject.parent);
                    }
                }
            }
        },


        chooseAction(d) {
            this.distance = d;
            if (this.distance != this.previousDistance) {

                // Условия для планет
                this.choosePlanetsAction();

                // Условия для спутников
                this.chooseMoonsActon();
            }
            this.previousDistance = this.distance;
        },


        // Orbits visibility management
        orbitsIcon: document.getElementById("orbits_icon"),
        orbitsCheckBox: document.getElementById("orbits_toggle"),
        checkBoxState: true,

        changeOrbitsVisibility() {
            this.checkBoxState = !this.checkBoxState;
            if (this.checkBoxState) {
                camera.layers.set(0);
                fakeCamera.layers.set(0);
            } else {
                camera.layers.set(1);
                fakeCamera.layers.set(1);
            }
        },

        bindCheckboxOnclickTrigger() {
            this.orbitsCheckBox.onclick = this.changeOrbitsVisibility.bind(this);
        },

    }
    
// [-------] Функции обновления состояния камеры и инструментов управления [-------]
    // Функция обновления минимальной дистанции, в зависимости от радиуса объекта
    function updateControlsParams() {
        if(focusObject.id == 0) {
            controls.minDistance = (focusObject.radius / SCALE_DIVIDER) * 5;
        } else {
            controls.minDistance = (focusObject.radius / SCALE_DIVIDER) * 3;
        }
    }

    
    // Обновление размеров поля вывода при изменении размеров окна браузера
    window.addEventListener('resize', () => {
        fakeCamera.aspect = window.innerWidth / window.innerHeight;
        fakeCamera.updateProjectionMatrix();

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        labelRenderer.setSize(window.innerWidth, window.innerHeight);


    });

    function unloadPlanetGroup(id) {
        if(id != 0) {
            scene.remove(celestialBodiesMeshesList[id].groups.meshMoonsGrandGroup);
        }
    };

    function changeFocusedObject() {
        SidePanel.ChangeContent(focusObject.id);
        updateControlsParams();

        if(focusObject.id < 10 && focusObject.id != 0) {
            scene.add(celestialBodiesMeshesList[focusObject.id].groups.meshMoonsGrandGroup);
        } else if(focusObject.id > 10) {
            scene.add(celestialBodiesMeshesList[Number(focusObject.id.toString()[0])].groups.meshMoonsGrandGroup);
        }
        
        focusObject.auxiliaryCubeMesh.add(camera);

        // controls.reset();
        
        fakeCamera.position.x = -1;
        fakeCamera.position.y = 0.5;
        if(focusObject.id == 0) {
            camera.near = 0.09;
            fakeCamera.near = 0.09;
            camera.updateProjectionMatrix();
            fakeCamera.updateProjectionMatrix();
            // fakeCamera.copy(camera);
            fakeCamera.position.z = (focusObject.radius / SCALE_DIVIDER) * 2;
        } else if(focusObject.id >= 1 && focusObject.id < 10) {
            camera.near = 0.045;
            fakeCamera.near = 0.045;
            camera.updateProjectionMatrix();
            fakeCamera.updateProjectionMatrix();
            fakeCamera.position.z = controls.minDistance * 2;
        } else {
            camera.near = 0.001;
            fakeCamera.near = 0.001;
            camera.updateProjectionMatrix();
            fakeCamera.updateProjectionMatrix();
            fakeCamera.position.x = controls.minDistance * 3.5;
            fakeCamera.position.y = 0;
            fakeCamera.position.z = controls.minDistance * 2;
        }
        
        camera.copy(fakeCamera);
    }


// [-------] Работа с отображением лейблов у объектов [-------]
    function InitiateLabelsCheck() {
        const distance = controls.getDistance();
        LabelManager.chooseAction(distance);
    }


// [-------] Инициализация часов (см. renderLoop для деталей) [-------]

const clock = new THREE.Timer();
clock.connect(document);
let PreviousTime = 0;
let delta;

uniformData.u_time.value = clock.getElapsed();

// [-------] Цикл renderLoop [-------]

    const renderLoop = () => {
        clock.update();

        // Следующие операции со временем нужны для обеспечения независимости рендеринга от частоты кадров
        const currentTime = clock.getElapsed();
        delta = currentTime - PreviousTime;
        PreviousTime = currentTime;

        // Обновление состояния элементов управления
        controls.update();

        // Обновление состояния объектов в модели
        for(let object of celestialBodiesMeshesList) {
            object.Update(delta, currentTime);
        }

        camera.copy(fakeCamera);

        // Вызов функции рендера с переданными в нее сценой и камерой (по сути - создание кадра)
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);

        uniformData.u_time.value = clock.getElapsed();
        // Функция вызывает сама себя, причем при помощи метода requestAnimationFrame
        // достигается баланс между приемлемой частотой кадров и нагрузкой на систему
        window.requestAnimationFrame(renderLoop);
    }

// [-------] Вызов функций инициализации и активация цикла отрисовки [-------]

    init();
    updateControlsParams();
    renderLoop();


    export {scene, camera, changeFocusedObject, unloadPlanetGroup, SCALE_DIVIDER}