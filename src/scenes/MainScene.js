import * as THREE from "three";
import { worldData } from "./data/MainSceneData";
import { worldOctree } from "../core/Physics";
import { materials} from "./data/Materials"

export const mapSize = 100;

export function initWorld(scene) {
    scene.background = new THREE.Color(0x87ceeb);

    const group = new THREE.Group();

    // 1. Generowanie podłogi
    const floorGeo = new THREE.BoxGeometry(worldData.floor.size, 1, worldData.floor.size);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x33aa33 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.5 + worldData.floor.y; //Centrowanie, żeby wierzch podłogi był na Y=0
    floor.receiveShadow = true;
    group.add(floor);

    // 2. Generowanie boxów
    worldData.boxes.forEach(data => {
        const geometry = new THREE.BoxGeometry(data.w, data.h, data.d);
        const material = materials[data.id] || materials.default;

        const box = new THREE.Mesh(geometry, material);
        box.position.set(data.x, data.y + (data.h / 2), data.z); // Pozycjonujemy względem podstawy
        box.castShadow = true;
        box.receiveShadow = true;
        group.add(box);
    });
    
    scene.add(group);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(-5, 10, -5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    worldOctree.fromGraphNode(group);
}