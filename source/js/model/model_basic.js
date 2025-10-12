import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import Stats from 'three/addons/libs/stats.module.js';
import { celestialBodiesMeshesList, focusObject } from "./celestial_bodies";
import { SidePanel } from "../ui/side_panel";


// const SUN_LIGHT_INTENSITY = 2.8e9;

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
        logarithmicDepthBuffer: true, // Оптимизация буфера глубины (см. текст работы для подробностей)
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
    const AmbientLight = new THREE.AmbientLight(0xffffff, 0.015);
    scene.add(AmbientLight);
    
    // Инициализация и настройка камеры
    const camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.1,
        4.5e6
    );
    
    
    camera.position.x = -27000;
    camera.position.y = 29000;
    camera.position.z = 32000;
    
    // Инициализация и настройка элементов управления камерой
    const controls = new OrbitControls(camera, canvas);
    
    controls.enableDamping = true;  // Эффект "инерции" при вращении камеры. Дает большую иммерсивность
    controls.enablePan = false; // Отключение возможности изменения центра вращения камеры "перетаскиванием"
    controls.minDistance = (focusObject.radius / 10000) * 2;
    
    controls.target.set(0, 0, 0);
    
    // Функция обновления минимальной дистанции, в зависимости
    // от радиуса объекта
    function updateControlsParams() {
        controls.minDistance = (focusObject.radius / 10000) * 2;
        fakeControls.minDistance = (focusObject.radius / 10000) * 2;
    }
    
    
    // Вторые "ложные" камера и элементы управления ею для реализации слежения за движущимся объектом
    const fakeCamera = camera.clone();
    const fakeControls = new OrbitControls(fakeCamera, renderer.domElement);
    fakeControls.enablePan = false;
    fakeControls.enableDamping = true;
    fakeControls.zoomSpeed = 8;
    controls.minDistance = (focusObject.radius / 10000) * 2;
    
    
    
    // Обновление размеров поля вывода при изменении размеров окна браузера
    window.addEventListener('resize', () => {
        fakeCamera.aspect = window.innerWidth / window.innerHeight;
        fakeCamera.updateProjectionMatrix();

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        labelRenderer.setSize(window.innerWidth, window.innerHeight);


    });




// Инициализация часов (см. renderLoop для деталей)
const clock = new THREE.Clock();
let PreviousTime = 0;




let delta;

function init() {
    console.log(celestialBodiesMeshesList[0]);
    scene.add(celestialBodiesMeshesList[0].mesh);
    for(let i=1; i < celestialBodiesMeshesList.length; i++) {
        scene.add(celestialBodiesMeshesList[i].planetGroup);
    }
}


// !!!! Dev tools !!!!!!!!!
// let stats = new Stats();
// document.body.appendChild(stats.dom);

// const gridHelper = new THREE.GridHelper(1e5, 20);
// scene.add(gridHelper);

// const axesHelper = new THREE.AxesHelper(1e5 / 2);
// axesHelper.setColors(0xff2d00, 0x0500ff, 0x18ff00);
// scene.add(axesHelper);

// !!!!!! Dev tools end !!!!!!!!!!

function changeFocusedObject() {
    SidePanel.ChangeContent(focusObject.id);
    
    focusObject.auxiliaryCubeMesh.add(camera);
    updateControlsParams();

}

// https://ru.wikipedia.org/wiki/%D0%A1%D1%84%D0%B5%D1%80%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F_%D1%81%D0%B8%D1%81%D1%82%D0%B5%D0%BC%D0%B0_%D0%BA%D0%BE%D0%BE%D1%80%D0%B4%D0%B8%D0%BD%D0%B0%D1%82

const renderLoop = () => {

    // Следующие операции со временем нужны для обеспечения независимости рендеринга от частоты кадров
    const currentTime = clock.getElapsedTime();
    delta = currentTime - PreviousTime;
    PreviousTime = currentTime;

    // Обновление состояния элементов управления
    controls.update();
    fakeControls.update();

    // Обновление состояния объектов в модели
    for(let object of celestialBodiesMeshesList) {
        object.Update(delta, currentTime);
    }

    camera.copy(fakeCamera);

    // Вызов функции рендера с переданными в нее сценой и камерой (по сути - создание кадра)
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    // Функция вызывает сама себя, причем при помощи метода requestAnimationFrame
    // достигается баланс между приемлемой частотой кадров и нагрузкой на систему
    window.requestAnimationFrame(renderLoop);
}

init();
updateControlsParams();
renderLoop();


export {scene, camera, changeFocusedObject}


// raycast