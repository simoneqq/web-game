import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { worldOctree } from "./Physics.js";
import { GRAVITY } from "./Physics.js";
import { PLAYER_COLOR } from "../utils/Consts.js";

const NUM_SPHERES = 30; // Maksymalna liczba pocisków i plam, żeby uniknąć lagów
const SPEED = 60; // Prędkość lotu pocisku

export class ProjectileSystem {
  constructor(scene) {
    this.scene = scene;
    this.spheres = [];
    this.decals = []; // Tablica na plamy
    this.particles = []; // Tablica na cząsteczki wybuchu

    const loader = new THREE.TextureLoader();
    this.splatTexture = loader.load("../textures/splat.png");

    // Materiały
    this.decalMaterial = new THREE.MeshPhongMaterial({
      map: this.splatTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });

    // Pula pocisków
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);

    for (let i = 0; i < NUM_SPHERES; i++) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
      mesh.castShadow = true;
      mesh.position.set(0, -100, 0);
      scene.add(mesh);

      this.spheres.push({
        mesh: mesh,
        collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), 0.15),
        velocity: new THREE.Vector3(),
        active: false,
        color: new THREE.Color(),
      });
    }

    // Raycaster do precyzyjnego umieszczania plam
    this.raycaster = new THREE.Raycaster();
  }

  shoot(camera) {
    const sphere = this.spheres.find((s) => !s.active);
    if (!sphere) return;

    sphere.active = true;
    sphere.mesh.visible = true;

    sphere.mesh.material.color.copy(PLAYER_COLOR);
    sphere.color.copy(PLAYER_COLOR);

    // Pozycja startowa
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    sphere.collider.center
      .copy(camera.position)
      .addScaledVector(direction, 1.0);
    sphere.mesh.position.copy(sphere.collider.center);

    sphere.velocity.copy(direction).multiplyScalar(SPEED);
  }

  spawnRemoteProjectile(data) {
    const sphere = this.spheres.find((s) => !s.active);
    if (!sphere) return;

    sphere.active = true;
    sphere.mesh.visible = true;

    if (data.color) {
      sphere.color.set(data.color);
      sphere.mesh.material.color.copy(sphere.color);
    }

    sphere.collider.center.set(data.pos.x, data.pos.y, data.pos.z);
    sphere.mesh.position.copy(sphere.collider.center);

    sphere.velocity.set(data.dir.x, data.dir.y, data.dir.z).multiplyScalar(SPEED);
  }

  createSplat(position, normal, color, hitObject) {
    // 1. Orientacja plamy (musi "patrzeć" w stronę normalnej ściany)
    const orientation = new THREE.Euler();
    const dummy = new THREE.Object3D();
    dummy.position.copy(position);
    dummy.lookAt(position.clone().add(normal));
    orientation.copy(dummy.rotation);

    // 2. Losowy rozmiar i rotacja
    const size = 0.5 + Math.random() * 0.5;
    orientation.z = Math.random() * Math.PI * 2;

    // 3. Geometria Decal
    if (!hitObject) return;

    const geometry = new DecalGeometry(
      hitObject,
      position,
      orientation,
      new THREE.Vector3(size, size, size)
    );

    // 4. Materiał (klonujemy, żeby ustawić kolor)
    const material = this.decalMaterial.clone();
    material.color.copy(color);

    const m = new THREE.Mesh(geometry, material);
    this.scene.add(m);

    // Usuwanie staruch plam
    this.decals.push(m);
    if (this.decals.length > 50) {
      const old = this.decals.shift();
      this.scene.remove(old);
      old.geometry.dispose();
      old.material.dispose();
    }
  }

  createExplosion(position, normal) {
    // Prosty efekt cząsteczkowy - 8 małych kostek
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      const mat = new THREE.MeshBasicMaterial({ color: PLAYER_COLOR });
      const p = new THREE.Mesh(geo, mat);

      p.position.copy(position);

      // Losowa prędkość w stronę odbicia
      const vel = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      )
        .normalize()
        .multiplyScalar(2)
        .add(normal.multiplyScalar(2));

      this.scene.add(p);
      this.particles.push({ mesh: p, velocity: vel, life: 1.0 });
    }
  }

  update(dt) {
    const subSteps = 5; // ilość sprawdzania kolizji na jedną klatkę (przy mniejszych liczbach pociski czasami przelatują przez obiekty)
    const subDt = dt / subSteps;

    for (const sphere of this.spheres) {
      if (!sphere.active) continue;

      // Wykonujemy małe kroki wewnątrz jednej klatki
      for (let i = 0; i < subSteps; i++) {
        const prevPos = sphere.collider.center.clone();

        // 1. Fizyka
        sphere.velocity.y -= GRAVITY * subDt;
        sphere.collider.center.addScaledVector(sphere.velocity, subDt);

        // 2. Kolizja
        const collision = worldOctree.sphereIntersect(sphere.collider);

        if (collision) {
          const direction = sphere.velocity.clone().normalize();
          this.raycaster.set(prevPos, direction);

          // Szukanie kolizji w scenie
          const hits = this.raycaster.intersectObjects(
            this.scene.children,
            true
          );
          const hit = hits.find(
            (h) => h.object.isMesh && !h.object.geometry.isDecalGeometry
          );

          if (hit) {
            this.createSplat(
              hit.point,
              hit.face.normal,
              sphere.color,
              hit.object
            );
            this.createExplosion(hit.point, hit.face.normal);
          }

          this.resetSphere(sphere);
          break;
        }
      }

      sphere.mesh.position.copy(sphere.collider.center);

      if (sphere.collider.center.y < -20) this.resetSphere(sphere);
    }

    // 2. Aktualizacja Cząsteczek (Wybuchu)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * 2; // Cząsteczka żyje 0.5 sekundy

      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 10 * dt; // Grawitacja cząsteczek

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  resetSphere(sphere) {
    sphere.active = false;
    sphere.mesh.visible = false;
    sphere.mesh.position.set(0, -100, 0);
    sphere.collider.center.set(0, -100, 0);
    sphere.velocity.set(0, 0, 0);
  }
}
