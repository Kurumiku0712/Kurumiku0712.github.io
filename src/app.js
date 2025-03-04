import * as THREE from "three";
import { WEBGL } from "./WebGL";
import * as Ammo from "./libs/ammo";
// 导入材质
import {
  billboardTextures,
  boxTexture,
  inputText,
  URL,
  stoneTexture,
  woodTexture,
} from "./resources/textures";

// 导入事件监听函数
import {
  setupEventHandlers,
  moveDirection,
  isTouchscreenDevice,
  touchEvent,
  createJoystick,
} from "./resources/eventHandlers";

// 导入初始化场景时的加载和处理
import {
  preloadDivs,
  preloadOpacity,
  postloadDivs,
  startScreenDivs,
  startButton,
  noWebGL,
  fadeOutDivs,
} from "./resources/preload";

import {
  clock,
  scene,
  camera,
  renderer,
  stats,
  manager,
  createWorld,
  galaxyClock,
} from "./resources/world";

import {
  simpleText,
  floatingLabel,
  allSkillsSection,
  createTextOnPlane,
} from "./resources/surfaces";

import {
  pickPosition,
  launchClickPosition,
  getCanvasRelativePosition,
  rotateCamera,
  launchHover,
} from "./resources/utils";

export let cursorHoverObjects = [];

// Ammo物理引擎载入
Ammo().then((Ammo) => {
  let rigidBodies = [],
    physicsWorld;

  let ballObject = null;
  const STATE = { DISABLE_DEACTIVATION: 4 };

  let tmpTrans = new Ammo.btTransform();

  var objectsWithLinks = [];

  // 创建物理
  function createPhysicsWorld() {
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
      dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
      overlappingPairCache = new Ammo.btDbvtBroadphase(),
      constraintSolver = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld = new Ammo.btDiscreteDynamicsWorld(
      dispatcher,
      overlappingPairCache,
      constraintSolver,
      collisionConfiguration
    );

    // add gravity
    physicsWorld.setGravity(new Ammo.btVector3(0, -50, 0));
  }

  //create flat plane
  function createGridPlane() {
    // block properties
    let pos = { x: 0, y: -0.25, z: 0 };
    let scale = { x: 250, y: 0.5, z: 250 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0; //mass of zero = infinite mass

    //create grid overlay on plane
    // var grid = new THREE.GridHelper(175, 20, 0xffffff, 0xffffff);
    // grid.material.opacity = 0.5;
    // grid.material.transparent = true;
    // grid.position.y = 0.005;
    // scene.add(grid);

    // Create Threejs Plane
    let blockPlane = new THREE.Mesh(
      new THREE.BoxBufferGeometry(),
      new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
      })
    );
    blockPlane.position.set(pos.x, pos.y, pos.z);
    blockPlane.scale.set(scale.x, scale.y, scale.z);
    blockPlane.receiveShadow = true;
    scene.add(blockPlane);

    //Ammo.js Physics
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    //setup collision box
    let colShape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    //  provides information to create a rigid body
    let rigidBodyStruct = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rigidBodyStruct);
    body.setFriction(10);
    body.setRollingFriction(10);

    // add to world
    physicsWorld.addRigidBody(body);
  }

  // Create football
  function createBall() {
    let pos = { x: 0, y: 0, z: 30 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 3;

    var marble_loader = new THREE.TextureLoader(manager);
    var marbleTexture = marble_loader.load("./src/jsm/textures/Football.png");
    marbleTexture.wrapS = marbleTexture.wrapT = THREE.RepeatWrapping;
    marbleTexture.repeat.set(1, 1);
    marbleTexture.anisotropy = 1;
    marbleTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = (ballObject = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: marbleTexture })
    ));

    ball.geometry.computeBoundingSphere();
    ball.geometry.computeBoundingBox();

    ball.position.set(pos.x, pos.y, pos.z);

    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);
    body.setRollingFriction(10);

    //set ball friction

    //once state is set to disable, dynamic interaction no longer calculated
    body.setActivationState(STATE.DISABLE_DEACTIVATION);

    physicsWorld.addRigidBody(
      body //collisionGroupRedBall, collisionGroupGreenBall | collisionGroupPlane
    );

    ball.userData.physicsBody = body;
    ballObject.userData.physicsBody = body;

    rigidBodies.push(ball);
    rigidBodies.push(ballObject);
  }

  // 创建被推动的小球
  function createBeachBall() {
    let pos = { x: 20, y: 30, z: 30 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 20;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/textures/Pokeball.png");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(1);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }

  // Create contact boxes
  function createBox(
    x,
    y,
    z,
    scaleX,
    scaleY,
    scaleZ,
    boxTexture,
    URLLink,
    color = 0x000000,
    transparent = true
  ) {
    const boxScale = { x: scaleX, y: scaleY, z: scaleZ };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0; //mass of zero = infinite mass

    //load link logo
    const loader = new THREE.TextureLoader(manager);
    const texture = loader.load(boxTexture);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;
    const loadedTexture = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: transparent,
      color: 0xffffff,
    });

    var borderMaterial = new THREE.MeshBasicMaterial({
      color: color,
    });
    borderMaterial.color.convertSRGBToLinear();

    var materials = [
      borderMaterial, // Left side
      borderMaterial, // Right side
      borderMaterial, // Top side   ---> THIS IS THE FRONT
      borderMaterial, // Bottom side --> THIS IS THE BACK
      loadedTexture, // Front side
      borderMaterial, // Back side
    ];

    const linkBox = new THREE.Mesh(
      new THREE.BoxBufferGeometry(boxScale.x, boxScale.y, boxScale.z),
      materials
    );
    linkBox.position.set(x, y, z);
    linkBox.renderOrder = 1;
    linkBox.castShadow = true;
    linkBox.receiveShadow = true;
    linkBox.userData = { URL: URLLink, email: URLLink };
    scene.add(linkBox);
    objectsWithLinks.push(linkBox.uuid);

    addRigidPhysics(linkBox, boxScale);

    cursorHoverObjects.push(linkBox);
  }

  //create Ammo.js body to add solid mass to "Software Engineer"
  function floydWords(x, y, z) {
    const boxScale = { x: 37, y: 3, z: 2 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0; //mass of zero = infinite mass

    const linkBox = new THREE.Mesh(
      new THREE.BoxBufferGeometry(boxScale.x, boxScale.y, boxScale.z),
      new THREE.MeshPhongMaterial({
        color: 0xff6600,
      })
    );

    linkBox.position.set(x, y, z);
    linkBox.castShadow = true;
    linkBox.receiveShadow = true;
    objectsWithLinks.push(linkBox.uuid);

    addRigidPhysics(linkBox, boxScale);
  }

  //loads text for Percy Yang Mesh
  function loadPercyYangText() {
    var text_loader = new THREE.FontLoader();

    text_loader.load("./src/jsm/Roboto_Regular.json", function (font) {
      var xMid, text;

      var color = 0x50cff4;

      var textMaterials = [
        new THREE.MeshBasicMaterial({ color: color }), // front
        new THREE.MeshPhongMaterial({ color: color }), // side
      ];

      var geometry = new THREE.TextGeometry("Percy Yang", {
        font: font,
        size: 5,
        height: 0.5,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.11,
        bevelOffset: 0,
        bevelSegments: 1,
      });

      geometry.computeBoundingBox();
      geometry.computeVertexNormals();

      xMid = -0.15 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

      geometry.translate(xMid, 0, 0);

      var textGeo = new THREE.BufferGeometry().fromGeometry(geometry);

      text = new THREE.Mesh(geometry, textMaterials);
      text.position.z = 20;
      text.position.y = 0.1;
      text.receiveShadow = true;
      text.castShadow = true;
      scene.add(text);
    });
  }

  //create "WebDeveloper text"
  function loadWebDeveloperText() {
    var text_loader = new THREE.FontLoader();

    text_loader.load("./src/jsm/Roboto_Regular.json", function (font) {
      var xMid, text;

      var color = 0xfcd2fe;

      var textMaterials = [
        new THREE.MeshBasicMaterial({ color: color }), // front
        new THREE.MeshPhongMaterial({ color: color }), // side
      ];

      var geometry = new THREE.TextGeometry("Web Developer", {
        font: font,
        size: 2.5,
        height: 0.5,
        curveSegments: 20,
        bevelEnabled: true,
        bevelThickness: 0.25,
        bevelSize: 0.1,
      });

      geometry.computeBoundingBox();
      geometry.computeVertexNormals();

      xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

      geometry.translate(xMid, 0, 0);

      var textGeo = new THREE.BufferGeometry().fromGeometry(geometry);

      text = new THREE.Mesh(textGeo, textMaterials);
      text.position.z = 0;
      text.position.y = 0.1;
      text.position.x = 40;
      text.receiveShadow = true;
      text.castShadow = true;
      scene.add(text);
    });
  }

  // 创建横板展板(作品展示)
  function createBillboard(
    x,
    y,
    z,
    textureImage = billboardTextures.grassImage,
    urlLink,
    rotation = 0
  ) {
    const billboardPoleScale = { x: 1, y: 5, z: 1 };
    const billboardSignScale = { x: 30, y: 15, z: 1 };

    /* default texture loading */
    const loader = new THREE.TextureLoader(manager);

    const billboardPole = new THREE.Mesh(
      new THREE.BoxBufferGeometry(
        billboardPoleScale.x,
        billboardPoleScale.y,
        billboardPoleScale.z
      ),
      new THREE.MeshStandardMaterial({
        map: loader.load(woodTexture),
      })
    );

    const texture = loader.load(textureImage);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;
    var borderMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });
    const loadedTexture = new THREE.MeshBasicMaterial({
      map: texture,
    });

    var materials = [
      borderMaterial, // Left side
      borderMaterial, // Right side
      borderMaterial, // Top side   ---> THIS IS THE FRONT
      borderMaterial, // Bottom side --> THIS IS THE BACK
      loadedTexture, // Front side
      borderMaterial, // Back side
    ];
    // order to add materials: x+,x-,y+,y-,z+,z-
    const billboardSign = new THREE.Mesh(
      new THREE.BoxGeometry(
        billboardSignScale.x,
        billboardSignScale.y,
        billboardSignScale.z
      ),
      materials
    );

    billboardPole.position.x = x;
    billboardPole.position.y = y;
    billboardPole.position.z = z;

    billboardSign.position.x = x;
    billboardSign.position.y = y + 10;
    billboardSign.position.z = z;

    /* Rotate Billboard */
    billboardPole.rotation.y = rotation;
    billboardSign.rotation.y = rotation;

    billboardPole.castShadow = true;
    billboardPole.receiveShadow = true;

    billboardSign.castShadow = true;
    billboardSign.receiveShadow = true;

    billboardSign.userData = { URL: urlLink };

    scene.add(billboardPole);
    scene.add(billboardSign);
    addRigidPhysics(billboardPole, billboardPoleScale);

    cursorHoverObjects.push(billboardSign);
  }

  // 创建竖版展板
    function createBillboardRotated(
      x,
      y,
      z,
      textureImage = billboardTextures.grassImage,
      urlLink,
      rotation = 0
    ) {
      const billboardPoleScale = { x: 1, y: 2.5, z: 1 };
      const billboardSignScale = { x: 15, y: 20, z: 1 };

      /* default texture loading */
      const loader = new THREE.TextureLoader(manager);
      const billboardPole = new THREE.Mesh(
        new THREE.BoxBufferGeometry(
          billboardPoleScale.x,
          billboardPoleScale.y,
          billboardPoleScale.z
        ),
        new THREE.MeshStandardMaterial({
          map: loader.load(woodTexture),
        })
      );
      const texture = loader.load(textureImage);
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;
      texture.encoding = THREE.sRGBEncoding;
      var borderMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
      });
      const loadedTexture = new THREE.MeshBasicMaterial({
        map: texture,
      });

      var materials = [
        borderMaterial, // Left side
        borderMaterial, // Right side
        borderMaterial, // Top side   ---> THIS IS THE FRONT
        borderMaterial, // Bottom side --> THIS IS THE BACK
        loadedTexture, // Front side
        borderMaterial, // Back side
      ];
      // order to add materials: x+,x-,y+,y-,z+,z-
      const billboardSign = new THREE.Mesh(
        new THREE.BoxGeometry(
          billboardSignScale.x,
          billboardSignScale.y,
          billboardSignScale.z
        ),
        materials
      );

      billboardPole.position.x = x;
      billboardPole.position.y = y;
      billboardPole.position.z = z;

      billboardSign.position.x = x;
      billboardSign.position.y = y + 11.25;
      billboardSign.position.z = z;

      /* Rotate Billboard */
      billboardPole.rotation.y = rotation;
      billboardSign.rotation.y = rotation;

      billboardPole.castShadow = true;
      billboardPole.receiveShadow = true;

      billboardSign.castShadow = true;
      billboardSign.receiveShadow = true;

      billboardSign.userData = { URL: urlLink };

      scene.add(billboardPole);
      scene.add(billboardSign);
      addRigidPhysics(billboardPole, billboardPoleScale);
      addRigidPhysics(billboardSign, billboardSignScale);

      cursorHoverObjects.push(billboardSign);
    }

  // 创建x轴边界(防止小球掉出去)
  function createWallX(x, y, z) {
    const wallScale = { x: 0.125, y: 4, z: 250 };

    const wall = new THREE.Mesh(
      new THREE.BoxBufferGeometry(wallScale.x, wallScale.y, wallScale.z),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        opacity: 0.75,
        transparent: true,
      })
    );

    wall.position.x = x;
    wall.position.y = y;
    wall.position.z = z;

    wall.receiveShadow = true;

    scene.add(wall);

    addRigidPhysics(wall, wallScale);
  }

  // 创建x轴边界
  function createWallZ(x, y, z) {
    const wallScale = { x: 250, y: 4, z: 0.125 };

    const wall = new THREE.Mesh(
      new THREE.BoxBufferGeometry(wallScale.x, wallScale.y, wallScale.z),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        opacity: 0.75,
        transparent: true,
      })
    );

    wall.position.x = x;
    wall.position.y = y;
    wall.position.z = z;

    wall.receiveShadow = true;

    scene.add(wall);

    addRigidPhysics(wall, wallScale);
  }

  // 创建被被撞击的砖块墙
  function wallOfBricks() {
    const loader = new THREE.TextureLoader(manager);
    var pos = new THREE.Vector3();
    var quat = new THREE.Quaternion();
    var brickMass = 0.1;
    var brickLength = 3;
    var brickDepth = 3;
    var brickHeight = 1.5;
    var numberOfBricksAcross = 8;
    var numberOfRowsHigh = 8;

    pos.set(69, brickHeight * 0.5, -65);
    quat.set(0, 0, 0, 1);

    for (var j = 0; j < numberOfRowsHigh; j++) {
      var oddRow = j % 2 == 1;

      pos.x = 69;

      if (oddRow) {
        pos.x += 0.25 * brickLength;
      }

      var currentRow = oddRow ? numberOfBricksAcross + 1 : numberOfBricksAcross;
      for (let i = 0; i < currentRow; i++) {
        var brickLengthCurrent = brickLength;
        var brickMassCurrent = brickMass;
        if (oddRow && (i == 0 || i == currentRow - 1)) {
          //first or last brick
          brickLengthCurrent *= 0.5;
          brickMassCurrent *= 0.5;
        }
        var brick = createBrick(
          brickLengthCurrent,
          brickHeight,
          brickDepth,
          brickMassCurrent,
          pos,
          quat,
          new THREE.MeshStandardMaterial({
            map: loader.load(stoneTexture),
          })
        );
        brick.castShadow = true;
        brick.receiveShadow = true;

        if (oddRow && (i == 0 || i == currentRow - 2)) {
          //first or last brick
          pos.x += brickLength * 0.25;
        } else {
          pos.x += brickLength;
        }
        pos.z += 0.0001;
      }
      pos.y += brickHeight;
    }
  }

  // 创建砖块
  function createBrick(sx, sy, sz, mass, pos, quat, material) {
    var threeObject = new THREE.Mesh(
      new THREE.BoxBufferGeometry(sx, sy, sz, 1, 1, 1),
      material
    );
    var shape = new Ammo.btBoxShape(
      new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
    );
    shape.setMargin(0.05);

    createBrickBody(threeObject, shape, mass, pos, quat);

    return threeObject;
  }

  // 砖块加入物理系统
  function createBrickBody(threeObject, physicsShape, mass, pos, quat) {
    threeObject.position.copy(pos);
    threeObject.quaternion.copy(quat);

    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    var motionState = new Ammo.btDefaultMotionState(transform);

    var localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);

    var rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      physicsShape,
      localInertia
    );
    var body = new Ammo.btRigidBody(rbInfo);

    threeObject.userData.physicsBody = body;

    scene.add(threeObject);

    if (mass > 0) {
      rigidBodies.push(threeObject);

      // Disable deactivation
      body.setActivationState(4);
    }

    physicsWorld.addRigidBody(body);
  }

  // 触发
  function createTriangle(x, z) {
    var geom = new THREE.Geometry();
    var v1 = new THREE.Vector3(4, 0, 0);
    var v2 = new THREE.Vector3(5, 0, 0);
    var v3 = new THREE.Vector3(4.5, 1, 0);

    geom.vertices.push(v1);
    geom.vertices.push(v2);
    geom.vertices.push(v3);

    geom.faces.push(new THREE.Face3(0, 1, 2));
    geom.computeFaceNormals();

    var mesh = new THREE.Mesh(
      geom,
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    //mesh.rotation.z = -90;
    mesh.position.y = 0.01;
    mesh.position.x = x;
    mesh.position.z = z;
    scene.add(mesh);
  }

  function addRigidPhysics(item, itemScale) {
    let pos = { x: item.position.x, y: item.position.y, z: item.position.z };
    let scale = { x: itemScale.x, y: itemScale.y, z: itemScale.z };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0;
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );

    var localInertia = new Ammo.btVector3(0, 0, 0);
    var motionState = new Ammo.btDefaultMotionState(transform);
    let colShape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    colShape.setMargin(0.05);
    colShape.calculateLocalInertia(mass, localInertia);
    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);
    body.setActivationState(STATE.DISABLE_DEACTIVATION);
    body.setCollisionFlags(2);
    physicsWorld.addRigidBody(body);
  }

  // 移动小球
  function moveBall() {
    let scalingFactor = 20;
    let moveX = moveDirection.right - moveDirection.left;
    let moveZ = moveDirection.back - moveDirection.forward;
    let moveY = 0;

    if (ballObject.position.y < 2.01) {
      moveX = moveDirection.right - moveDirection.left;
      moveZ = moveDirection.back - moveDirection.forward;
      moveY = 0;
    } else {
      moveX = moveDirection.right - moveDirection.left;
      moveZ = moveDirection.back - moveDirection.forward;
      moveY = -0.25;
    }

    // no movement
    if (moveX == 0 && moveY == 0 && moveZ == 0) return;

    let resultantImpulse = new Ammo.btVector3(moveX, moveY, moveZ);
    resultantImpulse.op_mul(scalingFactor);
    let physicsBody = ballObject.userData.physicsBody;
    physicsBody.setLinearVelocity(resultantImpulse);
  }

  // 渲染函数
  function renderFrame() {
    // stats.begin();

    const elapsedTime = galaxyClock.getElapsedTime() + 150;

    let deltaTime = clock.getDelta();
    if (!isTouchscreenDevice())
      if (document.hasFocus()) {
        moveBall();
      } else {
        moveDirection.forward = 0;
        moveDirection.back = 0;
        moveDirection.left = 0;
        moveDirection.right = 0;
      }
    else {
      moveBall();
    }

    updatePhysics(deltaTime);

    // moveParticles();

    renderer.render(scene, camera);
    // stats.end();

    // galaxyMaterial.uniforms.uTime.value = elapsedTime * 5;
    //galaxyPoints.position.set(-50, -50, 0);

    // tells browser theres animation, update before the next repaint
    requestAnimationFrame(renderFrame);
  }

  // 点击进入事件
  function startButtonEventListener() {
    for (let i = 0; i < fadeOutDivs.length; i++) {
      fadeOutDivs[i].classList.add("fade-out");
    }
    setTimeout(() => {
      document.getElementById("preload-overlay").style.display = "none";
    }, 750);

    startButton.removeEventListener("click", startButtonEventListener);
    document.addEventListener("click", launchClickPosition);
    createBeachBall();

    setTimeout(() => {
      document.addEventListener("mousemove", launchHover);
    }, 1000);
  }

  function updatePhysics(deltaTime) {
    // Step world
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update rigid bodies
    for (let i = 0; i < rigidBodies.length; i++) {
      let objThree = rigidBodies[i];
      let objAmmo = objThree.userData.physicsBody;
      let ms = objAmmo.getMotionState();
      if (ms) {
        ms.getWorldTransform(tmpTrans);
        let p = tmpTrans.getOrigin();
        let q = tmpTrans.getRotation();
        objThree.position.set(p.x(), p.y(), p.z());
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }

    //check to see if ball escaped the plane
    if (ballObject.position.y < -50) {
      scene.remove(ballObject);
      createBall();
    }

    //check to see if ball is on text to rotate camera
    rotateCamera(ballObject);
  }

  // 窗口调整
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderFrame();
  }

  manager.onLoad = function () {
    var readyStateCheckInterval = setInterval(function () {
      if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        for (let i = 0; i < preloadDivs.length; i++) {
          preloadDivs[i].style.visibility = "hidden";
          preloadDivs[i].style.display = "none";
        }
        for (let i = 0; i < postloadDivs.length; i++) {
          postloadDivs[i].style.visibility = "visible";
          postloadDivs[i].style.display = "block";
        }
      }
    }, 1000);
  };

  manager.onError = function (url) {};

  startButton.addEventListener("click", startButtonEventListener);

  // 开启很卡
  // window.addEventListener('resize', onWindowResize);

  if (isTouchscreenDevice()) {
    document.getElementById("appDirections").innerHTML =
      "Use the joystick in the bottom left to move the ball. Please use your device in portrait orientation!";
    createJoystick(document.getElementById("joystick-wrapper"));
    document.getElementById("joystick-wrapper").style.visibility = "visible";
    document.getElementById("joystick").style.visibility = "visible";
  }

  // 创建函数
  function start() {
    createWorld();
    createPhysicsWorld();

    createGridPlane();
    createBall();

    // 这里调整边界
    createWallX(125, 1.75, 0);
    createWallX(-125, 1.75, 0);
    createWallZ(0, 1.75, 125);
    createWallZ(0, 1.75, -125);

    // 第一块展板
    createBillboard(
      100,
      2.5,
      -105,
      billboardTextures.projectTexture1,
      URL.project1,
      0
    );

    // 第二块展板
    createBillboard(
      50,
      2.5,
      -105,
      billboardTextures.projectTexture2,
      URL.project2,
      0
    );

    // 第三块展板
    createBillboard(
      0,
      2.5,
      -105,
      billboardTextures.projectTexture3,
      URL.project3,
      0
    );

    // 第四块展板
    createBillboard(
      -50,
      2.5,
      -105,
      billboardTextures.projectTexture4,
      URL.project4,
      0
    );

    // 第五块展板
    createBillboard(
      -100,
      2.5,
      -105,
      billboardTextures.projectTexture5,
      URL.project5,
      0
    );

    // 第六块展板
    createBillboard(
      -85,
      2.5,
      -60,
      billboardTextures.projectTexture6,
      URL.project6,
      Math.PI * 0.22
    );

    // 第七块展板
    createBillboard(
      0,
      2.5,
      -65,
      billboardTextures.projectTexture7,
      URL.project7,
      0
    );

    // 第七块展板-5
    createBillboard(
      -30,
      2.5,
      -60,
      billboardTextures.projectTexture7_5,
      URL.project7,
      Math.PI * 0.12
    );

    // 第七块展板-2
    createBillboard(
      30,
      2.5,
      -60,
      billboardTextures.projectTexture7_2,
      URL.project7,
      -Math.PI * 0.12
    );

    // 第七块展板-3
    createBillboardRotated(
      40,
      2.5,
      -40,
      billboardTextures.projectTexture7_3,
      URL.project7,
      -Math.PI * 0.4
    );

    // 第八块展板
    createBillboard(
      -90,
      2.5,
      -20,
      billboardTextures.projectTexture8,
      URL.project8,
      Math.PI * 0.22
    );

    // 第九块展板
    createBillboard(
      -90,
      2.5,
      20,
      billboardTextures.projectTexture9,
      URL.project9,
      Math.PI * 0.22
    );

    // 第十块展板
    createBillboard(
      -90,
      2.5,
      65,
      billboardTextures.projectTexture10,
      URL.project10,
      Math.PI * 0.22
    );

    // 第十一块展板
    createBillboard(
      -40,
      2.5,
      -25,
      billboardTextures.projectTexture11,
      URL.project11,
      Math.PI * 0.22
    );

    // 第十二块展板
    createBillboard(
      -25,
      2.5,
      -10,
      billboardTextures.projectTexture12,
      URL.project12,
      0
    );  

    

    floydWords(12, 1, 20);
    // 提示文字
    // createTextOnPlane(-70, 0.01, -48, inputText.terpSolutionsText, 20, 40);
    // createTextOnPlane(-42, 0.01, -53, inputText.bagholderBetsText, 20, 40);
    // createTextOnPlane(-14, 0.01, -49, inputText.homeSweetHomeText, 20, 40);

    // GitHub
    createBox(
      0,
      2,
      -10,
      4,
      4,
      1,
      boxTexture.Github,
      URL.gitHub,
      0x000000,
      true
    );

    // LinkedIn
    createBox(
      10,
      2,
      -10,
      4,
      4,
      1,
      boxTexture.LinkedIn,
      URL.linkedIn,
      0x0077b5,
      true
    );

    // CV
    createBox(20, 2, -10, 5, 5, 1, boxTexture.cv, URL.cv, 0x0077b5, true);

    // Mail
    createBox(
      30,
      2,
      -10,
      4,
      4,
      1,
      boxTexture.Mail,
      "mailto: kurumiku0712@gmail.com",
      0x000000,
      false
    );

    // 浮动文字
    floatingLabel(0, 4.5, -10, "Github");
    floatingLabel(10, 4.5, -10, "LinkedIn");
    floatingLabel(20, 4.5, -10, "CV");
    floatingLabel(30, 4.5, -10, "Mail");

    // 图片贴图
    allSkillsSection(80, 0.025, 50, 40, 40, boxTexture.allSkills);
    allSkillsSection(80, 0.025, 95, 40, 40, boxTexture.tools);
    allSkillsSection(40, 0.025, 100, 40, 40, boxTexture.softSkills);
    allSkillsSection(-10, 0.025, 100, 40, 40, boxTexture.hobbies);
    allSkillsSection(80, 0.025, -20, 40, 80, inputText.timeline);

    // Project Texts
    allSkillsSection(100, 0.025, -80, 40, 40, boxTexture.projectText1);
    allSkillsSection(50, 0.025, -80, 40, 40, boxTexture.projectText2);
    allSkillsSection(0, 0.025, -80, 40, 40, boxTexture.projectText3);
    allSkillsSection(-50, 0.025, -80, 40, 40, boxTexture.projectText4);
    allSkillsSection(-100, 0.025, -80, 40, 40, boxTexture.projectText5);
    allSkillsSection(-70, 0.025, -40, 40, 40, boxTexture.projectText6);

    allSkillsSection(0, 0.025, -40, 40, 40, boxTexture.projectText7);

    allSkillsSection(-70, 0.025, 0, 40, 40, boxTexture.projectText8);
    allSkillsSection(-70, 0.025, 40, 40, 40, boxTexture.projectText9);
    allSkillsSection(-70, 0.025, 80, 40, 40, boxTexture.projectText10);

    // createLensFlare(50, -50, -800, 200, 200, boxTexture.lensFlareMain);

    loadPercyYangText();
    loadWebDeveloperText();

    let touchText, instructionsText;
    // 根据设备显示不同提示文字
    if (isTouchscreenDevice()) {
      allSkillsSection(9, 0.01, 40, 20, 10, inputText.mobileControl);
    } else {
      allSkillsSection(9, 0.01, 40, 20, 10, inputText.pcControl);
    }

    allSkillsSection(10, 0.01, -5, 20, 10, inputText.link);

    // 板块文字
    simpleText(108, 0.01, 50, "SKILLS", 3);
    simpleText(108, 0.01, 90, "TOOLS", 3);
    simpleText(37, 0.01, 75, "SOFT SKILLS", 3);
    simpleText(-10, 0.01, 75, "HOBBIES", 3);
    simpleText(-35, 0.01, 55, "PROJECTS", 3);
    simpleText(-28, 0.01, 0, "Dashboard Projects", 3);
    simpleText(-26, 0.01, 5, "(click on billboard to visit the site)", 3);
    simpleText(75, 0.01, -115, "PROJECTS", 3);
    simpleText(50, 0.01, 20, "TIMELINE", 3);

    wallOfBricks();
    createTriangle(63, -55);
    createTriangle(63, -51);
    createTriangle(63, -47);
    createTriangle(63, -43);

    setupEventHandlers();
    renderFrame();
  }

  if (WEBGL.isWebGLAvailable()) {
    start();
  } else {
    noWebGL();
  }
});
