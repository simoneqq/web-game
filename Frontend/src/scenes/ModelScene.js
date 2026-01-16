import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";
import { worldOctree } from "../core/Physics.js";
import * as THREE from "three";

export function loadWorld(scene) {
  const loader = new GLTFLoader().setPath("./models/");

  loader.load("collision-world.glb", (gltf) => {
    scene.add(gltf.scene);

    worldOctree.fromGraphNode(gltf.scene);

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material.map) {
          child.material.map.anisotropy = 4;
        }
      }
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(-5, 10, -5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const helper = new OctreeHelper(worldOctree);
    helper.visible = false;
    scene.add(helper);
  });
}
