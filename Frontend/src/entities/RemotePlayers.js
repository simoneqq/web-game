import * as THREE from "three";

export class RemotePlayer {
  constructor(scene, initialData) {
    this.id = initialData.id;
    
    // Tworzymy model reprezentujący innego gracza (Kapsuła jak collider)
    const geometry = new THREE.CapsuleGeometry(0.35, 1.25, 4, 8); // Promień 0.35, wysokość cylindra ~1.25
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Czerwony gracz
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Ustawienie początkowej pozycji
    this.mesh.position.set(initialData.x, initialData.y, initialData.z);
    
    // Dodanie do sceny
    scene.add(this.mesh);
  }

  update(data) {
    // Interpolacja pozycji (płynniejsze przesuwanie)
    // Jeśli chcesz super prosto, użyj: this.mesh.position.set(data.x, data.y, data.z);
    
    this.mesh.position.lerp(new THREE.Vector3(data.x, data.y, data.z), 0.3);
    
    // Obrót (tylko w osi Y - lewo/prawo)
    this.mesh.rotation.y = data.rotation;
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}