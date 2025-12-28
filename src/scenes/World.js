import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Octree } from "three/addons/math/Octree.js";
import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";
import * as THREE from "three";

const worldOctree = new Octree();

export function loadWorld(scene) {
  const loader = new GLTFLoader().setPath("./models/");
  loader.load("collision-world.glb", (gltf) => {
    scene.add(gltf.scene);

    // Optymalizacja i cienie
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material.map) child.material.map.anisotropy = 8;
      }
    });

    // Budowanie fizyki
    worldOctree.fromGraphNode(gltf.scene);

    // Helper (widoczny tylko gdy debugujemy)
    const helper = new OctreeHelper(worldOctree);
    helper.visible = false;
    scene.add(helper);
  });

  const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5);
  fillLight1.position.set(2, 1, 1);
  scene.add(fillLight1);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
  directionalLight.position.set(-5, 25, -1);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.near = 0.01;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.right = 30;
  directionalLight.shadow.camera.left = -30;
  directionalLight.shadow.camera.top = 30;
  directionalLight.shadow.camera.bottom = -30;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.radius = 4;
  directionalLight.shadow.bias = -0.00006;
  scene.add(directionalLight);

  scene.background = new THREE.Color(0x88ccee);
}
