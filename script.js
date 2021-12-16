console.clear();
gsap.registerPlugin(ScrollTrigger);

// --- CONSTS

const COLORS = {
  background: "white",
  light: "#ffffff",
  sky: "#aaaaff",
  ground: "#e2e2e2",
  blue: "steelblue",
};

const PI = Math.PI;

const wireframeMaterial = new THREE.MeshBasicMaterial({
  color: "white",
  wireframe: true,
});

// --- SCENE
 
const scenes = {
  real: new THREE.Scene(),
  wire: new THREE.Scene(),
};
scenes.wire.overrideMaterial = wireframeMaterial;

let size = { width: 0, height: 0 };

scenes.real.background = new THREE.Color(COLORS.background);
scenes.real.fog = new THREE.Fog(COLORS.background, 15, 20);
scenes.wire.background = new THREE.Color(COLORS.blue);

const views = [
  { height: 1, bottom: 0, scene: scenes.real, camera: null },
  { height: 0, bottom: 0, scene: scenes.wire, camera: null },
];

// --- RENDERER

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});

renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const container = document.querySelector(".canvas-container");
container.appendChild(renderer.domElement);

// --- CAMERA

let cameraTarget = new THREE.Vector3(0, 1, 0);
views.forEach((view) => {
  view.camera = new THREE.PerspectiveCamera(
    40,
    size.width / size.height,
    0.1,
    100
  );
  view.camera.position.set(0, 1, 5);

  view.scene.add(view.camera);
});

// --- LIGHTS

const directionalLight = new THREE.DirectionalLight(COLORS.light, 2);
directionalLight.castShadow = true;
directionalLight.shadow.camera.far = 10;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.normalBias = 0.05;
directionalLight.position.set(2, 5, 3);

scenes.real.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(
  COLORS.sky,
  COLORS.ground,
  0.5
);
scenes.real.add(hemisphereLight);

// --- FLOOR

const plane = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ color: COLORS.ground });
const floor = new THREE.Mesh(plane, floorMaterial);
floor.receiveShadow = true;
floor.rotateX(-Math.PI * 0.5);

scenes.real.add(floor);

// --- ON RESIZE

const onResize = () => {
  size.width = container.clientWidth;
  size.height = container.clientHeight;

  views.forEach((view) => {
    view.camera.aspect = size.width / size.height;
    view.camera.updateProjectionMatrix();
  });

  renderer.setSize(size.width, size.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
};

window.addEventListener("resize", onResize);
onResize();

// --- TICK

const points = [];

const clamp = (min, value, max) => Math.max(Math.min(max, value), min);

const updatePoints = () => {
  points.forEach((point) => {
    const screenPosition = point.mesh.position.clone();
    screenPosition.setFromMatrixPosition(point.mesh.matrixWorld);
    screenPosition.project(views[0].camera);

    // const translateX = clamp(0, screenPosition.x + 0.5, 1)
    // const translateY = clamp(0, -screenPosition.y + 0.5, 1)

    const translateX = clamp(-50, screenPosition.x * 100 * 0.5, 50);
    const translateY = clamp(-50, -screenPosition.y * 100 * 0.5, 50);

    point.node.style.setProperty("--x", translateX);
    point.node.style.setProperty("--y", translateY);
  });
};

const tick = () => {
  views.forEach((view) => {
    view.camera.lookAt(cameraTarget);
    let bottom = size.height * view.bottom;
    let height = size.height * view.height;
    renderer.setViewport(0, 0, size.width, size.height);
    renderer.setScissor(0, bottom, size.width, height);
    renderer.setScissorTest(true);
    renderer.render(view.scene, view.camera);
  });
  updatePoints();
  window.requestAnimationFrame(() => tick());
};

tick();

const models = {};
const clones = {};
let cameras = null;
let rockets = null;
let trees = null;

const hideLoading = () => {
  document.body.classList.add("ready");
  gsap.to(".loading", { y: "-150%", ease: "power4.in", duration: 0.4 });
};

const setupAnimation = () => {
  hideLoading();

  console.log(models);
  models.rocket.position.x = 5;
  models.tree.position.x = -5;
  ScrollTrigger.matchMedia({
    "(prefers-reduced-motion: no-preference)": desktopAnimation,
  });
};

const desktopAnimation = () => {
  let section = 1;
  const tl = gsap.timeline({
    default: {
      duration: 1,
      ease: "power2.inOut",
    },
    scrollTrigger: {
      trigger: ".page",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.1,
      // markers: true,
    },
  });

  tl.to(models.rocket.position, { x: 1 }, section);
  tl.to(models.tree.position, { x: -1 }, section);

  // section 2
  section++;
  tl.to(models.rocket.position, { z: 2 }, section);
  tl.to(models.tree.position, { x: -5, ease: "power4.in" }, section);
  // tl.to(views[1], { height: 1, ease: "none" }, section);

  // section 3
  section++;
  tl.to(models.rocket.position, { z: -1, y: 4 }, section);
  tl.to(models.tree.position, { x: -5, ease: "power4.in" }, section);
  // tl.to(views[1], { height: 1, ease: "none" }, section);

};

const loadManager = new THREE.LoadingManager(() => {
  setupAnimation();
});

const gltfLoader = new THREE.GLTFLoader(loadManager);

const toLoad = [
  {
    group: new THREE.Group(),
    name: "tree",
    file: "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/tree-lime/model.gltf",
  },
  {
    group: new THREE.Group(),
    name: "rocket",
    file: "falcon.glb",
  },
];

toLoad.forEach(({ file, name, group }) => {
  gltfLoader.load(file, (model) => {
    model.scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    model.scene.scale.set(0.01, 0.01, 0.01);
    if (name === "rocket") {
      model.scene.scale.set(0.2, 0.2, 0.2);
      model.scene.position.set(0, 1, 0);
    }
    model.scene.rotateY(PI * 0.5);

    group.add(model.scene);
    scenes.real.add(group);

    models[name] = group;
    let clone = group.clone();
    // clones.wire.add( = clone)
  });
});
