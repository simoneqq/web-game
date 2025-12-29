import * as THREE from "three";
import { worldData } from "./data/MainSceneData";
import { worldOctree } from "../core/Physics";
import { materials} from "./data/Materials"

export const obstacleColliders = [];
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


    // Stare generowanie (można usunąć)
    const loader = new THREE.TextureLoader();
    const createCube = (x, z, y, texPath) => {
        const tex = loader.load(texPath, undefined, undefined, () => console.warn("Brak: " + texPath));
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ map: tex })
        );
        cube.position.set(x, y, z);
        scene.add(cube);
        obstacleColliders.push(new THREE.Box3().setFromObject(cube));
    };

    createCube(3, 3, 0.5, "../textures/kirk1.jpg");
    createCube(-3, -2, 0.5, "../textures/hociak.jpg");
    createCube(-3, -2, 0.5, "../textures/hociak.jpg");
    createCube(-3, -1, 0.5, "../textures/kirk2.jpg");
    createCube(-3, 0, 0.5, "../textures/kirk2.jpg");
    createCube(-2, -1, 0.5, "../textures/kirk2.jpg");
    createCube(-1, -1, 0.5, "../textures/kirk2.jpg");

    createCube(1, 1, 0.5, "../textures/kirk4.jpg");
    createCube(1, 2, 0.5, "../textures/kirk4.jpg");
    createCube(1, 3, 0.5, "../textures/kirk4.jpg");
    createCube(1, 2, 1.5, "../textures/kirk4.jpg");
    createCube(1, 2, 2.5, "../textures/hociak.jpg");
}