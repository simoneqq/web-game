import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

function createTexture(path, repeatX = 1, repeatY = 1) {
    const tex = textureLoader.load(path);
    tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
}

export const materials = {
    grass: new THREE.MeshStandardMaterial({ 
        map: createTexture('./textures/kirk1.jpg', 10, 10) 
    }),
    brick: new THREE.MeshStandardMaterial({ 
        map: createTexture('./textures/kirk2.jpg') 
    }),
    wood: new THREE.MeshStandardMaterial({ 
        map: createTexture('./textures/kirk3.jpg') 
    }),
    stone: new THREE.MeshStandardMaterial({ 
        map: createTexture('./textures/kirk4.jpg') 
    }),

    default: new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 0.8 
    })
};