import * as THREE from "three"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

// set +Z as up axis everywhere
THREE.Object3D.DEFAULT_UP.set(0, 0, 1)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 5, 10000)
camera.position.set(1500, -500, 700)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(1500, 1500, 0)
controls.update()

const light = new THREE.AmbientLight(1.0)
scene.add(light)

const directionalLight = new THREE.DirectionalLight(0xddd5cc, 1.0)
scene.add(directionalLight)

const objLoader = new OBJLoader()
objLoader.load("./andalsnes-terrain.obj", (object) => {
  scene.add(object)
  renderer.render(scene, camera)
})

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.render(scene, camera)
})

controls.addEventListener("change", () => {
  renderer.render(scene, camera)
})
