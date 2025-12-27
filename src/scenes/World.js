import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Octree } from "three/addons/math/Octree.js";
import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";
import * as THREE from "three";

const worldOctree = new Octree();

export function loadWorld(scene) {
  const loader = new GLTFLoader().setPath("./models/");
  // Przykład użycia w Game.js lub MainScene.js
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

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);
}
