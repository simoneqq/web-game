import * as THREE from "three";

export const obstacleColliders = [];
export const mapSize = 20;

export function initWorld(scene) {
    scene.background = new THREE.Color(0x87ceeb);

    const light = new THREE.HemisphereLight(0xeeeeff, 0x444422, 1.2);
    scene.add(light);

    const floorGeo = new THREE.PlaneGeometry(mapSize, mapSize);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x33aa33 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

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