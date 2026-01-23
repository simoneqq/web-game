import * as THREE from "three";

export class RemotePlayer {
  constructor(scene, initialData) {
    this.id = initialData.id;
    
    // Tworzymy model reprezentujący innego gracza (Kapsuła jak collider)
    const geometry = new THREE.CapsuleGeometry(0.35, 1.25, 4, 8);
    const material = new THREE.MeshStandardMaterial({ 
      color: initialData.color || "#ff0000" // jak bebok nie da koloru to jest czerwony
    });
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Ustawienie początkowej pozycji
    this.mesh.position.set(initialData.x, initialData.y, initialData.z);
    
    // Dodanie do sceny
    scene.add(this.mesh);
  }

  update(data) {
    // Interpolacja pozycji (płynniejsze przesuwanie)
    this.mesh.position.lerp(new THREE.Vector3(data.x, data.y, data.z), 0.3);
    
    // Obrót (tylko w osi Y - lewo/prawo)
    this.mesh.rotation.y = data.rotation;
    
    // Aktualizacja koloru jeśli się zmienił
    if (data.color) {
      this.mesh.material.color.set(data.color);
    }
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}