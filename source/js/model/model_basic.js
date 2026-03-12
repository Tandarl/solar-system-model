import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import Stats from 'three/addons/libs/stats.module.js';
import { celestialBodiesMeshesList, focusObject, uniformData } from "./celestial_bodies";
import { SidePanel } from "../ui/side_panel";


// [-------] Глобальные константы конфигурации [-------]

// const SUN_LIGHT_INTENSITY = 2.8e9;
const CAMERA_MAX_DISTANCE = 900000;
const ENABLE_DAMPING = true;
const ENABLE_PAN = false;

// [-------] Глобальные константы конфигурации [-------]

// [-------] Инструменты для разработки [-------]

// Отслеживание производительности
var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom 
document.body.appendChild(stats.dom);

// const gridHelper = new THREE.GridHelper(1e5, 20);
// scene.add(gridHelper);

// const axesHelper = new THREE.AxesHelper(1e5 / 2);
// axesHelper.setColors(0xff2d00, 0x0500ff, 0x18ff00);
// scene.add(axesHelper);

// [-------] Инструменты для разработки [-------]


// [-------] Начало базовой организации модели [-------]

// Поиск на странице canvas элемента, в который будет направлен поток вывода изображения рендерера
const canvas = document.querySelector('canvas.three-js');

// Инициализация и настройка сцены
const scene = new THREE.Scene();

// Установка снимка млечного пути задним фоном
scene.background = new THREE.CubeTextureLoader()
    .setPath("./assets/textures/milky_way/")
    .load([
        'px.png',
        'nx.png',
        'py.png',
        'nx.png',
        'pz.png',
        'nz.png'
    ]);
    
    // Инициализация и настройка рендерера
    const renderer = new THREE.WebGLRenderer({
        canvas, // Описано выше
        antialias: true, // Сглаживание для уменьшения эффекта "лесенок" по краям объектов
        logarithmicDepthBuffer: false, // Оптимизация буфера глубины (см. текст работы для подробностей)
    });
    
    // Инициализация и настройка рендерера для лейблов и маркеров объектов
    let labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    // labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement); 
    console.log(labelRenderer);

    // Установка размера для потока вывода изображения
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    
    // Заполняющий свет, чтобы неосвещенные участки планет не были просто черными пятнами
    const AmbientLighting = new THREE.AmbientLight(0xffffff, 0.015);
    scene.add(AmbientLighting);

    // Добавление объектов на сцену
    function init() {
        console.log(celestialBodiesMeshesList[0]);
        scene.add(celestialBodiesMeshesList[0].mesh);
        for (let i = 1; i < celestialBodiesMeshesList.length; i++) {
            scene.add(celestialBodiesMeshesList[i].planetGroup);
        }
    }
    
    // Инициализация и настройка камеры
    const camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.1,
        4.5e6
    );
    
    // Начальная позиция камеры
    camera.position.x = -27000;
    camera.position.y = 29000;
    camera.position.z = 32000;
    // camera.position.x = 30000;
    // camera.position.y = 0;
    // camera.position.z = 0;
    
    // Инициализация и настройка элементов управления камерой
    
    // Вторая "ложная" камера для реализации слежения за движущимся объектом
    const fakeCamera = camera.clone();
    fakeCamera.rotation.set(0, 0, 0);
    console.log("init rotation", camera.rotation, fakeCamera.rotation);
    const controls = new OrbitControls(fakeCamera, canvas);
    controls.maxDistance = CAMERA_MAX_DISTANCE;
    controls.enablePan = ENABLE_PAN; // Отключение возможности изменения центра вращения камеры "перетаскиванием"
    controls.enableDamping = ENABLE_DAMPING; // Эффект "инерции" при вращении камеры. Дает большую иммерсивность
    controls.zoomSpeed = 8;
    controls.minDistance = (focusObject.radius / 10000) * 1.2;


// [-------] Конец базовой организации модели [-------]

// [-------] Функции обновления состояния камеры и инструментов управления [-------]
    
    // Функция обновления минимальной дистанции, в зависимости
    // от радиуса объекта
    function updateControlsParams() {
        console.log(focusObject);
        if(focusObject.id == 0) {
            controls.minDistance = (focusObject.radius / 10000) * 1.2;
        } else {
            controls.minDistance = (focusObject.radius / 10000) * 2;
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

    function changeFocusedObject() {
        SidePanel.ChangeContent(focusObject.id);
        updateControlsParams();
        
        focusObject.auxiliaryCubeMesh.add(camera);

        controls.reset();
        
        fakeCamera.position.x = -1;
        fakeCamera.position.y = 0;
        fakeCamera.position.z = controls.minDistance;
        
        camera.copy(fakeCamera);
        console.log(fakeCamera.rotation);
        console.log(renderer.info);
    }

// [-------] Функции обновления состояния камеры и инструментов управления [-------]

// Сферическая система координат (см. статью Википедии)

// [-------] Инициализация часов (см. renderLoop для деталей) [-------]

const clock = new THREE.Clock();
let PreviousTime = 0;
let delta;

uniformData.u_time.value = clock.getElapsedTime();

// [-------] Инициализация часов [-------]

// [-------] Цикл renderLoop [-------]

    const renderLoop = () => {
        // !!! Удалить stats.begin()  и stats.end() на проде
        stats.begin();

        // Следующие операции со временем нужны для обеспечения независимости рендеринга от частоты кадров
        const currentTime = clock.getElapsedTime();
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

        uniformData.u_time.value = clock.getElapsedTime();
        stats.end();
        // Функция вызывает сама себя, причем при помощи метода requestAnimationFrame
        // достигается баланс между приемлемой частотой кадров и нагрузкой на систему
        window.requestAnimationFrame(renderLoop);
    }

// [-------] Цикл renderLoop [-------]

// [-------] Вызов функций инициализации и активация цикла отрисовки [-------]

    init();
    updateControlsParams();
    renderLoop();

    console.log(renderer.info);

// [-------] Вызов функций инициализации и активация цикла отрисовки [-------]



    export {scene, camera, changeFocusedObject}