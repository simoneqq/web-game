import * as THREE from "three";

export class RemotePlayer {
  constructor(scene, initialData) {
    this.id = initialData.id;
    this.nick = initialData.nick || "Player";

    this.visualOffset = new THREE.Vector3(0, 0.5, 0);

    // model reprezentujący innego gracza (Kapsuła jak collider)
    const geometry = new THREE.CapsuleGeometry(0.35, 1.25, 4, 8);
    const material = new THREE.MeshStandardMaterial({
      color: initialData.color || "#ff0000", // jak bebok nie da koloru to jest czerwony
    });
    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Ustawienie początkowej pozycji
    const startPos = new THREE.Vector3(
      initialData.x,
      initialData.y,
      initialData.z,
    ).add(this.visualOffset);

    this.mesh.position.copy(startPos);

    // zmienne do interpolacji (larpingu)
    this.targetPosition = this.mesh.position.clone();
    this.targetRotation = initialData.rotation || 0;
    // Dodanie do sceny
    scene.add(this.mesh);
  }

  // Ta metoda jest wywoływana przez Socket.io (np. 20 razy na sek)
  updateData(data) {
    // Zapisujemy CEL, a nie przesuwamy od razu
    this.targetPosition.set(data.x, data.y, data.z).add(this.visualOffset);
    this.targetRotation = data.rotation;

    if (data.color) {
      this.mesh.material.color.set(data.color);
    }

    // Aktualizacja nicku jeśli się zmienił
    if (data.nick) {
      this.nick = data.nick;
    }
  }

  teleport(x, y, z) {
    // 1. Ustaw cel (target)
    this.targetPosition.set(x, y, z).add(this.visualOffset);
    
    // 2. Natychmiast ustaw pozycję mesha (pomija lerp)
    this.mesh.position.copy(this.targetPosition);
    
    // 3. Upewnij się, że mesh jest widoczny
    this.mesh.visible = true;
}

  animate(dt) {
    // Interpolacja pozycji (płynniejsze przesuwanie)
    this.mesh.position.lerp(this.targetPosition, 10 * dt);

    // Obrót (tylko w osi Y - lewo/prawo)
    let diff = this.targetRotation - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    this.mesh.rotation.y += diff * 10 * dt;
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
