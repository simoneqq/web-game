import * as BABYLON from "babylonjs";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
  const scene = new BABYLON.Scene(engine);

  const assumedFramesPerSecond = 60;
  const earthGravity = -9.81;
  scene.gravity = new BABYLON.Vector3(
    0,
    earthGravity / assumedFramesPerSecond,
    0
  );
  scene.collisionsEnabled = true;

  const camera = new BABYLON.UniversalCamera(
    "universalCamera",
    new BABYLON.Vector3(0, 4, 0),
    scene
  );

  camera.attachControl(canvas, true);
  camera.setTarget(new BABYLON.Vector3(3, 3, 3));

  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
  
  camera.keysUp = [87];
  camera.keysDown = [83];
  camera.keysLeft = [65];
  camera.keysRight = [68];

  camera.fov = 1.5;
  camera.inertia = 0.5;
  camera.speed = 1;
  camera.angularSensibility = 500;

  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );

  light.intensity = 0.7;

  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 100, height: 100 },
    scene
  );

  ground.checkCollisions = true;

  const box = BABYLON.MeshBuilder.CreateBox(
    "box",
    { width: 2, height: 2, depth: 2 },
    scene
  );

  box.position.y = 1;

  const boxMat = new BABYLON.StandardMaterial("boxMat");
  boxMat.diffuseTexture = new BABYLON.Texture("../pobrane (3).jpg");
  box.material = boxMat;

  box.checkCollisions = true;

  return scene;
};

const scene = createScene();

engine.runRenderLoop(function () {
  scene.render();
});

window.addEventListener("resize", function () {
  engine.resize();
});
