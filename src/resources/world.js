// 创建3d世界物体

import * as THREE from 'three';
import Stats from 'stats.js';

// 定义three.js 场景
export let 
  clock,
  scene,
  camera,
  renderer,
  stats,
  galaxyClock;
  

export let manager = new THREE.LoadingManager();

export function createWorld() {
  clock = new THREE.Clock();
  galaxyClock = new THREE.Clock();

  // 初始化场景
  scene = new THREE.Scene();
  const textureLoader = new THREE.TextureLoader();
  scene.background = textureLoader.load("../src/jsm/background/background.jpg");

  // 初始化相机
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.set(0, 30, 70);

  // 添加半球光
  let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1);
  hemiLight.color.setHSL(0.6, 0.6, 0.6);
  hemiLight.groundColor.setHSL(0.1, 1, 0.4);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  // 添加直射光
  let dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(-10, 100, 50);
  dirLight.position.multiplyScalar(100);
  scene.add(dirLight);

  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;

  let d = 200;

  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;

  dirLight.shadow.camera.far = 15000;

  // 初始化渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

//   // 左上角状态监听器
//   stats = new Stats();
//   document.body.appendChild(stats.dom);

  renderer.gammaInput = true;
  renderer.gammaOutput = true;

  renderer.shadowMap.enabled = true;
}