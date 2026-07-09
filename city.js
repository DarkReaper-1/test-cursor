import * as THREE from "three";

const WORLD_SIZE = 380;
const BLOCK_PITCH = 38;
const ROAD_WIDTH = 10;
const LOT_SIZE = BLOCK_PITCH - ROAD_WIDTH;
const BLOCK_RADIUS = 4;

/**
 * Small deterministic random generator. Reusing a seed produces the same city,
 * which is useful for debugging traversal routes and collision edge cases.
 */
class SeededRandom {
  constructor(seed = 731927) {
    this.state = seed >>> 0;
  }

  next() {
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    return (this.state >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  integer(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
}

/**
 * Procedurally builds Neon Harbor from instanced geometry.
 *
 * Physics uses lightweight AABB records rather than the render meshes. This
 * keeps collision predictable while allowing the renderer to batch hundreds
 * of buildings and thousands of windows into a handful of draw calls.
 */
export class City {
  constructor(scene, seed = 731927) {
    this.scene = scene;
    this.random = new SeededRandom(seed);
    this.worldSize = WORLD_SIZE;
    this.buildings = [];
    this.colliders = [];
    this.roofObstacles = [];
    this.buildingMeshes = [];
    this.windowMaterial = null;
    this.streetLightMaterial = null;
    this.spawnBuilding = null;
    this.decorations = new THREE.Group();
    this.decorations.name = "City decorations";
    this.scene.add(this.decorations);

    this.#generate();
  }

  #generate() {
    this.#createGroundAndRoads();
    this.#planBuildings();
    this.#createBuildingInstances();
    this.#createWindows();
    this.#createRooftopObstacles();
    this.#createStreetFurniture();
    this.#chooseSpawn();
  }

  #createGroundAndRoads() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
      new THREE.MeshStandardMaterial({
        color: 0x071017,
        roughness: 0.96,
        metalness: 0.02,
      }),
    );
    ground.name = "Street ground";
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Raised sidewalk slabs clearly define blocks and provide a subtle curb.
    const blockCount = (BLOCK_RADIUS * 2 + 1) ** 2;
    const sidewalk = new THREE.InstancedMesh(
      new THREE.BoxGeometry(LOT_SIZE, 0.28, LOT_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x1a252a, roughness: 0.92 }),
      blockCount,
    );
    sidewalk.name = "Instanced sidewalks";
    sidewalk.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    let instance = 0;
    for (let x = -BLOCK_RADIUS; x <= BLOCK_RADIUS; x += 1) {
      for (let z = -BLOCK_RADIUS; z <= BLOCK_RADIUS; z += 1) {
        matrix.makeTranslation(x * BLOCK_PITCH, 0.14, z * BLOCK_PITCH);
        sidewalk.setMatrixAt(instance, matrix);
        instance += 1;
      }
    }
    sidewalk.instanceMatrix.needsUpdate = true;
    this.scene.add(sidewalk);

    // Dashed lane markers are another single draw call.
    const markers = [];
    for (let block = -BLOCK_RADIUS; block <= BLOCK_RADIUS; block += 1) {
      const road = (block + 0.5) * BLOCK_PITCH;
      for (let offset = -WORLD_SIZE / 2 + 5; offset < WORLD_SIZE / 2; offset += 9) {
        markers.push({ x: road, z: offset, rotation: 0 });
        markers.push({ x: offset, z: road, rotation: Math.PI / 2 });
      }
    }
    const markerMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.13, 3.8),
      new THREE.MeshBasicMaterial({ color: 0xc4a44f, toneMapped: false }),
      markers.length,
    );
    markerMesh.name = "Road lane markers";
    const dummy = new THREE.Object3D();
    markers.forEach((marker, index) => {
      dummy.position.set(marker.x, 0.012, marker.z);
      dummy.rotation.set(-Math.PI / 2, 0, marker.rotation);
      dummy.updateMatrix();
      markerMesh.setMatrixAt(index, dummy.matrix);
    });
    markerMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(markerMesh);
  }

  #planBuildings() {
    let id = 0;
    for (let gridX = -BLOCK_RADIUS; gridX <= BLOCK_RADIUS; gridX += 1) {
      for (let gridZ = -BLOCK_RADIUS; gridZ <= BLOCK_RADIUS; gridZ += 1) {
        const centerX = gridX * BLOCK_PITCH;
        const centerZ = gridZ * BLOCK_PITCH;
        const density = 1 - Math.min(1, Math.hypot(gridX, gridZ) / 7);
        const split = this.random.next();
        const alley = this.random.range(2.4, 4.2);
        const margin = this.random.range(1.3, 2.2);
        const usable = LOT_SIZE - margin * 2;

        if (split < 0.38) {
          // One broad tower leaves a perimeter route around the rooftop.
          this.#addBuilding({
            id: id++,
            x: centerX,
            z: centerZ,
            width: usable,
            depth: usable,
            density,
          });
        } else if (split < 0.7) {
          // Two towers with a north/south alley.
          const depth = (usable - alley) / 2;
          for (const side of [-1, 1]) {
            this.#addBuilding({
              id: id++,
              x: centerX,
              z: centerZ + side * (depth + alley) / 2,
              width: usable,
              depth,
              density,
            });
          }
        } else {
          // Two towers with an east/west alley.
          const width = (usable - alley) / 2;
          for (const side of [-1, 1]) {
            this.#addBuilding({
              id: id++,
              x: centerX + side * (width + alley) / 2,
              z: centerZ,
              width,
              depth: usable,
              density,
            });
          }
        }
      }
    }
  }

  #addBuilding({ id, x, z, width, depth, density }) {
    const edgeVariation = this.random.range(-3, 5);
    const height = THREE.MathUtils.clamp(
      this.random.range(10, 29) + density * this.random.range(8, 34) + edgeVariation,
      9,
      62,
    );
    const building = {
      id,
      x,
      z,
      width,
      depth,
      height,
      style: this.random.integer(0, 3),
      min: new THREE.Vector3(x - width / 2, 0.28, z - depth / 2),
      max: new THREE.Vector3(x + width / 2, height + 0.28, z + depth / 2),
    };
    this.buildings.push(building);
    this.colliders.push({
      id: `building-${id}`,
      type: "building",
      min: building.min.clone(),
      max: building.max.clone(),
      building,
    });
  }

  #createBuildingInstances() {
    const palettes = [
      { color: 0x17262d, metalness: 0.2 },
      { color: 0x222a34, metalness: 0.12 },
      { color: 0x292329, metalness: 0.25 },
      { color: 0x132b2c, metalness: 0.18 },
    ];
    const dummy = new THREE.Object3D();

    palettes.forEach((palette, style) => {
      const list = this.buildings.filter((building) => building.style === style);
      const material = new THREE.MeshStandardMaterial({
        color: palette.color,
        roughness: 0.74,
        metalness: palette.metalness,
      });
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
      mesh.name = `Buildings style ${style}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.buildingIndices = [];

      list.forEach((building, index) => {
        dummy.position.set(building.x, building.height / 2 + 0.28, building.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(building.width, building.height, building.depth);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        mesh.userData.buildingIndices[index] = building.id;
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.buildingMeshes.push(mesh);
      this.scene.add(mesh);
    });
  }

  #createWindows() {
    const windows = [];
    for (const building of this.buildings) {
      const verticalCount = Math.min(15, Math.floor((building.height - 3) / 3.1));
      const xCount = Math.max(1, Math.floor((building.width - 2) / 2.6));
      const zCount = Math.max(1, Math.floor((building.depth - 2) / 2.6));

      for (let row = 0; row < verticalCount; row += 1) {
        const y = 2.3 + row * 3.05;
        for (let column = 0; column < xCount; column += 1) {
          if (this.random.next() < 0.2) continue;
          const x = building.min.x + 1.35 + column * ((building.width - 2.7) / Math.max(1, xCount - 1));
          windows.push({ x, y, z: building.max.z + 0.012, rotation: 0, lit: this.random.next() });
          windows.push({ x, y, z: building.min.z - 0.012, rotation: Math.PI, lit: this.random.next() });
        }
        for (let column = 0; column < zCount; column += 1) {
          if (this.random.next() < 0.36) continue;
          const z = building.min.z + 1.35 + column * ((building.depth - 2.7) / Math.max(1, zCount - 1));
          windows.push({ x: building.max.x + 0.012, y, z, rotation: Math.PI / 2, lit: this.random.next() });
          windows.push({ x: building.min.x - 0.012, y, z, rotation: -Math.PI / 2, lit: this.random.next() });
        }
      }
    }

    this.windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xb9d8d2,
      emissive: 0xffbb66,
      emissiveIntensity: 1.6,
      roughness: 0.35,
      metalness: 0.1,
    });
    const windowMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.92, 1.18),
      this.windowMaterial,
      windows.length,
    );
    windowMesh.name = "Instanced building windows";
    const dummy = new THREE.Object3D();
    const bright = new THREE.Color(0xffc86b);
    const dark = new THREE.Color(0x193034);
    windows.forEach((window, index) => {
      dummy.position.set(window.x, window.y, window.z);
      dummy.rotation.set(0, window.rotation, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      windowMesh.setMatrixAt(index, dummy.matrix);
      windowMesh.setColorAt(index, window.lit > 0.42 ? bright : dark);
    });
    windowMesh.instanceMatrix.needsUpdate = true;
    if (windowMesh.instanceColor) windowMesh.instanceColor.needsUpdate = true;
    this.scene.add(windowMesh);
  }

  #createRooftopObstacles() {
    const obstacles = [];
    for (const building of this.buildings) {
      if (building.width < 8 || building.depth < 8 || this.random.next() < 0.28) continue;
      const count = this.random.next() > 0.78 ? 2 : 1;
      for (let index = 0; index < count; index += 1) {
        const width = this.random.range(1.5, 3.3);
        const depth = this.random.range(1.4, 3);
        const height = this.random.range(0.75, 1.35);
        const x = this.random.range(building.min.x + width, building.max.x - width);
        const z = this.random.range(building.min.z + depth, building.max.z - depth);
        const y = building.max.y;
        const obstacle = {
          id: `roof-${building.id}-${index}`,
          type: "obstacle",
          min: new THREE.Vector3(x - width / 2, y, z - depth / 2),
          max: new THREE.Vector3(x + width / 2, y + height, z + depth / 2),
          building,
        };
        obstacles.push({ x, y, z, width, depth, height });
        this.roofObstacles.push(obstacle);
        this.colliders.push(obstacle);
      }
    }

    const obstacleMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x39484b,
        roughness: 0.62,
        metalness: 0.55,
      }),
      obstacles.length,
    );
    obstacleMesh.name = "Rooftop parkour obstacles";
    obstacleMesh.castShadow = true;
    obstacleMesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    obstacles.forEach((obstacle, index) => {
      dummy.position.set(obstacle.x, obstacle.y + obstacle.height / 2, obstacle.z);
      dummy.scale.set(obstacle.width, obstacle.height, obstacle.depth);
      dummy.updateMatrix();
      obstacleMesh.setMatrixAt(index, dummy.matrix);
    });
    obstacleMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(obstacleMesh);
  }

  #createStreetFurniture() {
    const lamps = [];
    for (let block = -BLOCK_RADIUS; block <= BLOCK_RADIUS; block += 1) {
      for (let offset = -BLOCK_RADIUS; offset <= BLOCK_RADIUS; offset += 1) {
        if ((block + offset) % 2 !== 0) continue;
        lamps.push({
          x: block * BLOCK_PITCH + LOT_SIZE / 2 + 1.3,
          z: offset * BLOCK_PITCH + LOT_SIZE / 2 + 1.3,
        });
      }
    }

    const poles = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.055, 0.09, 3.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x26383c, metalness: 0.8, roughness: 0.35 }),
      lamps.length,
    );
    const bulbs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0xc9fff3,
        emissive: 0x66ffd9,
        emissiveIntensity: 2.5,
      }),
      lamps.length,
    );
    this.streetLightMaterial = bulbs.material;
    poles.name = "Street lamp poles";
    bulbs.name = "Street lamp bulbs";
    const matrix = new THREE.Matrix4();
    lamps.forEach((lamp, index) => {
      matrix.makeTranslation(lamp.x, 1.7, lamp.z);
      poles.setMatrixAt(index, matrix);
      matrix.makeTranslation(lamp.x, 3.38, lamp.z);
      bulbs.setMatrixAt(index, matrix);
    });
    poles.instanceMatrix.needsUpdate = true;
    bulbs.instanceMatrix.needsUpdate = true;
    this.decorations.add(poles, bulbs);
  }

  #chooseSpawn() {
    const candidates = this.buildings.filter(
      (building) => Math.hypot(building.x, building.z) < 34 && building.height > 18,
    );
    candidates.sort((a, b) => Math.abs(a.height - 27) - Math.abs(b.height - 27));
    this.spawnBuilding = candidates[0] ?? this.buildings[0];
  }

  /**
   * Return only nearby physics boxes. The city is modest enough for a linear
   * filter, while the bounds check avoids expensive collision math.
   */
  getNearbyColliders(position, radius = 4) {
    return this.colliders.filter(
      (collider) =>
        position.x + radius >= collider.min.x &&
        position.x - radius <= collider.max.x &&
        position.z + radius >= collider.min.z &&
        position.z - radius <= collider.max.z &&
        position.y < collider.max.y + 3 &&
        position.y + 3 > collider.min.y,
    );
  }

  getSpawnPoint() {
    const building = this.spawnBuilding;
    return new THREE.Vector3(building.x, building.max.y + 0.03, building.z);
  }

  getSurfaceHeightAt(x, z) {
    let height = 0;
    for (const collider of this.colliders) {
      if (
        x >= collider.min.x &&
        x <= collider.max.x &&
        z >= collider.min.z &&
        z <= collider.max.z
      ) {
        height = Math.max(height, collider.max.y);
      }
    }
    return height;
  }

  getRandomRoofPoint(index = 0) {
    // The prime-number stride distributes enemies across the whole map.
    const building = this.buildings[(index * 37 + 11) % this.buildings.length];
    return new THREE.Vector3(building.x, building.max.y + 2.4, building.z);
  }

  /**
   * Raycast only against building facade meshes. Swing and zip systems call
   * this method, so props, enemies, and empty sky can never become anchors.
   */
  raycastBuildings(raycaster, maximumDistance = 95) {
    raycaster.far = maximumDistance;
    const hits = raycaster.intersectObjects(this.buildingMeshes, false);
    if (!hits.length) return null;
    const hit = hits[0];
    const buildingId = hit.object.userData.buildingIndices[hit.instanceId];
    const building = this.buildings.find((item) => item.id === buildingId);
    return {
      point: hit.point.clone(),
      distance: hit.distance,
      normal: hit.face?.normal.clone() ?? new THREE.Vector3(0, 1, 0),
      building,
    };
  }

  /**
   * Fade emissive city details with the sun. NightFactor is zero at midday and
   * one at midnight.
   */
  updateDayNight(nightFactor) {
    if (this.windowMaterial) {
      this.windowMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.08, 2.2, nightFactor);
    }
    if (this.streetLightMaterial) {
      this.streetLightMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.1, 3.1, nightFactor);
    }
  }
}
