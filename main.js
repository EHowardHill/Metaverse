import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// -- SCENE & CAMERA SETUP ----------------------------------------------
const scene = new THREE.Scene();

// Optional: Add some ambient light so the scene isn't completely dark.
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// -- RENDERER SETUP ----------------------------------------------------
const renderer = new THREE.WebGLRenderer({
    antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// -- SKYBOX (Equirectangular texture) -----------------------------------
{
    const textureLoader = new THREE.TextureLoader();
    // Load sky texture (equirectangular projection)
    const skyTexture = textureLoader.load('/sky.png');

    // Create a large sphere geometry for the sky
    const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
    // Invert the geometry on the x-axis so the inside is rendered
    skyGeometry.scale(-1, 1, 1);

    // Create material with the loaded texture
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: skyTexture,
    });

    const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skyMesh);
}

// -- INFINITE PLANE ----------------------------------------------------
{
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load('/grass.jpg');
    // Repeat the texture so it looks more “tiled”
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(500, 500); // adjust for desired tiling

    const planeGeometry = new THREE.PlaneGeometry(10000, 10000);
    const planeMaterial = new THREE.MeshBasicMaterial({ map: grassTexture });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);

    // Rotate the plane so it's horizontal
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);
}

// Position the camera slightly above the ground
camera.position.y = 2;
camera.position.z = 0;

// -- POINTER LOCK CONTROLS ---------------------------------------------
const controls = new PointerLockControls(camera, renderer.domElement);

// “Lock” the pointer on user click
document.addEventListener('click', () => {
    controls.lock();
});

// Add the controls to the scene
scene.add(controls.object);

// -- MOVEMENT CONTROL --------------------------------------------------
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isSprinting = false;
let canJump = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const speed = 50.0;      // base walking speed
const sprintMultiplier = 2.0;  
const gravity = 30.0;    // downward acceleration
const jumpVelocity = 12; // how strong the jump is

// Keyboard events
function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = true;
            break;
        case 'KeyS':
            moveBackward = true;
            break;
        case 'KeyA':
            moveLeft = true;
            break;
        case 'KeyD':
            moveRight = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = true;
            break;
        case 'Space':
            if (canJump) {
                velocity.y = jumpVelocity;
                canJump = false;
            }
            break;
        default:
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = false;
            break;
        case 'KeyS':
            moveBackward = false;
            break;
        case 'KeyA':
            moveLeft = false;
            break;
        case 'KeyD':
            moveRight = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = false;
            break;
        default:
            break;
    }
}

document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

// -- ANIMATION LOOP ----------------------------------------------------
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (controls.isLocked === true) {
        // Decrease velocity over time (simple friction) on the X/Z plane
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        // Apply gravity each frame
        velocity.y -= gravity * delta;

        // Determine current speed (walk vs sprint)
        const currentSpeed = isSprinting ? speed * sprintMultiplier : speed;

        // Calculate movement direction from WASD
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // ensures consistent movement diagonally

        // Apply acceleration
        if (moveForward || moveBackward) {
            velocity.z -= direction.z * currentSpeed * delta;
        }
        if (moveLeft || moveRight) {
            velocity.x -= direction.x * currentSpeed * delta;
        }

        // Move horizontally using PointerLockControls
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // Manually adjust the vertical position (y) for jump/gravity
        controls.object.position.y += velocity.y * delta;

        // Simple collision with “ground”: clamp at y=2
        if (controls.object.position.y < 2) {
            velocity.y = 0;
            controls.object.position.y = 2;
            canJump = true; // we are on the ground, so we can jump again
        }
    }

    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation loop
animate();

// -- HANDLE RESIZE EVENTS ---------------------------------------------
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
});
